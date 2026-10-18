// CHORE wiring spec — proves bun:test executes in apps/api and resolves the
// service entrypoint (TESTING §2.1). TEMP: replaced by real service tests in
// Phase 1 (tracked in PROGRESS).
import { describe, expect, it } from "bun:test";
import * as pkg from "../src/index";

describe("CHORE · bun:test wiring (apps/api)", () => {
  it("runs a TypeScript spec against the api entrypoint", () => {
    expect((pkg as Record<string, unknown>).runnerInfo).toBe("bun");
  });
});
