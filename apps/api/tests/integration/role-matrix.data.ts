// The §3 × §10.6 executable role matrix (TESTING §7): every inventory route
// × five actors {anonymous, employee, supervisor-own-team, supervisor-other-
// team, admin} → the expected status, mirroring SPEC §3 exactly. Access
// descriptors derive from §3's ✓/— columns + the §10.6 Roles column; `fr`
// is the §10.6 FR cell verbatim (traceability §16 greps it from titles).
// Rows for routes that have not shipped yet pin the route's ABSENCE (404)
// until their phase flips `live` — landing a route without flipping its row
// fails here, and so does a guard regression on a live row. `bodyFor` lets a
// row supply actor credentials so allowed actors reach the handler (login
// needs real credentials; /password needs the actor's current password).
import { USERS_TEAMS_ROWS } from "./role-matrix.rows.users-teams";

export type Actor =
  "anonymous" | "employee" | "supervisorOwn" | "supervisorOther" | "admin";

export const ACTORS: Actor[] = [
  "anonymous",
  "employee",
  "supervisorOwn",
  "supervisorOther",
  "admin",
];

export type Access = "public" | "any" | "teamScoped" | "admin";

export type Credentials = { username: string; password: string };

export type MatrixRow = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  access: Access;
  fr?: string;
  /** Live rows assert the §3 role contract; planned rows pin 404. */
  live: boolean;
  /** The exact status an ALLOWED actor must get (guard passed). */
  ok: number;
  body?: unknown;
  bodyFor?: (creds: Credentials) => unknown;
};

type RowOpts = Partial<
  Pick<MatrixRow, "fr" | "ok" | "live" | "body" | "bodyFor">
>;

/** Row builder — exported for the split-out row modules (§9.2 line budget)
 * and a hoisted function: they share this file's module cycle (they import
 * `r`) and need it callable during their evaluation. */
export function r(
  method: MatrixRow["method"],
  path: string,
  access: Access,
  opts: RowOpts = {},
): MatrixRow {
  return {
    method,
    path,
    access,
    fr: opts.fr,
    ok: opts.ok ?? 200,
    live: opts.live ?? false,
    body: opts.body,
    bodyFor: opts.bodyFor,
  };
}

