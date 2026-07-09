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
      <div className="mx-auto max-w-4xl px-4">
        {/* Brand + account row stays on one line on its own, independent of how many
            nav links exist below it - those wrap freely without pushing this row down. */}
        <div className="flex items-center justify-between gap-3 py-3">
          <Link href="/home" className="flex-shrink-0 font-semibold text-gray-900">
            CPE Room Reservation
          </Link>

          <div className="flex flex-shrink-0 items-center gap-3">
            <span className="whitespace-nowrap text-sm font-medium text-gray-900">
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

        <nav className="flex flex-wrap items-center gap-4 border-t border-gray-100 py-2">
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
    </header>
  );
}
