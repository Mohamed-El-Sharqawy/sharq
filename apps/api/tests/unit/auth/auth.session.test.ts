// FR-AUTH-03 — the idle-expiry math as pure functions. SPEC §10.2: the idle
// timeout comes from security.sessionIdleMinutes; every authenticated call
// slides the window (lastSeenAt → now, expiresAt recomputed). Boundary
// semantics are pinned here: the exact expiry minute is already expired.
import { describe, expect, it } from "bun:test";
import {
  isSessionExpired,
  sessionExpiry,
} from "../../../src/modules/auth/service";
import { T0, minutes } from "./helpers";

describe("FR-AUTH-03 · session idle expiry math", () => {
  it("given lastSeenAt and the idle setting, when expiry is derived, then it is lastSeenAt + idleMinutes", () => {
    expect(sessionExpiry(T0, 240).getTime()).toBe(T0.getTime() + minutes(240));
  });

  it("given now strictly before expiresAt, when checked, then the session is still live", () => {
    const expiresAt = sessionExpiry(T0, 240);
    const justBefore = new Date(T0.getTime() + minutes(239));
    expect(isSessionExpired({ expiresAt }, justBefore)).toBe(false);
  });

  it("given now exactly at expiresAt, when checked, then the session is expired (boundary inclusive)", () => {
    const expiresAt = sessionExpiry(T0, 240);
    expect(isSessionExpired({ expiresAt }, expiresAt)).toBe(true);
  });
});
