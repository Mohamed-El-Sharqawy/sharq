// SPEC §10.6 (last row) + §10.7 — public health probe: no session, no
// guards, a DB round-trip check injected by the composition root, and the
// api's package version for `{status, db, version}`. 200 ok / 503 degraded.
import { Elysia, status } from "elysia";
import pkg from "../../package.json";

export type HealthRoutesDeps = {
  /** One round-trip query (select 1) — false means the DB is unreachable. */
  dbCheck(): Promise<boolean>;
};

export function createHealthRoutes(deps: HealthRoutesDeps) {
  return new Elysia({ name: "sharq-health", tags: ["health"] }).get(
    "/api/health",
    async () => {
      const up = await deps.dbCheck();
      return up
        ? { status: "ok", db: "up", version: pkg.version }
        : status(503, { status: "degraded", db: "down", version: pkg.version });
    },
  );
}
