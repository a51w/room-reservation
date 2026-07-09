export type UserRole = "admin" | "normal_user";

export interface AppUser {
  uid: string;
  email: string | null;
  name: string | null;
  role: UserRole;
}

export type RoomSize = "small" | "medium" | "large";

export interface Room {
  id: string;
  name: string;
  size: RoomSize;
  location: string;
  capacity: number;
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

export type Program = "regular" | "international" | "health_data_science";

export interface UserProfile {
  uid: string;
  name: string;
  studentId: string;
  email: string;
  program: Program;
  createdAt: string;
}

// A row in the admin "Manage Users" list: Auth account (uid/email/role) joined with
// the Firestore profile when one exists (admin-created accounts predate self-registration
// and have no profile doc, so these are nullable).
export interface AdminUserSummary {
  uid: string;
  email: string | null;
  role: UserRole;
  name: string | null;
  studentId: string | null;
  program: Program | null;
}