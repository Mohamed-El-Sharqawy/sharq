// The §5 configuration matrix rows that flipped live when their routes
// landed (roadmap Phase 3 row 8 — the flip IS the acceptance act; contract
// depth comes in the deferred Testing phase). The allowed actor's outcome
// per row is deterministic WITHOUT mutating state the other rows depend
// on: reads return 200; writes that would leave residue probe the 404
// (nil-uuid target) or the 409 CONFLICT_VERSION (a version no real row can
// carry — EC-53's loser path) instead; creation rows mint unique payloads.
// POST /api/settings/impact is a pure read (§5.5.6) → 200.
import { r, type MatrixRow } from "./role-matrix.data";

const NIL_UUID = "00000000-0000-0000-0000-000000000000";
let reasonSeq = 0;
let statusSeq = 0;

/** A holiday date unique per run: day-granularity ms offset inside the
 * 2090s keeps repeat containers collision-free (date is unique, §7). */
const matrixHolidayDate = () => {
  const ms =
    Date.parse("2090-01-01T00:00:00Z") + (Date.now() % 3000) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
};

/** §10.6 rows: settings (SET-01/02/11/12) + rates (SET-03) + reason
 * catalog (SET-04) + statuses (SET-05) + holidays (SET-06). Probe order
 * within the array mirrors the §10.6 inventory order. */
export const CONFIG_ROWS: MatrixRow[] = [
  r("GET", "/api/settings", "any", { fr: "SET-01", live: true }),
  r("PATCH", "/api/settings/:key", "admin", {
    fr: "SET-02/11/12",
    // The nil :key is outside the registry → the service's 404 envelope
    // (an unknown key is an absent resource). The 409 conflict path needs
    // a live row — that depth lands with the deferred contract tests.
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("POST", "/api/settings/impact", "admin", {
    fr: "SET-02",
    live: true,
    bodyFor: () => ({
      key: "attendance.amount.maxMinor",
      value: 600_000,
    }),
  }),
  r("GET", "/api/rates", "admin", { fr: "SET-03", live: true }),
  r("POST", "/api/rates", "admin", {
    fr: "SET-03",
    ok: 404,
    live: true,
    bodyFor: () => ({
      scopeType: "team",
      scopeKey: NIL_UUID,
      amountMinor: 45_000,
      validFrom: "2030-01-01",
    }),
  }),
  r("PATCH", "/api/rates/:id", "admin", {
    fr: "SET-03",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("GET", "/api/reason-catalog", "admin", { fr: "SET-04", live: true }),
  r("POST", "/api/reason-catalog", "admin", {
    fr: "SET-04",
    live: true,
    bodyFor: () => ({
      kind: "override",
      nameAr: `سبب مصفوفة ${Date.now()}-${(reasonSeq += 1)}`,
    }),
  }),
  r("PATCH", "/api/reason-catalog/:id", "admin", {
    fr: "SET-04",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("GET", "/api/attendance-statuses", "admin", { fr: "SET-05", live: true }),
  r("POST", "/api/attendance-statuses", "admin", {
    fr: "SET-05",
    live: true,
    bodyFor: () => ({
      code: `mx-${Date.now()}-${(statusSeq += 1)}`,
      nameAr: "حالة المصفوفة",
      carriesPay: false,
    }),
  }),
  r("PATCH", "/api/attendance-statuses/:id", "admin", {
    fr: "SET-05",
    ok: 404,
    live: true,
    bodyFor: () => ({ version: 1 }),
  }),
  r("GET", "/api/holidays", "admin", { fr: "SET-06", live: true }),
  r("POST", "/api/holidays", "admin", {
    fr: "SET-06",
    live: true,
    bodyFor: () => ({ date: matrixHolidayDate(), nameAr: "عيد المصفوفة" }),
  }),
  r("DELETE", "/api/holidays/:id", "admin", {
    fr: "SET-06",
    ok: 404,
    live: true,
  }),
];
