// Row 12 — §10.7 env boot: TypeBox-validated fail-fast parseEnv. All keys
// the service consumes are schema'd; every bad value must fail the boot
// naming its key (never a runtime surprise three requests later).
import { describe, expect, it } from "bun:test";
import { parseEnv } from "../../../src/lib/env";

const VALID = {
  DATABASE_URL: "postgresql://sharq:sharq@localhost:5433/sharq",
};

describe("parseEnv · happy paths", () => {
  it("accepts a full valid env and returns it typed", () => {
    const env = parseEnv({
      ...VALID,
      PORT: "3001",
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
      RATE_LIMIT_AUTH_PER_MIN: "30",
      RATE_LIMIT_WRITES_PER_MIN: "60",
      RATE_LIMIT_READS_PER_MIN: "600",
    });
    expect(env).toEqual({
      DATABASE_URL: VALID.DATABASE_URL,
      PORT: 3001,
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
      RATE_LIMIT_AUTH_PER_MIN: 30,
      RATE_LIMIT_WRITES_PER_MIN: 60,
      RATE_LIMIT_READS_PER_MIN: 600,
    });
  });

  it("applies the §10.7 defaults when only DATABASE_URL is set", () => {
    const env = parseEnv(VALID);
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.LOG_LEVEL).toBe("info");
    expect(env.RATE_LIMIT_AUTH_PER_MIN).toBe(10);
    expect(env.RATE_LIMIT_WRITES_PER_MIN).toBe(120);
    expect(env.RATE_LIMIT_READS_PER_MIN).toBe(300);
  });
});

describe("parseEnv · fail fast, naming every bad key", () => {
  it("throws on a missing DATABASE_URL", () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it("throws on an empty DATABASE_URL", () => {
    expect(() => parseEnv({ DATABASE_URL: "" })).toThrow(/DATABASE_URL/);
  });

  it("throws on a non-numeric PORT, naming PORT", () => {
    expect(() => parseEnv({ ...VALID, PORT: "abc" })).toThrow(/PORT/);
  });

  it("throws on an out-of-range PORT", () => {
    expect(() => parseEnv({ ...VALID, PORT: "0" })).toThrow(/PORT/);
    expect(() => parseEnv({ ...VALID, PORT: "70000" })).toThrow(/PORT/);
  });

  it("throws on an unknown NODE_ENV / LOG_LEVEL", () => {
    expect(() => parseEnv({ ...VALID, NODE_ENV: "staging" })).toThrow(
      /NODE_ENV/,
    );
    expect(() => parseEnv({ ...VALID, LOG_LEVEL: "loud" })).toThrow(
      /LOG_LEVEL/,
    );
  });

  it("throws on rate-limit buckets outside 1..1000", () => {
    expect(() => parseEnv({ ...VALID, RATE_LIMIT_AUTH_PER_MIN: "0" })).toThrow(
      /RATE_LIMIT_AUTH_PER_MIN/,
    );
    expect(() =>
      parseEnv({ ...VALID, RATE_LIMIT_READS_PER_MIN: "9999" }),
    ).toThrow(/RATE_LIMIT_READS_PER_MIN/);
  });

  it("reports every offending key at once, not just the first", () => {
    try {
      parseEnv({ PORT: "abc", LOG_LEVEL: "loud" });
      throw new Error("expected parseEnv to throw");
    } catch (error) {
      const message = String(error);
      expect(message).toContain("PORT");
      expect(message).toContain("LOG_LEVEL");
    }
  });
});
