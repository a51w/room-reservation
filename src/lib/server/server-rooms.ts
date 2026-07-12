import { FieldValue, type Timestamp, type QueryDocumentSnapshot, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Room, RoomSize } from "@/types/roomtype-index";

const roomsCollection = adminDb.collection("rooms");

function toRoom(doc: QueryDocumentSnapshot | DocumentSnapshot): Room {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    size: data.size,
    location: data.location,
    capacity: data.capacity,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
}

export async function listRooms(): Promise<Room[]> {
  const snapshot = await roomsCollection.orderBy("name").get();
  return snapshot.docs.map(toRoom);
}

// Checks if a room name already exists in the database, optionally excluding a specific room ID (useful when updating a room).
export async function roomNameExists(name: string, excludeRoomId?: string): Promise<boolean> {
  const snapshot = await roomsCollection.get();
  const normalized = name.trim().toLowerCase();
  return snapshot.docs.some(
    (doc) => doc.id !== excludeRoomId && (doc.data().name as string).trim().toLowerCase() === normalized
  );
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const doc = await roomsCollection.doc(roomId).get();
  return doc.exists ? toRoom(doc) : null;
}

export interface CreateRoomInput {
  name: string;
  size: RoomSize;
  location: string;
  capacity: number;
}

export async function createRoom(input: CreateRoomInput): Promise<Room> {
  const ref = await roomsCollection.add({
    name: input.name,
    size: input.size,
    location: input.location,
    capacity: input.capacity,
    createdAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toRoom(doc);
}

export async function updateRoom(
  roomId: string,
  updates: Partial<{ name: string; size: RoomSize; location: string; capacity: number }>
): Promise<Room | null> {
  const ref = roomsCollection.doc(roomId);
  const doc = await ref.get();
  if (!doc.exists) return null;

  await ref.update(updates);
  const updated = await ref.get();
  return toRoom(updated);
}

export async function deleteRoom(roomId: string): Promise<boolean> {
  const ref = roomsCollection.doc(roomId);
  const doc = await ref.get();
  if (!doc.exists) return false;

  await ref.delete();
  return true;
}
