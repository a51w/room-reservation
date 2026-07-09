"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetchBookings, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";
import { endOfDay, startOfDay, toDateInputValue } from "@/lib/date-utils";
import type { Booking, Room } from "@/types";

function formatClock(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatHourMinute(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

interface RoomStatus {
  room: Room;
  current: Booking | null;
  upcoming: Booking[];
}

export default function RoomStatusPage() {
  const [now, setNow] = useState(() => new Date());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Ticks the live clock every second - subscribes to a timer and calls setState in its
  // callback, the same shape as useAuth's onAuthStateChanged effect.
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const nowMs = now.getTime();
  const dateKey = toDateInputValue(now);

  const { data: rooms } = useSWR("rooms", fetchRooms);
  const { data: bookings } = useSWR(["status-bookings", dateKey], () =>
    fetchBookings({ from: startOfDay(now), to: endOfDay(now) })
  );

  const roomStatuses: RoomStatus[] = (rooms ?? []).map((room) => {
    const roomBookings = (bookings ?? [])
      .filter((b) => b.roomId === room.id)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

    const current =
      roomBookings.find(
        (b) => new Date(b.startTime).getTime() <= nowMs && nowMs <= new Date(b.endTime).getTime()
      ) ?? null;
    const upcoming = roomBookings.filter((b) => new Date(b.startTime).getTime() > nowMs);

    return { room, current, upcoming };
  });

  const totalRooms = roomStatuses.length;
  const occupiedCount = roomStatuses.filter((s) => s.current !== null).length;
  const availableCount = totalRooms - occupiedCount;

  const selected = roomStatuses.find((s) => s.room.id === selectedRoomId) ?? roomStatuses[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Real-time</h1>
        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Book a Room
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Current Time</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{formatDate(now)}</p>
          <p className="text-xl font-semibold tabular-nums text-gray-900">{formatClock(now)}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Total Room</p>
          <p className="mt-1 text-3xl font-semibold text-gray-900">{totalRooms}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Available</p>
          <p className="mt-1 text-3xl font-semibold text-green-600">{availableCount}</p>
        </div>
        <div className="rounded-lg bg-white p-4 shadow-sm">
          <p className="text-xs font-medium text-gray-500">Occupied</p>
          <p className="mt-1 text-3xl font-semibold text-red-600">{occupiedCount}</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <div className="min-w-0 flex-1 space-y-3">
          <h2 className="text-lg font-medium text-gray-900">List of Meeting Room</h2>
          {roomStatuses.length === 0 ? (
            <p className="text-sm text-gray-500">No rooms available yet.</p>
          ) : (
            <ul className="space-y-2">
              {roomStatuses.map((status) => (
                <li key={status.room.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedRoomId(status.room.id)}
                    className={`flex w-full items-center justify-between rounded-lg bg-white p-4 text-left shadow-sm transition-colors ${
                      selected?.room.id === status.room.id ? "ring-2 ring-blue-500" : ""
                    }`}
                  >
                    <div>
                      <p className="font-medium text-gray-900">{status.room.name}</p>
                      <p className="text-sm text-gray-500">{ROOM_SIZE_LABEL[status.room.size]}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          status.current ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                        }`}
                      >
                        {status.current ? "Occupied" : "Available"}
                      </span>
                      <Link
                        href={`/book?roomId=${status.room.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-300 text-gray-500 hover:bg-gray-50"
                        title={`Book ${status.room.name}`}
                      >
                        +
                      </Link>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="w-full space-y-3 rounded-lg bg-white p-4 shadow-sm md:w-72">
          <h2 className="text-lg font-medium text-gray-900">Detail</h2>
          {!selected ? (
            <p className="text-sm text-gray-500">Select a room to see its bookings.</p>
          ) : (
            <>
              <p className="text-sm font-medium text-gray-700">Room: {selected.room.name}</p>
              <div className="space-y-2">
                {selected.current === null && selected.upcoming.length === 0 && (
                  <p className="text-sm text-gray-500">No bookings today.</p>
                )}
                {selected.current && (
                  <div className="flex items-center justify-between rounded-md bg-red-50 p-2 text-sm">
                    <div>
                      <p className="font-medium text-gray-900">{selected.current.title}</p>
                      <p className="text-gray-500">{selected.current.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-red-700">Now</p>
                      <p className="text-gray-500">
                        {formatHourMinute(selected.current.startTime)} -{" "}
                        {formatHourMinute(selected.current.endTime)}
                      </p>
                    </div>
                  </div>
                )}
                {selected.upcoming.map((booking, index) => (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between rounded-md bg-gray-50 p-2 text-sm"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{booking.title}</p>
                      <p className="text-gray-500">{booking.userEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-700">
                        {index === 0 && !selected.current
                          ? `Next on ${formatHourMinute(booking.startTime)}`
                          : "Booked"}
                      </p>
                      <p className="text-gray-500">{formatHourMinute(booking.startTime)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
