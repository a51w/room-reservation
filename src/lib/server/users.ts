import { FieldValue, type Timestamp, type DocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { Program, UserProfile } from "@/types";

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
