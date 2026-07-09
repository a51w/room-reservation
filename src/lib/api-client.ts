import { auth } from "@/lib/firebase/client";
import type { AdminUserSummary, Booking, Program, Room, RoomSize, UserRole } from "@/types";

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

export interface CreateRoomInput {
  name: string;
  size: RoomSize;
  location: string;
  capacity: number;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const data = await authedFetch("/api/rooms", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data.room;
}

export async function updateRoom(
  roomId: string,
  updates: Partial<{ name: string; size: RoomSize; location: string; capacity: number }>
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
  userId?: string;
  from?: Date;
  to?: Date;
}

export async function fetchBookings(filter: BookingFilter = {}): Promise<Booking[]> {
  const params = new URLSearchParams();
  if (filter.roomId) params.set("roomId", filter.roomId);
  if (filter.userId) params.set("userId", filter.userId);
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

export interface RegisterInput {
  name: string;
  studentId: string;
  email: string;
  password: string;
  program: Program;
}

// Not routed through authedFetch: there's no signed-in user (and thus no ID token) yet.
export async function registerUser(input: RegisterInput): Promise<void> {
  const res = await fetch("/api/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
}

export async function fetchUsers(): Promise<AdminUserSummary[]> {
  const data = await authedFetch("/api/users");
  return data.users;
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await authedFetch(`/api/users/${uid}`, {
    method: "PATCH",
    body: JSON.stringify({ role }),
  });
}
