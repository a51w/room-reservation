import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { listUserSummaries } from "@/lib/server/users";

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await listUserSummaries();
  return NextResponse.json({ users });
}
