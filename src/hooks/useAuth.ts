"use client";

import { useEffect, useState, useCallback } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import type { AppUser, UserRole } from "@/types";

interface UseAuthReturn {
  user: AppUser | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// Reads the "role" custom claim off the Firebase user and assembles an AppUser.
// Pulled into its own function because it runs every time auth state changes.
async function toAppUser(firebaseUser: FirebaseUser): Promise<AppUser> {
  const tokenResult = await firebaseUser.getIdTokenResult();
  const role = (tokenResult.claims.role as UserRole) ?? "normal_user";

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    role,
  };
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // onAuthStateChanged keeps listening for login/logout, so individual pages
    // don't need to run their own manual auth checks.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(await toAppUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // No need to setUser here; onAuthStateChanged above will trigger on its own
    } catch (err) {
      setError(getAuthErrorMessage(err));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return { user, loading, error, login, logout };
}

// Converts a Firebase error code into a readable message.
// Reusable anywhere an auth error surfaces, so we don't repeat the switch-case.
function getAuthErrorMessage(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case "auth/invalid-email":
      return "Invalid email address";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later";
    default:
      return "Something went wrong. Please try again";
  }
}
