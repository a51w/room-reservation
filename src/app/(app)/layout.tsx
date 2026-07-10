"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { AppNav } from "@/components/AppNav";

// Client-side guard: redirects signed-out visitors to /login. This is a UX convenience,
// not a security boundary — every API route re-checks the ID token server-side regardless.
// Stronger server-side route protection (middleware) is planned as its own feature.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Navigate immediately rather than awaiting logout() - by the time the auth state
  // change actually lands, we're already off this layout, so its own redirect-to-/login
  // effect above never gets a chance to fire and flash /login before landing on /.
  const handleSignOut = () => {
    logout();
    router.push("/");
  };

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-gray-50">
      <AppNav user={user} onSignOut={handleSignOut} />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
