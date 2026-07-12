"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createRoom, deleteRoom, fetchRooms, updateRoom } from "@/lib/api-client";
import { DEFAULT_ROOM_LOCATION, ROOM_SIZE_CAPACITY_MAX, ROOM_SIZE_LABEL, ROOM_SIZES } from "@/lib/constants";
import type { Room, RoomSize } from "@/types/roomtype-index";

interface PendingRoom {
  name: string;
  size: RoomSize;
  location: string;
  capacity: number;
}

function validateRoomFields(
  name: string,
  location: string,
  capacityInput: string,
  size: RoomSize,
  existingRooms: Room[],
  excludeRoomId?: string
): { capacity: number } | { error: string } {
  const trimmedName = name.trim();
  if (!trimmedName) return { error: "Room name is required" };
  if (!location.trim()) return { error: "Location is required" };

  const nameTaken = existingRooms.some(
    (room) => room.id !== excludeRoomId && room.name.trim().toLowerCase() === trimmedName.toLowerCase()
  );
  if (nameTaken) return { error: "This name has already been used" };

  const capacity = Number(capacityInput);
  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { error: "Capacity must be a positive whole number" };
  }
  if (capacity > ROOM_SIZE_CAPACITY_MAX[size]) {
    return { error: `Capacity for a ${ROOM_SIZE_LABEL[size]} room can't exceed ${ROOM_SIZE_CAPACITY_MAX[size]}` };
  }
  return { capacity };
}

