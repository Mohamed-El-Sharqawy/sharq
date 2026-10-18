// SPEC §10.2 — lockout: 5 consecutive failures → 15 minutes, audited (the
// audit emission lives in the service; this module is the counter).
// The numbers are stated verbatim in §10.2 and are NOT §5.2 settings keys,
// so per the working rule they are fixed in code with this citation.
// Storage is a port: §7 defines no lockout table, so v1 ships an in-process
// memory store — a restart clears brute-force counters, acceptable for an
// internal, admin-provisioned tool (the login route's 10/min rate limit is
// the second, per-request layer, §10.6).
export const LOCKOUT_MAX_FAILURES = 5;
export const LOCKOUT_MINUTES = 15;

export interface LockoutStore {
  /** True while the identifier is locked out at instant `now`. */
  isLocked(identifier: string, now: Date): boolean;
  /** When the current lock ends (null = not locked). */
  lockedUntil(identifier: string): Date | null;
  /** Count one failed attempt at `now`; a live lock is not extended. */
  recordFailure(identifier: string, now: Date): void;
  /** Clear the counter after a successful login. */
  reset(identifier: string): void;
}

type Entry = { count: number; lockedUntil: Date | null };

export function createMemoryLockoutStore(): LockoutStore {
  // Reads never allocate entries — only failures do (an identifier scanner
  // must not grow the map via isLocked probes).
  const entries = new Map<string, Entry>();

  return {
    isLocked(identifier, now) {
      const until = entries.get(identifier)?.lockedUntil ?? null;
      return until !== null && now < until;
    },

    lockedUntil(identifier) {
      return entries.get(identifier)?.lockedUntil ?? null;
    },

    recordFailure(identifier, now) {
      const entry = entries.get(identifier) ?? { count: 0, lockedUntil: null };
      entries.set(identifier, entry);
      if (entry.lockedUntil !== null && now < entry.lockedUntil) return; // frozen while locked
      entry.count += 1;
      if (entry.count >= LOCKOUT_MAX_FAILURES) {
        entry.lockedUntil = new Date(now.getTime() + LOCKOUT_MINUTES * 60_000);
        entry.count = 0; // once the lock lapses, counting starts fresh
      }
    },

    reset(identifier) {
      entries.delete(identifier);
    },
  };
}
