// Row 12 — the error-envelope message wiring: apiError (and every helper
// built on it) carries the §10.4 Arabic message from @sharq/locales — the
// one home for interface strings (SPEC §9). Codes/statuses were pinned by
// the row-10 contract suites; these units pin the message side.
import { describe, expect, it } from "bun:test";
import { API_ERROR_MESSAGES } from "@sharq/locales";
import { apiError } from "../../../src/lib/errors";

describe("apiError · Arabic message wiring (§10.4 via @sharq/locales)", () => {
  it("every envelope message equals the locales map entry", () => {
    for (const [code, message] of Object.entries(API_ERROR_MESSAGES)) {
      const envelope = apiError(code as never);
      expect(envelope.error.message, code).toBe(message);
    }
  });

  it("carries details and meta untouched alongside the message", () => {
    const envelope = apiError("RATE_LIMITED", undefined, {
      retryAfterSeconds: 900,
    });
    expect(envelope.error).toEqual({
      code: "RATE_LIMITED",
      message: API_ERROR_MESSAGES.RATE_LIMITED,
      details: undefined,
      meta: { retryAfterSeconds: 900 },
    });
  });

  it("the wrong-current-password detail keeps its Arabic envelope (FR-AUTH-07)", () => {
    const envelope = apiError("VALIDATION_FAILED", { field: "current" });
    expect(envelope.error.message).toBe(API_ERROR_MESSAGES.VALIDATION_FAILED);
    expect(envelope.error.details).toEqual({ field: "current" });
  });
});
