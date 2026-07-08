import { NextRequest, NextResponse } from "next/server";
import { getAuthedUser } from "@/lib/firebase/auth-server";
import { createRoom, listRooms } from "@/lib/server/rooms";
import type { RoomSize } from "@/types";

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

  if (!name) {
    return NextResponse.json({ error: "Room name is required" }, { status: 400 });
  }
  if (!VALID_SIZES.includes(size)) {
    return NextResponse.json({ error: "Size must be small, medium, or large" }, { status: 400 });
  }

  const room = await createRoom(name, size);
  return NextResponse.json({ room }, { status: 201 });
}
