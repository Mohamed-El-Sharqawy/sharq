// SPEC §10.2 — credentials are hashed with argon2id via Bun.password.
// These wrappers are the only place password KDF happens, so the algorithm
// stays pinned in exactly one file (the §9.1 ban keeps Bun imports inside
// apps/api; seed.ts and these tests are the other sanctioned users).
export function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, { algorithm: "argon2id" });
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  try {
    return await Bun.password.verify(password, hash);
  } catch {
    // A malformed/corrupt stored hash is not a match — it must never turn
    // into a 500 on the login or change-password path.
    return false;
  }
}
