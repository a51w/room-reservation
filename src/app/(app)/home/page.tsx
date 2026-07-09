"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

const ACTIONS = [
  {
    href: "/book",
    title: "Book a Room",
    description: "Reserve a meeting room for a specific date and time.",
  },
  {
    href: "/my-bookings",
    title: "My Bookings",
    description: "View and cancel your upcoming reservations.",
  },
  {
    href: "/calendar",
    title: "Calendar Dashboard",
    description: "See which rooms are booked and when, at a glance.",
  },
  {
    href: "/status",
    title: "Real-time Room Status",
    description: "Check which rooms are free or occupied right now.",
  },
];

const ADMIN_ACTIONS = [
  {
    href: "/admin/rooms",
    title: "Manage",
    description: "Add, edit, or remove rooms, and manage who has admin access.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const actions = user?.role === "admin" ? [...ACTIONS, ...ADMIN_ACTIONS] : ACTIONS;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Welcome</h1>
      <div className="grid gap-4 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="block rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
          >
            <h2 className="text-lg font-medium text-gray-900">{action.title}</h2>
            <p className="mt-1 text-sm text-gray-500">{action.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
