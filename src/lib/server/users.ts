import { FieldValue, type Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { AdminUserSummary, Program, UserProfile, UserRole } from "@/types";

const usersCollection = adminDb.collection("users");

function toUserProfile(doc: DocumentSnapshot): UserProfile {
  const data = doc.data()!;
  return {
    uid: doc.id,
    name: data.name,
    studentId: data.studentId,
    email: data.email,
    program: data.program,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  };
}

export interface CreateUserProfileInput {
  uid: string;
  name: string;
  studentId: string;
  email: string;
  program: Program;
}

// Keyed by uid (same id as the Firebase Auth user) so it's a 1:1 lookup, not a query.
export async function createUserProfile(input: CreateUserProfileInput): Promise<UserProfile> {
  const ref = usersCollection.doc(input.uid);
  await ref.set({
    name: input.name,
    studentId: input.studentId,
    email: input.email,
    program: input.program,
    createdAt: FieldValue.serverTimestamp(),
  });
  const doc = await ref.get();
  return toUserProfile(doc);
}

// Joins Firebase Auth accounts (uid/email/role claim) with the Firestore profile when
// one exists. Admin-created accounts predate self-registration and have no profile doc,
// so name/studentId/program come back null for those rather than failing the whole list.
export async function listUserSummaries(): Promise<AdminUserSummary[]> {
  const [authResult, profilesSnapshot] = await Promise.all([
    adminAuth.listUsers(1000),
    usersCollection.get(),
  ]);

  const profileByUid = new Map(profilesSnapshot.docs.map((doc) => [doc.id, doc.data()]));

  return authResult.users
    .map((user) => {
      const profile = profileByUid.get(user.uid);
      return {
        uid: user.uid,
        email: user.email ?? null,
        role: (user.customClaims?.role as UserRole | undefined) ?? "normal_user",
        name: profile?.name ?? null,
        studentId: profile?.studentId ?? null,
        program: profile?.program ?? null,
      };
    })
    .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""));
}

export async function setUserRole(uid: string, role: UserRole): Promise<void> {
  await adminAuth.setCustomUserClaims(uid, { role });
}

// Used when an admin books a room on behalf of another user - resolves the email they typed
// to an actual account server-side, so it's always checked against live data rather than
// a user list that may be stale or not yet loaded in their browser.
export async function getUserBasicInfoByEmail(email: string): Promise<{ uid: string; email: string | null } | null> {
  try {
    const record = await adminAuth.getUserByEmail(email);
    return { uid: record.uid, email: record.email ?? null };
  } catch {
    return null;
  }
}
