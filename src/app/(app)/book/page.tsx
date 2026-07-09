"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/hooks/useAuth";
import { createBooking, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";
import { formatDateLabel, formatDateTimeRange, formatTimeLabel } from "@/lib/date-utils";
import type { Booking } from "@/types";

const CONFIRMATION_REDIRECT_DELAY_MS = 1800;

interface PendingBooking {
  roomId: string;
  title: string;
  startTime: Date;
  endTime: Date;
  bookForEmail?: string;
}

function BookRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedRoomId = searchParams.get("roomId");
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const { data: rooms, isLoading: roomsLoading, error: roomsFetchError } = useSWR(
    "rooms",
    fetchRooms
  );

  const [roomId, setRoomId] = useState("");
  const [title, setTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [bookForOther, setBookForOther] = useState(false);
  const [bookForEmail, setBookForEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);

  // Priority: explicit selection > ?roomId= from a "book this room" link (e.g. the
  // status dashboard) > the first loaded room - all derived, no effect needed to sync it.
  const selectedRoomId = roomId || preselectedRoomId || rooms?.[0]?.id || "";
  const pendingRoom = pendingBooking ? rooms?.find((r) => r.id === pendingBooking.roomId) : undefined;

  // Give the user a moment to read the confirmation before moving them on - same
  // "subscribe to a timer, act in its callback" shape as the status dashboard's clock.
  useEffect(() => {
    if (!confirmedBooking) return;
    const timer = setTimeout(() => router.push("/my-bookings"), CONFIRMATION_REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [confirmedBooking, router]);

  const handleSubmit = (e: FormEvent) => {
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
    if (bookForOther && !bookForEmail.trim()) {
      setError("Please enter the user's email");
      return;
    }

    setPendingBooking({
      roomId: selectedRoomId,
      title,
      startTime: start,
      endTime: end,
      ...(bookForOther ? { bookForEmail: bookForEmail.trim() } : {}),
    });
  };

  const handleConfirm = async () => {
    if (!pendingBooking) return;
    setConfirming(true);
    setError(null);
    try {
      const booking = await createBooking(pendingBooking);
      setConfirmedBooking(booking);
      setPendingBooking(null);
      setTitle("");
      setStartTime("");
      setEndTime("");
      setBookForOther(false);
      setBookForEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create booking");
      setPendingBooking(null);
    } finally {
      setConfirming(false);
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

        {isAdmin && (
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <input
                type="checkbox"
                checked={bookForOther}
                onChange={(e) => {
                  setBookForOther(e.target.checked);
                  if (!e.target.checked) setBookForEmail("");
                }}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Book for another user
            </label>
            {bookForOther && (
              <Input
                id="bookForEmail"
                label="User's Email"
                type="email"
                value={bookForEmail}
                onChange={(e) => setBookForEmail(e.target.value)}
                required
              />
            )}
          </div>
        )}

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

        <Button type="submit" className="w-full">
          Book Room
        </Button>
      </form>

      <Modal open={pendingBooking !== null} onClose={confirming ? undefined : () => setPendingBooking(null)}>
        {pendingBooking && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Confirm Booking</h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Room</dt>
                <dd className="text-right text-gray-900">
                  {pendingRoom ? `${pendingRoom.name} (${ROOM_SIZE_LABEL[pendingRoom.size]})` : "—"}
                </dd>
              </div>
              {pendingBooking.bookForEmail && (
                <div className="flex justify-between gap-4">
                  <dt className="text-gray-500">Booking For</dt>
                  <dd className="text-right text-gray-900">{pendingBooking.bookForEmail}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Title</dt>
                <dd className="text-right text-gray-900">{pendingBooking.title || "—"}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-right text-gray-900">
                  {formatDateLabel(pendingBooking.startTime.toISOString())}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Time</dt>
                <dd className="text-right text-gray-900">
                  {formatTimeLabel(pendingBooking.startTime.toISOString())} -{" "}
                  {formatTimeLabel(pendingBooking.endTime.toISOString())}
                </dd>
              </div>
            </dl>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() => setPendingBooking(null)}
              >
                Cancel
              </Button>
              <Button type="button" className="flex-1" loading={confirming} onClick={handleConfirm}>
                Confirm Booking
              </Button>
            </div>
          </div>
        )}
      </Modal>

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
