import {
  FieldValue,
  Timestamp,
  type Query,
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
  from?: Date;
  to?: Date;
}

// Deliberately only use a range filter on a single field (startTime) when querying Firestore,
// because filtering on two range fields at once (startTime and endTime) requires a composite
// index that would need to be deployed ahead of time. The "from" bound is instead re-filtered
// in memory after the query comes back.
export async function listBookings(filter: ListBookingsFilter = {}): Promise<Booking[]> {
  let query: Query = bookingsCollection;
  if (filter.roomId) query = query.where("roomId", "==", filter.roomId);
  if (filter.to) query = query.where("startTime", "<=", Timestamp.fromDate(filter.to));
  query = query.orderBy("startTime");

  const snapshot = await query.get();
  let bookings = snapshot.docs.map(toBooking);

  if (filter.from) {
    const fromMs = filter.from.getTime();
    bookings = bookings.filter((b) => new Date(b.endTime).getTime() >= fromMs);
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
  // overlapping times at nearly the same moment. Conflict check uses only startTime < newEndTime
  // (single range field) then filters endTime > newStartTime in memory, again to avoid needing a
  // composite index on two fields.
  await adminDb.runTransaction(async (tx) => {
    const overlapQuery = bookingsCollection
      .where("roomId", "==", input.roomId)
      .where("startTime", "<", Timestamp.fromDate(input.endTime));
    const snapshot = await tx.get(overlapQuery);

    const hasConflict = snapshot.docs.some((doc) => {
      const existingEnd = (doc.data().endTime as Timestamp).toDate();
      return existingEnd > input.startTime;
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