/** §10.6 verbatim, decomposed to one probe per (method, path). */
export const MATRIX: MatrixRow[] = [
  r("POST", "/api/auth/login", "public", {
    fr: "AUTH-01",
    live: true,
    bodyFor: (c) => ({ identifier: c.username, password: c.password }),
  }),
  r("GET", "/api/auth/me", "any", { fr: "AUTH-01", live: true }),
  // The users/teams rows live in their own module (§9.2 line budget) —
  // landed + flipped live with roadmap row 4. They probe BEFORE the
  // password rotation and the destructive logout row (those kill the
  // actors' credentials/sessions — logout probes last by design).
  ...USERS_TEAMS_ROWS,
  r("POST", "/api/auth/password", "any", {
    fr: "AUTH-07",
    ok: 204,
    live: true,
    bodyFor: (c) => ({ current: c.password, next: "Matrix-Rotated#1" }),
  }),
  // Logout is destructive (revokes the actor sessions) — it probes LAST so
  // the rows above still have live sessions.
  r("POST", "/api/auth/logout", "any", { fr: "AUTH-02", ok: 204, live: true }),
  // §10.6: settings GET is "admin (edit) / all (read resolved)" — every
  // authenticated role may read the resolved map (employees the formatting
  // subset); only admins PATCH.
  r("GET", "/api/settings", "any", { fr: "SET-01" }),
  r("PATCH", "/api/settings/:key", "admin", { fr: "SET-02/11/12" }),
  r("POST", "/api/settings/impact", "admin", { fr: "SET-02" }),
  r("GET", "/api/rates", "admin", { fr: "SET-03" }),
  r("POST", "/api/rates", "admin", { fr: "SET-03" }),
  r("PATCH", "/api/rates/:id", "admin", { fr: "SET-03" }),
  r("GET", "/api/reason-catalog", "admin", { fr: "SET-04" }),
  r("POST", "/api/reason-catalog", "admin", { fr: "SET-04" }),
  r("PATCH", "/api/reason-catalog/:id", "admin", { fr: "SET-04" }),
  r("GET", "/api/attendance-statuses", "admin", { fr: "SET-05" }),
  r("POST", "/api/attendance-statuses", "admin", { fr: "SET-05" }),
  r("PATCH", "/api/attendance-statuses/:id", "admin", { fr: "SET-05" }),
  r("GET", "/api/holidays", "admin", { fr: "SET-06" }),
  r("POST", "/api/holidays", "admin", { fr: "SET-06" }),
  r("DELETE", "/api/holidays/:id", "admin", { fr: "SET-06" }),
  r("GET", "/api/attendance", "teamScoped", { fr: "GRID-01" }),
  r("POST", "/api/attendance/bulk", "teamScoped", { fr: "ATT-08" }),
  r("PATCH", "/api/attendance/:id", "teamScoped", { fr: "ATT-04/06" }),
  r("DELETE", "/api/attendance/:id", "teamScoped", { fr: "ATT-06" }),
  r("POST", "/api/deductions", "teamScoped", { fr: "ATT-03" }),
  r("PATCH", "/api/deductions/:id", "teamScoped", { fr: "ATT-03" }),
  r("DELETE", "/api/deductions/:id", "teamScoped", { fr: "ATT-03" }),
  r("GET", "/api/periods", "teamScoped", { fr: "PAY-01" }),
  r("POST", "/api/periods/generate", "admin", { fr: "PAY-01" }),
  // §3: lock/mark-paid allow the supervisor for his OWN team behind the
  // policy flags; unlock is admin-only (audited).
  r("POST", "/api/periods/:id/lock", "teamScoped", { fr: "PAY-04" }),
  r("POST", "/api/periods/:id/mark-paid", "teamScoped", { fr: "PAY-05" }),
  r("POST", "/api/periods/:id/unlock", "admin", { fr: "PAY-06" }),
  r("POST", "/api/adjustments", "admin", { fr: "PAY-07" }),
  // §3 grants every role his own portal view; the endpoint is session-scoped
  // (§10.6 "employee(own)/any") — the role never widens the data.
  r("GET", "/api/portal/weeks", "any", { fr: "PRT-01/03" }),
  r("GET", "/api/portal/weeks/:start", "any", { fr: "PRT-02" }),
  // FR-DSH-04 (employee trend) is v1.1 backlog; the v1 route is §10.6's
  // "supervisor(admin scope)/admin".
  r("GET", "/api/export", "teamScoped", { fr: "EXP-01..05" }),
  r("GET", "/api/audit", "admin", { fr: "AUD-03" }),
  r("GET", "/api/dashboard/summary", "teamScoped", { fr: "DSH-01..03" }),
  // §10.7 cross-cutting landed with row 12: public, no session, DB
  // round-trip check — the one non-auth row that shipped in Phase 1.
  r("GET", "/api/health", "public", { live: true }),
];

/** The §3 contract per actor: exact status for every (row, actor) pair.
 * `ok` is the allowed actors' handler outcome (guard passed). Planned rows
 * pin the route's absence — 404 for every actor. */
export function expectedFor(row: MatrixRow): Record<Actor, number> {
  if (!row.live) {
    const missing = 404;
    return {
      anonymous: missing,
      employee: missing,
      supervisorOwn: missing,
      supervisorOther: missing,
      admin: missing,
    };
  }
  const deny = 403;
  const ok = row.ok;
  switch (row.access) {
    case "public":
      return {
        anonymous: ok,
        employee: ok,
        supervisorOwn: ok,
        supervisorOther: ok,
        admin: ok,
      };
    case "any":
      return {
        anonymous: 401,
        employee: ok,
        supervisorOwn: ok,
        supervisorOther: ok,
        admin: ok,
      };
    case "teamScoped":
      return {
        anonymous: 401,
        employee: deny,
        supervisorOwn: ok,
        supervisorOther: deny,
        admin: ok,
      };
    case "admin":
      return {
        anonymous: 401,
        employee: deny,
        supervisorOwn: deny,
        supervisorOther: deny,
        admin: ok,
      };
  }
}
