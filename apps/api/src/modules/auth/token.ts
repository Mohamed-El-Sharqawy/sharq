// SPEC §10.2 — session token material: a 256-bit random token is handed to
// the client (cookie), only its SHA-256 digest is stored (sessions.token_hash
// is that hex, unique-indexed). A leaked DB row therefore never leaks a
// usable credential.
import { createHash, randomBytes } from "node:crypto";

/** 256 bits of entropy as 43 unpadded base64url chars (cookie-safe). */
export function generateSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
