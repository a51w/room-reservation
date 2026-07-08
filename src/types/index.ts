export type UserRole = "admin" | "normal_user";

export interface AppUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

export type RoomSize = "small" | "medium" | "large";

export interface Room {
  id: string;
  name: string;
  size: RoomSize;
  createdAt: string;
}

export interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  userId: string;
  userEmail: string | null;
  startTime: string;
  endTime: string;
  createdAt: string;
}