import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import {
  BookingConflictError,
  RoomNotFoundError,
  createBooking,
  listBookings,
} from "@/lib/server/bookings";
import { getUserBasicInfo } from "@/lib/server/users";

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const roomId = searchParams.get("roomId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const bookings = await listBookings({
    roomId,
    userId,
    from: from ? new Date(from) : undefined,
    to: to ? new Date(to) : undefined,
  });
  return NextResponse.json({ bookings });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const roomId = body?.roomId;
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startTime = typeof body?.startTime === "string" ? new Date(body.startTime) : null;
  const endTime = typeof body?.endTime === "string" ? new Date(body.endTime) : null;

  if (typeof roomId !== "string" || !roomId) {
    return NextResponse.json({ error: "roomId is required" }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (!startTime || !endTime || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    return NextResponse.json({ error: "startTime and endTime must be valid dates" }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: "startTime must be before endTime" }, { status: 400 });
  }
  if (startTime < new Date()) {
    return NextResponse.json({ error: "Cannot book a time in the past" }, { status: 400 });
  }

  // Only admins may book on behalf of someone else (Global Booking Management); anyone
  // else booking is always attributed to themselves regardless of what's in the body.
  let bookingOwner = { userId: user.uid, userEmail: user.email };
  const targetUserId = typeof body?.userId === "string" ? body.userId : "";
  if (targetUserId && targetUserId !== user.uid) {
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const targetUser = await getUserBasicInfo(targetUserId);
    if (!targetUser) {
      return NextResponse.json({ error: "Selected user not found" }, { status: 404 });
    }
    bookingOwner = { userId: targetUser.uid, userEmail: targetUser.email };
  }

  try {
    const booking = await createBooking({
      roomId,
      title,
      startTime,
      endTime,
      userId: bookingOwner.userId,
      userEmail: bookingOwner.userEmail,
    });
    return NextResponse.json({ booking }, { status: 201 });
  } catch (err) {
    if (err instanceof BookingConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof RoomNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    throw err;
  }
}
