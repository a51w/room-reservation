"use client";

import { useAuth } from "@/hooks/useAuth";

// Client-side gate for admin-only pages (Manage Rooms, and future Global Booking
// Management). Like the (app) auth guard, this is a UX convenience, not a security
// boundary - every admin-only API route re-checks the role server-side regardless.
export function AdminOnly({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  if (user?.role !== "admin") {
    return (
      <div className="rounded-lg bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
        You need admin access to view this page.
      </div>
    );
  }

  return <>{children}</>;
}
