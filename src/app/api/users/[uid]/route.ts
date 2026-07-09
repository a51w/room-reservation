import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { setUserRole } from "@/lib/server/users";
import type { UserRole } from "@/types";

const VALID_ROLES: UserRole[] = ["admin", "normal_user"];

interface RouteParams {
  params: Promise<{ uid: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { uid } = await params;

  // Prevents an admin from locking themselves out (or anyone else) by fat-fingering
  // their own role change - use `npm run set-role` for that if it's ever genuinely needed.
  if (uid === user.uid) {
    return NextResponse.json({ error: "You cannot change your own role" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: "Role must be admin or normal_user" }, { status: 400 });
  }

  await setUserRole(uid, role);
  return NextResponse.json({ uid, role });
}
