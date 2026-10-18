// FR-AUTH-01 — credential hashing contract. SPEC §10.2 pins the algorithm:
// argon2id via Bun.password. Unit scope exercises the real Bun.password (no
// mock can prove the algorithm); three real KDF calls per spec, ~100ms.
import { describe, expect, it } from "bun:test";
import {
  hashPassword,
  verifyPassword,
} from "../../../src/modules/auth/password";

describe("FR-AUTH-01 · password hashing (SPEC §10.2 argon2id)", () => {
  it("given a password, when hashed, then the hash is argon2id and verifies against the password", async () => {
    const hash = await hashPassword("Sharq#2026");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword("Sharq#2026", hash)).toBe(true);
  });

  it("given a wrong password, when verified against a stored hash, then it fails", async () => {
    const hash = await hashPassword("Sharq#2026");
    expect(await verifyPassword("not-the-password", hash)).toBe(false);
  });

  it("given the same password twice, when hashed, then the salts differ (no reusable hashes)", async () => {
    const a = await hashPassword("Sharq#2026");
    const b = await hashPassword("Sharq#2026");
    expect(a).not.toBe(b);
  });
});
