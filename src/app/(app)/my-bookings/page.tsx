"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { cancelBooking, fetchBookings } from "@/lib/api-client";
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

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const dateLabel = start.toLocaleDateString(undefined, {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const timeLabel = `${start.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`;
  return `${dateLabel} · ${timeLabel}`;
}

export default function MyBookingsPage() {
  const { user } = useAuth();
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const { data, isLoading, error, mutate } = useSWR(
    user ? ["my-bookings", user.uid] : null,
    () => fetchGroupedBookings(user!.uid)
  );

  const upcoming = data?.upcoming ?? [];
  const past = data?.past ?? [];
  const loadError = error instanceof Error ? error.message : error ? "Failed to load bookings" : null;

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
                  className="flex items-center justify-between rounded-lg bg-white p-4 shadow-sm"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomName} · {formatRange(booking.startTime, booking.endTime)}
                    </p>
                  </div>
                  <Button
                    variant="danger"
                    loading={cancelingId === booking.id}
                    onClick={() => handleCancel(booking.id)}
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
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg bg-gray-100 p-4 opacity-70"
                >
                  <div>
                    <p className="font-medium text-gray-900">{booking.title}</p>
                    <p className="text-sm text-gray-500">
                      {booking.roomName} · {formatRange(booking.startTime, booking.endTime)}
                    </p>
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
