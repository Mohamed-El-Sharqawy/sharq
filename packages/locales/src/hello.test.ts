// CHORE wiring spec — proves bun:test executes TypeScript specs and resolves
// the workspace entrypoint (TESTING §2.1). TEMP: deleted when Phase 1 replaces
// the placeholder entrypoint (tracked in PROGRESS).
import { describe, expect, it } from "bun:test";
import * as pkg from "./index";

describe("CHORE · bun:test wiring", () => {
  it("runs a TypeScript spec against the package entrypoint", () => {
    expect((pkg as Record<string, unknown>).runnerInfo).toBe("bun");
  });
});
