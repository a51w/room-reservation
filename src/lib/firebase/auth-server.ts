import type { NextRequest } from "next/server";
import { adminAuth } from "./admin";
import type { UserRole } from "@/types";

export interface AuthedUser {
  uid: string;
  email: string | null;
  role: UserRole;
}

// Verifies the Firebase ID token from the Authorization header and reads the "role" custom claim.
// Every route handler that needs auth goes through this single function, so authorization logic
// doesn't get duplicated across routes.
export async function getAuthedUser(request: NextRequest): Promise<AuthedUser | null> {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const role = (decoded.role as UserRole) ?? "normal_user";
    return { uid: decoded.uid, email: decoded.email ?? null, role };
  } catch {
    return null;
  }
}
