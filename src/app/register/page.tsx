"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { registerUser } from "@/lib/api-client";
import type { Program } from "@/types";

const PROGRAM_LABEL: Record<Program, string> = {
  regular: "Regular Program",
  international: "International Program",
  health_data_science: "Health Data Science Program",
};

export default function RegisterPage() {
  const { user, loading, login } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [program, setProgram] = useState<Program>("regular");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in - skip straight to the app.
  useEffect(() => {
    if (!loading && user) {
      router.replace("/home");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await registerUser({ name, studentId, email, password, program });
      // Registration doesn't sign the browser in on its own, so log in right after
      // with the same credentials the user just chose.
      await login(email, password);
      router.push("/home");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register");
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
    <div className="flex min-h-screen items-center justify-center bg-gray-50 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-center text-gray-900">Create Account</h1>

        <Input
          id="name"
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <Input
          id="studentId"
          label="Student ID"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
          required
        />

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
          minLength={6}
          required
        />

        <Select
          id="program"
          label="Program"
          value={program}
          onChange={(e) => setProgram(e.target.value as Program)}
          required
        >
          {(Object.keys(PROGRAM_LABEL) as Program[]).map((value) => (
            <option key={value} value={value}>
              {PROGRAM_LABEL[value]}
            </option>
          ))}
        </Select>

        {error && <p className="text-sm text-red-600 text-center">{error}</p>}

        <Button type="submit" loading={submitting} className="w-full">
          Register
        </Button>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Sign In
          </Link>
        </p>
      </form>
    </div>
  );
}
