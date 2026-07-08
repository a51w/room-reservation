import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import type { UserRole } from "../src/types";

async function main() {
  // Must be a dynamic import so dotenv.config() has actually run before admin.ts
  // gets initialized (works around ESM import hoisting)
  const { adminAuth } = await import("../src/lib/firebase/admin");

  const [, , email, role] = process.argv;

  if (!email || !role) {
    console.error("Usage: npm run set-role -- <email> <admin|normal_user>");
    process.exit(1);
  }

  if (role !== "admin" && role !== "normal_user") {
    console.error('Role must be "admin" or "normal_user"');
    process.exit(1);
  }

  const user = await adminAuth.getUserByEmail(email);
  await adminAuth.setCustomUserClaims(user.uid, { role: role as UserRole });
  console.log(`Set role "${role}" for ${email} (uid: ${user.uid})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Failed:", err.message);
    process.exit(1);
  });