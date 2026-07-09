"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { createBooking, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";
import { formatDateTimeRange } from "@/lib/date-utils";
import type { Booking } from "@/types";

const CONFIRMATION_REDIRECT_DELAY_MS = 1800;

function BookRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId");

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
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Priority: explicit selection > ?roomId= from a "book this room" link (e.g. the
  // status dashboard) > the first loaded room - all derived, no effect needed to sync it.
  const selectedRoomId = roomId || preselectedRoomId || rooms?.[0]?.id || "";

  // Give the user a moment to read the confirmation before moving them on - same
  // "subscribe to a timer, act in its callback" shape as the status dashboard's clock.
  useEffect(() => {
    if (!confirmedBooking) return;
    const timer = setTimeout(() => router.push("/my-bookings"), CONFIRMATION_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [confirmedBooking, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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
      const booking = await createBooking({ roomId: selectedRoomId, title, startTime: start, endTime: end });
      setConfirmedBooking(booking);
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

        <Button type="submit" loading={submitting} className="w-full">
          Book Room
        </Button>
      </form>

      <Modal open={confirmedBooking !== null}>
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <span className="text-2xl text-green-600">✓</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Booking Confirmed!</h2>
            {confirmedBooking && (
              <p className="mt-1 text-sm text-gray-500">
                {confirmedBooking.roomName} · {formatDateTimeRange(confirmedBooking.startTime, confirmedBooking.endTime)}
              </p>
            )}
          </div>
          <Button className="w-full" onClick={() => router.push("/my-bookings")}>
            View My Bookings
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// useSearchParams requires a Suspense boundary during static generation.
export default function BookRoomPage() {
  return (
    <Suspense fallback={<p className="text-center text-gray-500">Loading...</p>}>
      <BookRoomForm />
    </Suspense>
  );
}
