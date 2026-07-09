"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { cancelBooking, fetchBookings, fetchRooms } from "@/lib/api-client";
import { ROOM_SIZE_LABEL } from "@/lib/constants";
import { formatDateLabel, formatDateTimeRange, formatTimeLabel } from "@/lib/date-utils";
import type { Booking } from "@/types";

interface GroupedBookings {
  upcoming: Booking[];
  past: Booking[];
}

// Runs as an SWR fetcher (outside render), so calling Date.now() here to split the
// list is fine - the component itself never calls it, keeping render pure.
async function fetchGroupedBookings(): Promise<GroupedBookings> {
  const bookings = await fetchBookings();
  const now = Date.now();
  return {
    upcoming: bookings.filter((b) => new Date(b.endTime).getTime() >= now),
    past: bookings.filter((b) => new Date(b.endTime).getTime() < now).reverse(),
  };
}

export default function ManageBookingsPage() {
  const [search, setSearch] = useState("");
  const [roomFilter, setRoomFilter] = useState("all");
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const { data, isLoading, error, mutate } = useSWR("admin-bookings", fetchGroupedBookings);
  const { data: rooms } = useSWR("rooms", fetchRooms);

  const searchLower = search.trim().toLowerCase();
  const matchesFilters = (booking: Booking) => {
    if (roomFilter !== "all" && booking.roomId !== roomFilter) return false;
    if (!searchLower) return true;
    return (
      booking.title.toLowerCase().includes(searchLower) ||
      (booking.userEmail ?? "").toLowerCase().includes(searchLower)
    );
  };

  const upcoming = (data?.upcoming ?? []).filter(matchesFilters);
  const past = (data?.past ?? []).filter(matchesFilters);
  const loadError = error instanceof Error ? error.message : error ? "Failed to load bookings" : null;
  const selectedRoom = rooms?.find((room) => room.id === selectedBooking?.roomId) ?? null;

  const handleCancel = async (bookingId: string) => {
    setCancelingId(bookingId);
    setActionError(null);
    try {
      await cancelBooking(bookingId);
      await mutate();
      setSelectedBooking(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to cancel booking");
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-lg bg-white p-4 shadow-sm sm:grid-cols-2">
        <Input
          id="bookingSearch"
          label="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="title or user email..."
        />
        <Select
          id="bookingRoomFilter"
          label="Room"
          value={roomFilter}
          onChange={(e) => setRoomFilter(e.target.value)}
        >
          <option value="all">All Rooms</option>
          {rooms?.map((room) => (
            <option key={room.id} value={room.id}>
              {room.name}
            </option>
          ))}
        </Select>
      </div>

      {(loadError || actionError) && <p className="text-sm text-red-600">{loadError ?? actionError}</p>}

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-medium text-gray-900">Upcoming ({upcoming.length})</h2>
            {upcoming.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming bookings match.</p>
            ) : (
              upcoming.map((booking) => (
                <button
                  key={booking.id}
                  type="button"
                  onClick={() => setSelectedBooking(booking)}
                  className="flex w-full items-center justify-between rounded-lg bg-white p-4 text-left shadow-sm transition-shadow hover:shadow-md"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomName} · {formatDateTimeRange(booking.startTime, booking.endTime)}
                    </p>
                    <p className="text-xs text-gray-400">{booking.userEmail}</p>
                  </div>
                </button>
              ))
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-medium text-gray-900">Past ({past.length})</h2>
            {past.length === 0 ? (
              <p className="text-sm text-gray-500">No past bookings match.</p>
            ) : (
              past.map((booking) => (
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
                    <p className="text-xs text-gray-400">{booking.userEmail}</p>
                  </div>
                </button>
              ))
            )}
          </section>
        </>
      )}

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

            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={() => setSelectedBooking(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                loading={cancelingId === selectedBooking.id}
                onClick={() => handleCancel(selectedBooking.id)}
              >
                Cancel Reservation
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
