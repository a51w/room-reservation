import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { deleteBooking, getBooking } from "@/lib/server/bookings";

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { bookingId } = await params;
  const booking = await getBooking(bookingId);
  if (!booking) return NextResponse.json({ error: "Booking not found" }, { status: 404 });

  // normal_user can only cancel their own booking; admin can cancel anyone's (Global Booking Management)
  if (user.role !== "admin" && booking.userId !== user.uid) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteBooking(bookingId);
  return new NextResponse(null, { status: 204 });
}
