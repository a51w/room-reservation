"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { fetchUsers, setUserRole } from "@/lib/api-client";
import { PROGRAM_LABEL } from "@/lib/constants";

export default function ManageUsersPage() {
  const { user: currentUser } = useAuth();
  const { data: users, isLoading, error, mutate } = useSWR("admin-users", fetchUsers);

  const [search, setSearch] = useState("");
  const [togglingUid, setTogglingUid] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  const searchLower = search.trim().toLowerCase();
  const visibleUsers = (users ?? []).filter((u) => {
    if (!searchLower) return true;
    return (
      (u.email ?? "").toLowerCase().includes(searchLower) ||
      (u.name ?? "").toLowerCase().includes(searchLower) ||
      (u.studentId ?? "").toLowerCase().includes(searchLower)
    );
  });

  const handleToggleRole = async (uid: string, nextRole: "admin" | "normal_user") => {
    setTogglingUid(uid);
    setToggleError(null);
    try {
      await setUserRole(uid, nextRole);
      await mutate();
    } catch (err) {
      setToggleError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setTogglingUid(null);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, email, or student ID..."
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {toggleError && <p className="text-sm text-red-600">{toggleError}</p>}
      {error && <p className="text-sm text-red-600">Failed to load users.</p>}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : visibleUsers.length === 0 ? (
        <p className="text-sm text-gray-500">No users match your search.</p>
      ) : (
        <div className="space-y-2">
          {visibleUsers.map((u) => {
            const isSelf = u.uid === currentUser?.uid;
            return (
              <div key={u.uid} className="flex items-center justify-between gap-4 rounded-lg bg-white p-4 shadow-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">
                    {u.name ?? u.email ?? u.uid}
                    {isSelf && <span className="ml-2 text-xs font-normal text-gray-400">(You)</span>}
                    {u.role === "admin" && (
                      <span className="ml-2 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                        Admin
                      </span>
                    )}
                  </p>
                  <p className="truncate text-sm text-gray-500">{u.email}</p>
                  <p className="truncate text-sm text-gray-500">
                    {u.studentId ?? "No student ID on file"}
                    {u.program && ` · ${PROGRAM_LABEL[u.program]}`}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  {isSelf ? (
                    <Button variant="secondary" disabled>
                      Can&apos;t edit self
                    </Button>
                  ) : u.role === "admin" ? (
                    <Button
                      variant="danger"
                      loading={togglingUid === u.uid}
                      onClick={() => handleToggleRole(u.uid, "normal_user")}
                    >
                      Remove Admin
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      loading={togglingUid === u.uid}
                      onClick={() => handleToggleRole(u.uid, "admin")}
                    >
                      Make Admin
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
