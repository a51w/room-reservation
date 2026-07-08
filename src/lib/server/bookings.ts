import {
  FieldValue,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentSnapshot,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Booking } from "@/types";
import { getRoom } from "./rooms";

const bookingsCollection = adminDb.collection("bookings");

export class BookingConflictError extends Error {
  constructor() {
    super("This room is already booked for the selected time.");
    this.name = "BookingConflictError";
  }
}

export class RoomNotFoundError extends Error {
  constructor() {
    super("Room not found");
    this.name = "RoomNotFoundError";
  }
}

function toBooking(doc: QueryDocumentSnapshot | DocumentSnapshot): Booking {
  const data = doc.data()!;
  return {
    id: doc.id,
    roomId: data.roomId,
    roomName: data.roomName,
    title: data.title,
    userId: data.userId,
    userEmail: data.userEmail ?? null,
    startTime: (data.startTime as Timestamp).toDate().toISOString(),
    endTime: (data.endTime as Timestamp).toDate().toISOString(),
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
}

export interface ListBookingsFilter {
  roomId?: string;
  userId?: string;
  from?: Date;
  to?: Date;
}

// Firestore needs a composite index for any query that combines an equality filter with a
// range filter on a different field (or two equality filters plus a range/orderBy) — that
// index has to be deployed ahead of time via the Firebase CLI/console, which isn't available
// in this project's workflow. So we only ever run a plain orderBy query here (always covered
// by Firestore's automatic single-field indexes) and apply every filter in memory instead.
// Fine at this app's scale (one department, moderate booking volume).
export async function listBookings(filter: ListBookingsFilter = {}): Promise<Booking[]> {
  const snapshot = await bookingsCollection.orderBy("startTime").get();
  let bookings = snapshot.docs.map(toBooking);

  if (filter.roomId) {
    bookings = bookings.filter((b) => b.roomId === filter.roomId);
  }
  if (filter.userId) {
    bookings = bookings.filter((b) => b.userId === filter.userId);
  }
  if (filter.from) {
    const fromMs = filter.from.getTime();
    bookings = bookings.filter((b) => new Date(b.endTime).getTime() >= fromMs);
  }
  if (filter.to) {
    const toMs = filter.to.getTime();
    bookings = bookings.filter((b) => new Date(b.startTime).getTime() <= toMs);
  }

  return bookings;
}

export async function getBooking(bookingId: string): Promise<Booking | null> {
  const doc = await bookingsCollection.doc(bookingId).get();
  return doc.exists ? toBooking(doc) : null;
}

export interface CreateBookingInput {
  roomId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  userId: string;
  userEmail: string | null;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const room = await getRoom(input.roomId);
  if (!room) throw new RoomNotFoundError();

  const ref = bookingsCollection.doc();

  // Run inside a transaction to guard against a race when two people book the same room for
  // overlapping times at nearly the same moment. Only a single equality filter (roomId) runs
  // server-side — no composite index needed — and the actual overlap check (startTime <
  // newEndTime && endTime > newStartTime) happens in memory over that room's bookings.
  await adminDb.runTransaction(async (tx) => {
    const overlapQuery = bookingsCollection.where("roomId", "==", input.roomId);
    const snapshot = await tx.get(overlapQuery);

    const hasConflict = snapshot.docs.some((doc) => {
      const data = doc.data();
      const existingStart = (data.startTime as Timestamp).toDate();
      const existingEnd = (data.endTime as Timestamp).toDate();
      return existingStart < input.endTime && existingEnd > input.startTime;
    });
    if (hasConflict) throw new BookingConflictError();

    tx.set(ref, {
      roomId: input.roomId,
      roomName: room.name,
      title: input.title,
      userId: input.userId,
      userEmail: input.userEmail,
      startTime: Timestamp.fromDate(input.startTime),
      endTime: Timestamp.fromDate(input.endTime),
      createdAt: FieldValue.serverTimestamp(),
    });
  });

  const doc = await ref.get();
  return toBooking(doc);
}

export async function deleteBooking(bookingId: string): Promise<boolean> {
  const ref = bookingsCollection.doc(bookingId);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.delete();
  return true;
}
