// lib/pg — the DrizzleQueryError cause walker. Pins the row-3 defect fix:
// postgres.js names the backend constraint field constraint_name (drizzle
// wraps the driver error), and BOTH spellings must map or the designed
// duplicate/overlap outcomes rethrow as 500s.
import { describe, expect, it } from "bun:test";
import { pgErrorInfo } from "../../../src/lib/pg";

describe("lib/pg · pgErrorInfo walks to the driver error", () => {
  it("given a postgres.js-shaped error, when read, then code and constraint_name are surfaced", () => {
    const info = pgErrorInfo({
      code: "23505",
      constraint_name: "users_username_unique",
    });
    expect(info).toEqual({
      code: "23505",
      constraint: "users_username_unique",
    });
  });

  it("given a drizzle-wrapped driver error, when read, then the cause chain is walked", () => {
    const wrapped = { message: "Failed query", cause: { code: "23P01" } };
    expect(pgErrorInfo(wrapped)).toMatchObject({ code: "23P01" });
  });

  it("given a plain error with no pg fields, when read, then the info is empty", () => {
    expect(pgErrorInfo(new Error("boom"))).toEqual({});
  });
});
