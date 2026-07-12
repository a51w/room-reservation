"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/useAuth";
import { AppNav } from "@/components/AppNav";

// This layout wraps all pages in the "(app)" folder, which are the pages that require authentication. It checks if the user is authenticated and redirects to the login page if not. It also provides a sign-out button in the navigation bar.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  // Handle sign-out by calling the logout function from the useAuth hook and redirecting to the login page.
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
