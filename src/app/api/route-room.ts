import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { createRoom, listRooms, roomNameExists } from "@/lib/server/server-rooms";
import { ROOM_SIZE_CAPACITY_MAX } from "@/lib/constants";
import type { RoomSize } from "@/types/roomtype-index";

const VALID_SIZES: RoomSize[] = ["small", "medium", "large"];

export async function GET(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rooms = await listRooms();
  return NextResponse.json({ rooms });
}

export async function POST(request: NextRequest) {
  const user = await getAuthedUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const size = body?.size;
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const capacity = body?.capacity;

  if (!name) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 });
  }
  if (!VALID_SIZES.includes(size)) {
    return NextResponse.json({ error: "Size must be small, medium, or large" }, { status: 400 });
  }
  if (!location) {
    return NextResponse.json({ error: "Location is required" }, { status: 400 });
  }
  if (typeof capacity !== "number" || !Number.isInteger(capacity) || capacity <= 0) {
    return NextResponse.json({ error: "Capacity must be a positive whole number" }, { status: 400 });
  }
  if (capacity > ROOM_SIZE_CAPACITY_MAX[size as RoomSize]) {
    return NextResponse.json(
      { error: `Capacity for a ${size} room can't exceed ${ROOM_SIZE_CAPACITY_MAX[size as RoomSize]}` },
      { status: 400 }
    );
  }
  if (await roomNameExists(name)) {
    return NextResponse.json({ error: "This name has already been used" }, { status: 409 });
  }

  const room = await createRoom({ name, size, location, capacity });
  return NextResponse.json({ room }, { status: 201 });
}
