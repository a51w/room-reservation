"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { user, loading, login, error } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Already signed in (e.g. navigated back here manually) - skip straight to the app.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      router.push("/home");
    } catch {
      // error handled in useAuth
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 bg-white p-8 rounded-lg shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-center text-gray-900">Sign In</h1>

        <Input
          id="email"
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <Button type="submit" loading={submitting} className="w-full">
          Sign In
        </Button>

        <p className="text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
