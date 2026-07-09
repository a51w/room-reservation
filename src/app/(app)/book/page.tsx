"use client";

import { FormEvent, useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createBooking, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";

export default function BookRoomPage() {
  const { data: rooms, isLoading: roomsLoading, error: roomsFetchError } = useSWR(
    "rooms",
    fetchRooms
  );
  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Falls back to the first loaded room until the user picks one explicitly,
  // instead of syncing default selection through an effect.
  const selectedRoomId = roomId || rooms?.[0]?.id || "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const start = startTime ? new Date(startTime) : null;
    const end = endTime ? new Date(endTime) : null;

    if (!selectedRoomId) {
      setError("Please select a room");
      return;
    }
    if (!start || !end || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      setError("Please choose a start and end time");
      return;
    }
    if (start >= end) {
      setError("Start time must be before end time");
      return;
    }

    setSubmitting(true);
    try {
      await createBooking({ roomId: selectedRoomId, title, startTime: start, endTime: end });
      setSuccess("Room booked successfully.");
      setTitle("");
      setStartTime("");
      setEndTime("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Book a Room</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg bg-white p-6 shadow-sm">
        <Select
          id="room"
          label="Room"
          value={selectedRoomId}
          onChange={(e) => setRoomId(e.target.value)}
          disabled={roomsLoading || !rooms?.length}
          required
        >
          {!rooms?.length && <option value="">No rooms available</option>}
          {rooms?.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name} ({ROOM_SIZE_LABEL[room.size]})
            </option>
          ))}
        </Select>

        <Input
          id="title"
          label="Meeting Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <Input
          id="startTime"
          label="Start Time"
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
        />

        <Input
          id="endTime"
          label="End Time"
          type="datetime-local"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          required
        />

        {(error || roomsFetchError) && (
          <p className="text-sm text-red-600">
            {error ?? "Failed to load rooms"}
          </p>
        )}
        {success && <p className="text-sm text-green-600">{success}</p>}

        <Button type="submit" loading={submitting} className="w-full">
          Book Room
        </Button>
      </form>
    </div>
  );
}
