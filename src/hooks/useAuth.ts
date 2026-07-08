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

// อ่าน custom claim "role" จาก Firebase user แล้วประกอบเป็น AppUser
// แยกเป็นฟังก์ชันเดี่ยวเพราะจะถูกเรียกทุกครั้งที่ auth state เปลี่ยน
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
    // onAuthStateChanged คอย listen ตลอดว่า login/logout เมื่อไหร่
    // ไม่ต้องเรียก manual check เองในแต่ละหน้า
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
      // ไม่ต้อง setUser ที่นี่ เพราะ onAuthStateChanged ข้างบนจะ trigger เอง
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

// แปลง Firebase error code เป็นข้อความอ่านง่าย
// เรียกซ้ำได้ทุกจุดที่มี auth error เกิดขึ้น ไม่ต้องเขียน switch-case ซ้ำ
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
