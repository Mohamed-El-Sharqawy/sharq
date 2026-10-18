// SPEC §10.2 — session token material: a 256-bit random token is handed to
// the client, only its SHA-256 hash is stored. The vectors here pin both
// halves so a weak token or a non-hex digest fails fast in units.
import { describe, expect, it } from "bun:test";
import {
  generateSessionToken,
  sha256Hex,
} from "../../../src/modules/auth/token";

describe("SPEC §10.2 · session token (256-bit random, SHA-256 stored)", () => {
  it("given a generated token, when decoded, then it carries exactly 32 bytes of entropy", () => {
    const token = generateSessionToken();
    expect(Buffer.from(token, "base64url").byteLength).toBe(32);
  });

  it("given a generated token, when formatted, then it is 43 unpadded base64url chars (cookie-safe)", () => {
    expect(generateSessionToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it("given two generated tokens, when compared, then they differ", () => {
    expect(generateSessionToken()).not.toBe(generateSessionToken());
  });

  it("given a known input, when hashed, then sha256Hex matches the reference vector", () => {
    expect(sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
});
