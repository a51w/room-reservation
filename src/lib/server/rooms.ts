import { FieldValue, type Timestamp, type QueryDocumentSnapshot, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Room, RoomSize } from "@/types";

const roomsCollection = adminDb.collection("rooms");

function toRoom(doc: QueryDocumentSnapshot | DocumentSnapshot): Room {
  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    size: data.size,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
}

export async function listRooms(): Promise<Room[]> {
  const snapshot = await roomsCollection.orderBy("name").get();
  return snapshot.docs.map(toRoom);
}

export async function getRoom(roomId: string): Promise<Room | null> {
  const doc = await roomsCollection.doc(roomId).get();
  return doc.exists ? toRoom(doc) : null;
}

export async function createRoom(name: string, size: RoomSize): Promise<Room> {
  const ref = await roomsCollection.add({
    name,
    size,
    createdAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toRoom(doc);
}

export async function updateRoom(
  roomId: string,
  updates: Partial<{ name: string; size: RoomSize }>
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
