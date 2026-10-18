// SPEC §10.7 — TypeBox-validated fail-fast env boot. Every key the
// service consumes is schema'd; parseEnv throws at startup naming every
// offending key (never a runtime surprise mid-request). §5.2 defines no
// env settings — the defaults below are fixed in code with §10.7 as the
// citation (10/120/300 buckets; port 3000; level info; development).
import { type Static, Type } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";

const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"].map(
  (level) => Type.Literal(level),
);

const EnvSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  PORT: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 65535, default: 3000 }),
  ),
  NODE_ENV: Type.Optional(
    Type.Union(
      [
        Type.Literal("development"),
        Type.Literal("test"),
        Type.Literal("production"),
      ],
      { default: "development" },
    ),
  ),
  LOG_LEVEL: Type.Optional(Type.Union(LOG_LEVELS, { default: "info" })),
  RATE_LIMIT_AUTH_PER_MIN: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 1000, default: 10 }),
  ),
  RATE_LIMIT_WRITES_PER_MIN: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 1000, default: 120 }),
  ),
  RATE_LIMIT_READS_PER_MIN: Type.Optional(
    Type.Integer({ minimum: 1, maximum: 1000, default: 300 }),
  ),
});

export type Env = Static<typeof EnvSchema>;

/** After parseEnv every optional has its default applied — the boot
 * consumes a fully-resolved shape. */
export type ResolvedEnv = {
  [K in keyof Env]-?: Exclude<Env[K], undefined>;
};

/** Numeric keys arrive as strings from the environment; coerce the ones
 * that parse so TypeBox validates them as Integer (junk stays a string
 * and fails the schema with the key's name). */
const NUMERIC_KEYS = [
  "PORT",
  "RATE_LIMIT_AUTH_PER_MIN",
  "RATE_LIMIT_WRITES_PER_MIN",
  "RATE_LIMIT_READS_PER_MIN",
] as const;

export function parseEnv(
  vars: Record<string, string | undefined>,
): ResolvedEnv {
  const input: Record<string, unknown> = { ...vars };
  for (const key of NUMERIC_KEYS) {
    const raw = input[key];
    if (typeof raw === "string" && raw.trim() !== "") {
      const n = Number(raw);
      if (Number.isFinite(n)) input[key] = n;
    }
  }
  const errors = [...Value.Errors(EnvSchema, input)];
  if (errors.length > 0) {
    const keys = errors.map((e) => e.path.slice(1) || "(root)").join(", ");
    throw new Error(`Invalid environment (SPEC §10.7 fail-fast): ${keys}`);
  }
  return Value.Parse(EnvSchema, input) as unknown as ResolvedEnv;
}
