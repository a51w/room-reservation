import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { deleteRoom, updateRoom } from "@/lib/server/rooms";
import type { RoomSize } from "@/types";

const VALID_SIZES: RoomSize[] = ["small", "medium", "large"];

interface RouteParams {
  params: Promise<{ roomId: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await params;
  const body = await request.json().catch(() => null);

  const updates: Partial<{ name: string; size: RoomSize }> = {};
  if (body?.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Room name must not be empty" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }
  if (body?.size !== undefined) {
    if (!VALID_SIZES.includes(body.size)) {
      return NextResponse.json({ error: "Size must be small, medium, or large" }, { status: 400 });
    }
    updates.size = body.size;
  }

  const room = await updateRoom(roomId, updates);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return NextResponse.json({ room });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { roomId } = await params;
  const deleted = await deleteRoom(roomId);
  if (!deleted) return NextResponse.json({ error: "Room not found" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
