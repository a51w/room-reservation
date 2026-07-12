import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { deleteRoom, getRoom, roomNameExists, updateRoom } from "@/lib/server/server-rooms";
import { ROOM_SIZE_CAPACITY_MAX } from "@/lib/constants";
import type { RoomSize } from "@/types/roomtype-index";

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
  const existing = await getRoom(roomId);
  if (!existing) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const body = await request.json().catch(() => null);

  const updates: Partial<{ name: string; size: RoomSize; location: string; capacity: number }> = {};
  if (body?.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Room name must not be empty" }, { status: 400 });
    }
    const trimmedName = body.name.trim();
    if (await roomNameExists(trimmedName, roomId)) {
      return NextResponse.json({ error: "This name has already been used" }, { status: 409 });
    }
    updates.name = trimmedName;
  }
  if (body?.size !== undefined) {
    if (!VALID_SIZES.includes(body.size)) {
      return NextResponse.json({ error: "Size must be small, medium, or large" }, { status: 400 });
    }
    updates.size = body.size;
  }
  if (body?.location !== undefined) {
    if (typeof body.location !== "string" || !body.location.trim()) {
      return NextResponse.json({ error: "Location must not be empty" }, { status: 400 });
    }
    updates.location = body.location.trim();
  }
  if (body?.capacity !== undefined) {
    if (typeof body.capacity !== "number" || !Number.isInteger(body.capacity) || body.capacity <= 0) {
      return NextResponse.json({ error: "Capacity must be a positive whole number" }, { status: 400 });
    }
    updates.capacity = body.capacity;
  }

  // Validate capacity against whichever size ends up in effect after this update,
  // since either field (or both) may be changing in the same request.
  const effectiveSize = updates.size ?? existing.size;
  const effectiveCapacity = updates.capacity ?? existing.capacity;
  if (effectiveCapacity > ROOM_SIZE_CAPACITY_MAX[effectiveSize]) {
    return NextResponse.json(
      { error: `Capacity for a ${effectiveSize} room can't exceed ${ROOM_SIZE_CAPACITY_MAX[effectiveSize]}` },
      { status: 400 }
    );
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
