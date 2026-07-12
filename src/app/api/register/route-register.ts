import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { createUserProfile } from "@/lib/server/server-users";
import type { Program } from "@/types/roomtype-index";

const VALID_PROGRAMS: Program[] = ["regular", "international", "health_data_science"];
const STUDENT_ID_PATTERN = /^\d{11}$/;

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const studentId = typeof body?.studentId === "string" ? body.studentId.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const program = body?.program;

  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!STUDENT_ID_PATTERN.test(studentId)) {
    return NextResponse.json({ error: "Student ID must be exactly 11 digits" }, { status: 400 });
  }
  if (!email) return NextResponse.json({ error: "Email is required" }, { status: 400 });
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
  }
  if (!VALID_PROGRAMS.includes(program)) {
    return NextResponse.json({ error: "Please select a valid program" }, { status: 400 });
  }

  try {
    // New registrations always land as normal_user; admin is granted separately via
    // `npm run set-role`, never something a signup request can set itself.
    const userRecord = await adminAuth.createUser({ email, password, displayName: name });
    await adminAuth.setCustomUserClaims(userRecord.uid, { role: "normal_user" });
    await createUserProfile({ uid: userRecord.uid, name, studentId, email, program });

    return NextResponse.json({ uid: userRecord.uid }, { status: 201 });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json({ error: "An account with this email already exists" }, { status: 409 });
    }
    if (code === "auth/invalid-email") {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    throw err;
  }
}
