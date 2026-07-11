"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { fetchMyProfile } from "@/lib/api-client";
import { PROGRAM_LABEL } from "@/lib/constants";
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
  const [showProfile, setShowProfile] = useState(false);

  // The name collected at registration is the source of truth; fall back to the Auth
  // display name (set from the same field at signup) and then email while it loads,
  // so nothing flashes empty on first render.
  const { data: profile } = useSWR("my-profile", fetchMyProfile);
  const displayName = profile?.name ?? user.name ?? user.email;

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
            <button
              type="button"
              onClick={() => setShowProfile(true)}
              className="whitespace-nowrap text-sm font-medium text-gray-900 hover:text-blue-600"
            >
              {displayName}
              {user.role === "admin" && (
                <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                  Admin
                </span>
              )}
            </button>
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

      <Modal open={showProfile} onClose={() => setShowProfile(false)}>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">{displayName}</h2>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="text-right text-gray-900">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Role</dt>
              <dd className="text-right text-gray-900">{user.role === "admin" ? "Admin" : "Normal User"}</dd>
            </div>
            {profile?.studentId && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Student ID</dt>
                <dd className="text-right text-gray-900">{profile.studentId}</dd>
              </div>
            )}
            {profile?.program && (
              <div className="flex justify-between gap-4">
                <dt className="text-gray-500">Program</dt>
                <dd className="text-right text-gray-900">{PROGRAM_LABEL[profile.program]}</dd>
              </div>
            )}
          </dl>

          <Button variant="secondary" className="w-full" onClick={() => setShowProfile(false)}>
            Close
          </Button>
        </div>
      </Modal>
    </header>
  );
}
