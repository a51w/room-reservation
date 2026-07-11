import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // firebase-admin is already auto-externalized by Next.js, but its jwks-rsa -> jose
  // dependency chain still fails at runtime with ERR_REQUIRE_ESM when Next tries to
  // load it as an external module (jose ships ESM-only). Externalizing them explicitly
  // too routes them through native Node require instead of Next's external-module loader.
  serverExternalPackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;
