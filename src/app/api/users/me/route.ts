import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { getUserProfile } from "@/lib/server/users";
import type { AdminUserSummary } from "@/types";

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin-created accounts predate self-registration and have no profile doc, so name/
  // studentId/program come back null rather than failing - matches listUserSummaries().
  const profile = await getUserProfile(user.uid);
  const summary: AdminUserSummary = {
    uid: user.uid,
    email: user.email,
    role: user.role,
    name: profile?.name ?? null,
    studentId: profile?.studentId ?? null,
    program: profile?.program ?? null,
  };

  return NextResponse.json({ profile: summary });
}