export default function ManageRoomsPage() {
  const { data: rooms, mutate } = useSWR("rooms", fetchRooms);

  const [name, setName] = useState("");
  const [size, setSize] = useState<RoomSize>("small");
  const [location, setLocation] = useState(DEFAULT_ROOM_LOCATION);
  const [capacity, setCapacity] = useState(String(ROOM_SIZE_CAPACITY_MAX.small));
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingRoom, setPendingRoom] = useState<PendingRoom | null>(null);
  const [addConfirming, setAddConfirming] = useState(false);
  const [addedRoom, setAddedRoom] = useState<Room | null>(null);

  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSize, setEditSize] = useState<RoomSize>("small");
  const [editLocation, setEditLocation] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSizeChange = (newSize: RoomSize) => {
    setSize(newSize);
    setCapacity(String(ROOM_SIZE_CAPACITY_MAX[newSize]));
  };

  const handleAddSubmit = (e: FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const result = validateRoomFields(name, location, capacity, size, rooms ?? []);
    if ("error" in result) {
      setAddError(result.error);
      return;
    }

    setPendingRoom({ name: name.trim(), size, location: location.trim(), capacity: result.capacity });
  };

  const handleConfirmAdd = async () => {
    if (!pendingRoom) return;
    setAddConfirming(true);
    setAddError(null);
    try {
      const room = await createRoom(pendingRoom);
      await mutate();
      setAddedRoom(room);
      setPendingRoom(null);
      setName("");
      setLocation(DEFAULT_ROOM_LOCATION);
      setCapacity(String(ROOM_SIZE_CAPACITY_MAX[size]));
    } catch (err) {
      setAddError(err instanceof Error ? err.message : "Failed to add room");
      setPendingRoom(null);
    } finally {
      setAddConfirming(false);
    }
  };

  const startEdit = (room: Room) => {
    setEditingRoomId(room.id);
    setEditName(room.name);
    setEditSize(room.size);
    setEditLocation(room.location);
    setEditCapacity(String(room.capacity));
    setEditError(null);
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingRoomId) return;
    setEditError(null);

    const result = validateRoomFields(editName, editLocation, editCapacity, editSize, rooms ?? [], editingRoomId);
    if ("error" in result) {
      setEditError(result.error);
      return;
    }

    setEditSubmitting(true);
    try {
      await updateRoom(editingRoomId, {
        name: editName.trim(),
        size: editSize,
        location: editLocation.trim(),
        capacity: result.capacity,
      });
      await mutate();
      setEditingRoomId(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update room");
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (roomId: string) => {
    if (!confirm("Delete this room? This cannot be undone.")) return;

    setDeletingId(roomId);
    setDeleteError(null);
    try {
      await deleteRoom(roomId);
      await mutate();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete room");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={handleAddSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-medium text-gray-900">Add Room</h2>

        <Input id="roomName" label="Name" value={name} onChange={(e) => setName(e.target.value)} required />

        <Select
          id="roomSize"
          label="Size"
          value={size}
          onChange={(e) => handleSizeChange(e.target.value as RoomSize)}
          required
        >
          {ROOM_SIZES.map((s) => (
            <option key={s} value={s}>
              {ROOM_SIZE_LABEL[s]}
            </option>
          ))}
        </Select>

        <Input
          id="roomLocation"
          label="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        <Input
          id="roomCapacity"
          label={`Capacity (max ${ROOM_SIZE_CAPACITY_MAX[size]} for ${ROOM_SIZE_LABEL[size]})`}
          type="number"
          min={1}
          max={ROOM_SIZE_CAPACITY_MAX[size]}
          value={capacity}
          onChange={(e) => setCapacity(e.target.value)}
          required
        />

        {addError && <p className="text-sm text-red-600">{addError}</p>}

        <Button type="submit" className="w-full">
          Add Room
        </Button>
      </form>

      <Modal open={pendingRoom !== null} onClose={addConfirming ? undefined : () => setPendingRoom(null)}>
        {pendingRoom && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Confirm New Room</h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Name</dt>
                <dd className="text-right text-gray-900">{pendingRoom.name}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Size</dt>
                <dd className="text-right text-gray-900">{ROOM_SIZE_LABEL[pendingRoom.size]}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Location</dt>
                <dd className="text-right text-gray-900">{pendingRoom.location}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Capacity</dt>
                <dd className="text-right text-gray-900">{pendingRoom.capacity} people</dd>
              </div>
            </dl>

            {addError && <p className="text-sm text-red-600">{addError}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setPendingRoom(null)}
              >
                Cancel
              </Button>
              <Button type="button" className="flex-1" loading={addConfirming} onClick={handleConfirmAdd}>
                Confirm
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={addedRoom !== null} onClose={() => setAddedRoom(null)}>
        {addedRoom && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <span className="text-2xl text-green-600">✓</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Room Added!</h2>
              <p className="mt-1 text-sm text-gray-500">
                {addedRoom.name} ({ROOM_SIZE_LABEL[addedRoom.size]})
              </p>
            </div>
            <Button className="w-full" onClick={() => setAddedRoom(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>

      <div className="space-y-3">
        <h2 className="text-lg font-medium text-gray-900">Rooms</h2>
        {deleteError && <p className="text-sm text-red-600">{deleteError}</p>}

        {!rooms || rooms.length === 0 ? (
          <p className="text-sm text-gray-500">No rooms yet - add one above.</p>
        ) : (
          rooms.map((room) =>
            editingRoomId === room.id ? (
              <form
                key={room.id}
                onSubmit={handleEditSubmit}
                className="space-y-3 rounded-lg bg-white p-4 shadow-sm ring-2 ring-blue-500"
              >
                <Input id={`editName-${room.id}`} label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} required />
                <Select
                  id={`editSize-${room.id}`}
                  label="Size"
                  value={editSize}
                  onChange={(e) => setEditSize(e.target.value as RoomSize)}
                  required
                >
                  {ROOM_SIZES.map((s) => (
                    <option key={s} value={s}>
                      {ROOM_SIZE_LABEL[s]}
                    </option>
                  ))}
                </Select>
                <Input
                  id={`editLocation-${room.id}`}
                  label="Location"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  required
                />
                <Input
                  id={`editCapacity-${room.id}`}
                  label={`Capacity (max ${ROOM_SIZE_CAPACITY_MAX[editSize]} for ${ROOM_SIZE_LABEL[editSize]})`}
                  type="number"
                  min={1}
                  max={ROOM_SIZE_CAPACITY_MAX[editSize]}
                  value={editCapacity}
                  onChange={(e) => setEditCapacity(e.target.value)}
                  required
                />

                {editError && <p className="text-sm text-red-600">{editError}</p>}

                <div className="flex gap-2">
                  <Button type="submit" loading={editSubmitting} className="flex-1">
                    Save
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setEditingRoomId(null)} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </form>
            ) : (
              <div key={room.id} className="flex items-start justify-between gap-4 rounded-lg bg-white p-4 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {room.name}{" "}
                    <span className="ml-1 text-xs font-normal text-gray-500">({ROOM_SIZE_LABEL[room.size]})</span>
                  </p>
                  <p className="text-sm text-gray-500">{room.location}</p>
                  <p className="text-sm text-gray-500">Capacity: {room.capacity}</p>
                </div>
                <div className="flex flex-shrink-0 gap-2">
                  <Button variant="secondary" onClick={() => startEdit(room)}>
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    loading={deletingId === room.id}
                    onClick={() => handleDelete(room.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}
