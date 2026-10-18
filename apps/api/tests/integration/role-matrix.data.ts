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

const r = (
  method: MatrixRow["method"],
  path: string,
  access: Access,
  fr: string | undefined,
  ok = 200,
  extra: Partial<MatrixRow> = {},
): MatrixRow => ({ method, path, access, fr, ok, live: false, ...extra });

/** §10.6 verbatim, decomposed to one probe per (method, path). */
export const MATRIX: MatrixRow[] = [
  r("POST", "/api/auth/login", "public", "AUTH-01", 200, {
    bodyFor: (c) => ({ identifier: c.username, password: c.password }),
  }),
  r("GET", "/api/auth/me", "any", "AUTH-01", 200),
  r("POST", "/api/auth/password", "any", "AUTH-07", 204, {
    bodyFor: (c) => ({ current: c.password, next: "Matrix-Rotated#1" }),
  }),
  // Logout is destructive (revokes the actor sessions) — it probes LAST so
  // the rows above still have live sessions.
  r("POST", "/api/auth/logout", "any", "AUTH-02", 204),
  r("GET", "/api/users", "admin", "ADM-06"),
  r("POST", "/api/users", "admin", "AUTH-04"),
  r("PATCH", "/api/users/:id", "admin", "AUTH-06/07"),
  r("POST", "/api/users/:id/reset-password", "admin", "AUTH-05"),
  r("POST", "/api/users/:id/deactivate", "admin", "AUTH-06"),
  r("POST", "/api/users/:id/reactivate", "admin", "AUTH-06"),
  r("GET", "/api/teams", "admin", "ADM-01"),
  r("POST", "/api/teams", "admin", "ADM-01"),
  r("PATCH", "/api/teams/:id", "admin", "ADM-02"),
  r("POST", "/api/teams/:id/members", "admin", "ADM-03/05"),
  r("PATCH", "/api/teams/:id/members/:mid", "admin", "ADM-04/05"),
  // §10.6: settings GET is "admin (edit) / all (read resolved)" — every
  // authenticated role may read the resolved map (employees the formatting
  // subset); only admins PATCH.
  r("GET", "/api/settings", "any", "SET-01"),
  r("PATCH", "/api/settings/:key", "admin", "SET-02/11/12"),
  r("POST", "/api/settings/impact", "admin", "SET-02"),
  r("GET", "/api/rates", "admin", "SET-03"),
  r("POST", "/api/rates", "admin", "SET-03"),
  r("PATCH", "/api/rates/:id", "admin", "SET-03"),
  r("GET", "/api/reason-catalog", "admin", "SET-04"),
  r("POST", "/api/reason-catalog", "admin", "SET-04"),
  r("PATCH", "/api/reason-catalog/:id", "admin", "SET-04"),
  r("GET", "/api/attendance-statuses", "admin", "SET-05"),
  r("POST", "/api/attendance-statuses", "admin", "SET-05"),
  r("PATCH", "/api/attendance-statuses/:id", "admin", "SET-05"),
  r("GET", "/api/holidays", "admin", "SET-06"),
  r("POST", "/api/holidays", "admin", "SET-06"),
  r("DELETE", "/api/holidays/:id", "admin", "SET-06"),
  r("GET", "/api/attendance", "teamScoped", "GRID-01"),
  r("POST", "/api/attendance/bulk", "teamScoped", "ATT-08"),
  r("PATCH", "/api/attendance/:id", "teamScoped", "ATT-04/06"),
  r("DELETE", "/api/attendance/:id", "teamScoped", "ATT-06"),
  r("POST", "/api/deductions", "teamScoped", "ATT-03"),
  r("PATCH", "/api/deductions/:id", "teamScoped", "ATT-03"),
  r("DELETE", "/api/deductions/:id", "teamScoped", "ATT-03"),
  r("GET", "/api/periods", "teamScoped", "PAY-01"),
  r("POST", "/api/periods/generate", "admin", "PAY-01"),
  // §3: lock/mark-paid allow the supervisor for his OWN team behind the
  // policy flags; unlock is admin-only (audited).
  r("POST", "/api/periods/:id/lock", "teamScoped", "PAY-04"),
  r("POST", "/api/periods/:id/mark-paid", "teamScoped", "PAY-05"),
  r("POST", "/api/periods/:id/unlock", "admin", "PAY-06"),
  r("POST", "/api/adjustments", "admin", "PAY-07"),
  // §3 grants every role his own portal view; the endpoint is session-scoped
  // (§10.6 "employee(own)/any") — the role never widens the data.
  r("GET", "/api/portal/weeks", "any", "PRT-01/03"),
  r("GET", "/api/portal/weeks/:start", "any", "PRT-02"),
  // FR-DSH-04 (employee trend) is v1.1 backlog; the v1 route is §10.6's
  // "supervisor(admin scope)/admin".
  r("GET", "/api/export", "teamScoped", "EXP-01..05"),
  r("GET", "/api/audit", "admin", "AUD-03"),
  r("GET", "/api/dashboard/summary", "teamScoped", "DSH-01..03"),
  r("GET", "/api/health", "public", undefined),
];

/** The §3 contract per actor: exact status for every (row, actor) pair.
 * `ok` is the allowed actors' handler outcome (guard passed). */
export function expectedFor(row: MatrixRow): Record<Actor, number> {
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
