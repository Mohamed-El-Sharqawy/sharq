// The users/teams matrix rows that flipped live when their routes landed
// (roadmap row 4 — the flip IS the acceptance act; contract depth comes in
// row 5). Admin rows addressing an entity by id use a nil uuid: the entity
// doesn't exist, so the allowed actor's handler outcome is the 404
// NOT_FOUND envelope (ok: 404) while the rejected actors never get past
// the guard (401/403). Creation rows mint unique payloads so the allowed
// actor's probe reaches the handler's 200 without colliding across probes
// or runs.
import { r, type MatrixRow } from "./role-matrix.data";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
let userSeq = 0;
let teamSeq = 0;

/** §10.6 rows: users (AUTH-04..06, ADM-06) + teams/memberships
 * (ADM-01..05). Order within the array is probe order. */
export const USERS_TEAMS_ROWS: MatrixRow[] = [
  r("GET", "/api/users", "admin", { fr: "ADM-06", live: true }),
  r("POST", "/api/users", "admin", {
    fr: "AUTH-04",
    live: true,
    bodyFor: () => ({
      username: `mx-${Date.now()}-${(userSeq += 1)}`,
      displayNameAr: "مستخدم المصفوفة",
      role: "employee",
    }),
  }),
  r("PATCH", "/api/users/:id", "admin", {
    fr: "AUTH-06/07",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("POST", "/api/users/:id/reset-password", "admin", {
    fr: "AUTH-05",
    ok: 404,
    live: true,
  }),
  r("POST", "/api/users/:id/deactivate", "admin", {
    fr: "AUTH-06",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("POST", "/api/users/:id/reactivate", "admin", {
    fr: "AUTH-06",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("GET", "/api/teams", "admin", { fr: "ADM-01", live: true }),
  r("POST", "/api/teams", "admin", {
    fr: "ADM-01",
    live: true,
    bodyFor: () => ({
      nameAr: `فريق المصفوفة ${Date.now()}-${(teamSeq += 1)}`,
    }),
  }),
  r("PATCH", "/api/teams/:id", "admin", {
    fr: "ADM-02",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("POST", "/api/teams/:id/members", "admin", {
    fr: "ADM-03/05",
    ok: 404,
    live: true,
    bodyFor: () => ({ userId: NIL_UUID, validFrom: "2026-01-01" }),
  }),
  r("PATCH", "/api/teams/:id/members/:mid", "admin", {
    fr: "ADM-04/05",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
];
