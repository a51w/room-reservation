"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AdminOnly } from "@/components/AdminOnly";

const ADMIN_TABS = [
  { href: "/admin/rooms", label: "Rooms" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/users", label: "Users" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AdminOnly>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Manage</h1>
          <nav className="mt-3 flex gap-4 border-b border-gray-200">
            {ADMIN_TABS.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className={`border-b-2 pb-2 text-sm font-medium ${
                  pathname === tab.href
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-900"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
        {children}
      </div>
    </AdminOnly>
  );
}
