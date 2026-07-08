import { auth } from "@/lib/firebase/client";
import type { Booking, Room, RoomSize } from "@/types";

// Central wrapper for every /api/* call: attaches the Firebase ID token automatically
// and turns our error response shape into an Error message the UI can display directly.
async function authedFetch(path: string, options: RequestInit = {}) {
  const idToken = await auth.currentUser?.getIdToken();
  if (!idToken) throw new Error("Not authenticated");

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${idToken}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export async function fetchRooms(): Promise<Room[]> {
  const data = await authedFetch("/api/rooms");
  return data.rooms;
}

export async function createRoom(name: string, size: RoomSize): Promise<Room> {
  const data = await authedFetch("/api/rooms", {
    method: "POST",
    body: JSON.stringify({ name, size }),
  });
  return data.room;
}

export async function updateRoom(
  roomId: string,
  updates: Partial<{ name: string; size: RoomSize }>
): Promise<Room> {
  const data = await authedFetch(`/api/rooms/${roomId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
  return data.room;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await authedFetch(`/api/rooms/${roomId}`, { method: "DELETE" });
}

export interface BookingFilter {
  roomId?: string;
  from?: Date;
  to?: Date;
}

export async function fetchBookings(filter: BookingFilter = {}): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filter.roomId) params.set("roomId", filter.roomId);
  if (filter.from) params.set("from", filter.from.toISOString());
  if (filter.to) params.set("to", filter.to.toISOString());

  const query = params.toString();
  const data = await authedFetch(`/api/bookings${query ? `?${query}` : ""}`);
  return data.bookings;
}

export interface CreateBookingInput {
  roomId: string;
  title: string;
  startTime: Date;
  endTime: Date;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  const data = await authedFetch("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      roomId: input.roomId,
      title: input.title,
      startTime: input.startTime.toISOString(),
      endTime: input.endTime.toISOString(),
    }),
  });
  return data.booking;
}

export async function cancelBooking(bookingId: string): Promise<void> {
  await authedFetch(`/api/bookings/${bookingId}`, { method: "DELETE" });
}
