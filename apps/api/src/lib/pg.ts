// Drizzle wraps driver errors in DrizzleQueryError (.cause chains); this
// walks to the underlying pg error so repositories can map DESIGNED
// constraint violations (§7 uniqueness / EC-08 exclusion) to service-level
// results instead of 500s. Unknown shapes return an empty info — callers
// rethrow anything they cannot map.
type PgErrorInfo = { code?: string; constraint?: string };

export function pgErrorInfo(error: unknown, depth = 5): PgErrorInfo {
  if (depth === 0 || !isRecord(error)) return {};
  const code = readString(error.code);
  const constraint = readString(error.constraint);
  if (code !== undefined || constraint !== undefined) {
    return { code, constraint };
  }
  return pgErrorInfo(error.cause, depth - 1);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
