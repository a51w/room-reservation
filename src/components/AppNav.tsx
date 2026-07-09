"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { AppUser } from "@/types";

const NAV_LINKS = [
  { href: "/book", label: "Book a Room" },
  { href: "/my-bookings", label: "My Bookings" },
  { href: "/calendar", label: "Calendar" },
  { href: "/status", label: "Room Status" },
];

const ADMIN_NAV_LINKS = [{ href: "/admin/rooms", label: "Manage" }];

interface AppNavProps {
  user: AppUser;
  onSignOut: () => void;
}

export function AppNav({ user, onSignOut }: AppNavProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/home" className="font-semibold text-gray-900">
            CPE Room Reservation
          </Link>
          <nav className="flex items-center gap-4">
            {[...NAV_LINKS, ...(user.role === "admin" ? ADMIN_NAV_LINKS : [])].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium ${
                  pathname === link.href ? "text-blue-600" : "text-gray-600 hover:text-gray-900"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-900">
            {user.name ?? user.email}
            {user.role === "admin" && (
              <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                Admin
              </span>
            )}
          </span>
          <Button variant="secondary" onClick={onSignOut}>
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
