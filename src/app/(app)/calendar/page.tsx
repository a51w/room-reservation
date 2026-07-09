"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { cancelBooking, fetchBookings, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL, ROOM_SIZES } from "@/lib/constants";
import { endOfDay, formatDateLabel, formatTimeLabel, parseDateInputValue, startOfDay, toDateInputValue } from "@/lib/date-utils";
import type { Booking, RoomSize } from "@/types";

const DAY_START_HOUR = 8;
const DAY_END_HOUR = 20;
const HOUR_HEIGHT_PX = 60;
const WINDOW_START_MINUTES = DAY_START_HOUR * 60;
const WINDOW_END_MINUTES = DAY_END_HOUR * 60;
const WINDOW_MINUTES = WINDOW_END_MINUTES - WINDOW_START_MINUTES;
const HOUR_LABELS = Array.from(
  { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
  (_, i) => DAY_START_HOUR + i
);

function formatHourLabel(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}

function formatTimeRange(startIso: string, endIso: string): string {
  const opts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit" };
  return `${new Date(startIso).toLocaleTimeString(undefined, opts)} - ${new Date(endIso).toLocaleTimeString(undefined, opts)}`;
}

interface BookingLayout {
  booking: Booking;
  topPercent: number;
  heightPercent: number;
}

// Positions a booking within its room's day column as a percentage of the visible
// time window, clipping to that window so a booking that starts before/ends after
// it still renders sensibly instead of overflowing or being skipped outright.
function layoutBooking(booking: Booking, dayStart: Date): BookingLayout | null {
  const rawStart = (new Date(booking.startTime).getTime() - dayStart.getTime()) / 60000;
  const rawEnd = (new Date(booking.endTime).getTime() - dayStart.getTime()) / 60000;
  const clampedStart = Math.max(rawStart, WINDOW_START_MINUTES);
  const clampedEnd = Math.min(rawEnd, WINDOW_END_MINUTES);
  if (clampedEnd <= clampedStart) return null;

  return {
    booking,
    topPercent: ((clampedStart - WINDOW_START_MINUTES) / WINDOW_MINUTES) * 100,
    heightPercent: ((clampedEnd - clampedStart) / WINDOW_MINUTES) * 100,
  };
}

export default function CalendarDashboardPage() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [sizeFilter, setSizeFilter] = useState<Record<RoomSize, boolean>>({
    small: true,
    medium: true,
    large: true,
  });
  const [search, setSearch] = useState("");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const dayStart = startOfDay(selectedDate);
  const dateKey = toDateInputValue(selectedDate);

  const { data: rooms } = useSWR("rooms", fetchRooms);
  const {
    data: bookings,
    isLoading: bookingsLoading,
    error: bookingsFetchError,
    mutate: refreshBookings,
  } = useSWR(["calendar-bookings", dateKey], () =>
    fetchBookings({ from: dayStart, to: endOfDay(selectedDate) })
  );

  const visibleRooms = (rooms ?? []).filter((room) => sizeFilter[room.size]);
  const visibleRoomIds = new Set(visibleRooms.map((room) => room.id));
  const searchLower = search.trim().toLowerCase();

  const visibleBookings = (bookings ?? []).filter((booking) => {
    if (!visibleRoomIds.has(booking.roomId)) return false;
    if (!searchLower) return true;
    return (
      booking.title.toLowerCase().includes(searchLower) ||
      (booking.userEmail ?? "").toLowerCase().includes(searchLower)
    );
  });

  const toggleSize = (size: RoomSize) => {
    setSizeFilter((prev) => ({ ...prev, [size]: !prev[size] }));
  };

  const handleCancel = async (bookingId: string) => {
    setCancelingId(bookingId);
    setActionError(null);
    try {
      await cancelBooking(bookingId);
      await refreshBookings();
      setSelectedBooking(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setCancelingId(null);
    }
  };

  const selectedRoom = rooms?.find((room) => room.id === selectedBooking?.roomId) ?? null;

  const gridHeight = ((DAY_END_HOUR - DAY_START_HOUR) * HOUR_HEIGHT_PX);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard Calendar</h1>
        <Link
          href="/book"
          className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          + Book a Room
        </Link>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="w-full flex-shrink-0 space-y-6 rounded-lg bg-white p-4 shadow-sm md:w-56">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">View</h2>
            <div className="flex overflow-hidden rounded-md border border-gray-300">
              <span className="flex-1 bg-blue-600 px-3 py-1.5 text-center text-sm font-medium text-white">
                Day
              </span>
              <span
                className="flex-1 cursor-not-allowed px-3 py-1.5 text-center text-sm text-gray-400"
                title="Week view is coming soon"
              >
                Week
              </span>
              <span
                className="flex-1 cursor-not-allowed px-3 py-1.5 text-center text-sm text-gray-400"
                title="Month view is coming soon"
              >
                Month
              </span>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Date</h2>
            <input
              type="date"
              value={dateKey}
              onChange={(e) => e.target.value && setSelectedDate(parseDateInputValue(e.target.value))}
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(new Date())}
              className="mt-2 w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Today
            </button>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Room Type</h2>
            <div className="space-y-1.5">
              {ROOM_SIZES.map((size) => (
                <label key={size} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={sizeFilter[size]}
                    onChange={() => toggleSize(size)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {ROOM_SIZE_LABEL[size]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Search Booking</h2>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="name, meeting..."
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </aside>

        <div className="min-w-0 flex-1 space-y-2">
          {actionError && <p className="text-sm text-red-600">{actionError}</p>}
          {bookingsFetchError && (
            <p className="text-sm text-red-600">Failed to load bookings for this day.</p>
          )}

          {!rooms || rooms.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
              No rooms available yet.
            </div>
          ) : visibleRooms.length === 0 ? (
            <div className="rounded-lg bg-white p-6 text-sm text-gray-500 shadow-sm">
              No rooms match the selected room type filter.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <div className="flex" style={{ minWidth: `${visibleRooms.length * 180 + 64}px` }}>
                <div className="w-16 flex-shrink-0 border-r border-gray-200">
                  <div className="h-10 border-b border-gray-200" />
                  <div className="relative" style={{ height: gridHeight }}>
                    {HOUR_LABELS.map((hour, i) => (
                      <span
                        key={hour}
                        className="absolute right-2 -translate-y-1/2 text-xs text-gray-400"
                        style={{ top: i * HOUR_HEIGHT_PX }}
                      >
                        {formatHourLabel(hour)}
                      </span>
                    ))}
                  </div>
                </div>

                {visibleRooms.map((room) => {
                  const roomBookings = visibleBookings
                    .filter((b) => b.roomId === room.id)
                    .map((b) => layoutBooking(b, dayStart))
                    .filter((layout): layout is BookingLayout => layout !== null);

                  return (
                    <div key={room.id} className="w-[180px] flex-shrink-0 border-r border-gray-200">
                      <div className="flex h-10 items-center justify-center border-b border-gray-200 px-2 text-center text-sm font-medium text-gray-900">
                        {room.name}
                      </div>
                      <div
                        className="relative"
                        style={{
                          height: gridHeight,
                          backgroundImage: `repeating-linear-gradient(to bottom, #e5e7eb 0, #e5e7eb 1px, transparent 1px, transparent ${HOUR_HEIGHT_PX}px)`,
                        }}
                      >
                        {roomBookings.length === 0 && bookingsLoading && (
                          <p className="p-2 text-xs text-gray-400">Loading...</p>
                        )}
                        {roomBookings.map(({ booking, topPercent, heightPercent }) => (
                          <div
                            key={booking.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedBooking(booking)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") setSelectedBooking(booking);
                            }}
                            className="absolute inset-x-1 cursor-pointer overflow-hidden rounded-md border border-blue-300 bg-blue-50 p-1.5 text-left text-xs transition-shadow hover:shadow-md"
                            style={{ top: `${topPercent}%`, height: `${heightPercent}%` }}
                          >
                            <p className="truncate font-medium text-blue-900">{booking.title}</p>
                            <p className="truncate text-blue-700">{booking.userEmail}</p>
                            <p className="truncate text-blue-700">
                              {formatTimeRange(booking.startTime, booking.endTime)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal open={selectedBooking !== null} onClose={() => setSelectedBooking(null)}>
        {selectedBooking && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{selectedBooking.title}</h2>

            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Booked By</dt>
                <dd className="text-right text-gray-900">{selectedBooking.userEmail}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Date</dt>
                <dd className="text-right text-gray-900">{formatDateLabel(selectedBooking.startTime)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Time</dt>
                <dd className="text-right text-gray-900">
                  {formatTimeLabel(selectedBooking.startTime)} - {formatTimeLabel(selectedBooking.endTime)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Room</dt>
                <dd className="text-right text-gray-900">{selectedBooking.roomName}</dd>
              </div>
              {selectedRoom && (
                <>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Size</dt>
                    <dd className="text-right text-gray-900">{ROOM_SIZE_LABEL[selectedRoom.size]}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Capacity</dt>
                    <dd className="text-right text-gray-900">{selectedRoom.capacity} people</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-gray-500">Location</dt>
                    <dd className="text-right text-gray-900">{selectedRoom.location}</dd>
                  </div>
                </>
              )}
            </dl>

            {actionError && <p className="text-sm text-red-600">{actionError}</p>}

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              {user?.role === "admin" && (
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={cancelingId === selectedBooking.id}
                  onClick={() => handleCancel(selectedBooking.id)}
                >
                  Cancel Reservation
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
