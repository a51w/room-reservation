"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/hooks/useAuth";
import { cancelBooking, fetchBookings, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";
import { formatDateLabel, formatDateTimeRange, formatTimeLabel } from "@/lib/date-utils";
import type { Booking } from "@/types";

interface GroupedBookings {
  upcoming: Booking[];
  past: Booking[];
}

// Runs as an SWR fetcher (outside render), so calling Date.now() here to split the
// list is fine — the component itself never calls it, keeping render pure.
async function fetchGroupedBookings(userId: string): Promise<GroupedBookings> {
  const bookings = await fetchBookings({ userId });
  const now = Date.now();
  return {
    upcoming: bookings.filter((b) => new Date(b.endTime).getTime() >= now),
    past: bookings.filter((b) => new Date(b.endTime).getTime() < now),
  };
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    user ? ["my-bookings", user.uid] : null,
    () => fetchGroupedBookings(user!.uid)
  );
  const { data: rooms, isLoading: roomsLoading } = useSWR("rooms", fetchRooms);

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const loadError = error instanceof Error ? error.message : error ? "Failed to load bookings" : null;
  const selectedRoom = rooms?.find((room) => room.id === selectedBooking?.roomId) ?? null;

  const handleCancel = async (bookingId: string) => {
    setCancelingId(bookingId);
    setCancelError(null);
    try {
      await cancelBooking(bookingId);
      await mutate();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-semibold text-gray-900">My Bookings</h1>

      {(loadError || cancelError) && (
        <p className="text-sm text-red-600">{loadError ?? cancelError}</p>
      )}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-gray-900">Upcoming</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming bookings.</p>
            ) : (
              upcoming.map((booking) => (
                <div
                  key={booking.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedBooking(booking)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setSelectedBooking(booking);
                  }}
                  className="flex w-full cursor-pointer items-center justify-between rounded-lg bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomName} · {formatDateTimeRange(booking.startTime, booking.endTime)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    loading={cancelingId === booking.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancel(booking.id);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ))
            )}
          </section>

          {past.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-medium text-gray-900">Past</h2>
              {past.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="flex w-full items-center justify-between rounded-lg bg-gray-100 p-4 text-left opacity-70 transition-opacity hover:opacity-100"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomName} · {formatDateTimeRange(booking.startTime, booking.endTime)}
                    </p>
                  </div>
                </button>
              ))}
            </section>
          )}
        </>
      )}

      <Modal open={selectedBooking !== null} onClose={() => setSelectedBooking(null)}>
        {selectedBooking && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">{selectedBooking.title}</h2>

            <dl className="space-y-2 text-sm">
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
              {selectedRoom ? (
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
              ) : roomsLoading ? (
                <p className="text-gray-500">Loading room details...</p>
              ) : (
                <p className="text-gray-500">Room details are no longer available.</p>
              )}
            </dl>

            <Button variant="secondary" className="w-full" onClick={() => setSelectedBooking(null)}>
              Close
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
