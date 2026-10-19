# Testing Strategy & TDD Workflow — شرق (Sharq)

Companion to [SPEC.md](SPEC.md). This document is **binding**: it defines how every requirement gets tested, when tests are written (first), and which CI gates block a merge. Spec references: FR = SPEC §4, EC = SPEC §16, endpoints = SPEC §10.6.

---

## 1. Purpose & principles

- **Goal:** reviewing = reading code + reading tests. No repeated manual regression testing, no manual verification of business rules, ever. The suite is the acceptance authority.
- **Principle 1 — TDD default.** Red-Green-Refactor is the working mode (SPEC §9.10). A test exists and is seen failing before the implementation that makes it pass.
- **Principle 2 — traceability.** Every Given/When/Then acceptance criterion in SPEC §4 and every row EC-01..EC-60 in SPEC §16 maps to at least one named automated test. CI verifies the ids (§16).
- **Principle 3 — one source of truth.** Payroll math, config resolution and schemas live once in packages and are tested once; anything else consuming them is tested for wiring, not re-implementation (DRY).
- **Principle 4 — manual work is the exception.** Only the items in §14 may be done by hand, each timeboxed and listed.

---

## 2. Stack & decision records

### 2.1 Stack

| Level | Tool | Scope |
|---|---|---|
| Unit — packages & api | **bun:test** | `@sharq/payroll`, `@sharq/schemas`, `@sharq/locales` (map completeness), `apps/api` services (mocked repositories) |
| Unit/component — web | **Vitest + jsdom + Testing Library** | every `*.reducer.ts`, `logic.ts` hooks, `view.tsx` render tests |
| Integration — api | **bun:test + Testcontainers** (ephemeral Postgres per suite) | every §10.6 endpoint through routes → services → real DB |
| Contract | bun:test + Eden/TypeBox types + `/openapi.json` | response schemas, route inventory parity, role matrix |
| E2E | **Playwright** (chromium) | role flows F-01..F-12 (§9), desktop RTL + mobile viewport projects |
| A11y | `@axe-core/playwright` | every route, zero critical |
| Visual | Playwright screenshots | RTL baselines for key screens (desktop + mobile) |
| Excel | ExcelJS read-back + fixture workbooks | export snapshots + parity |
| Property-based (Phase 9, optional) | fast-check | payroll math invariants |

### 2.2 Decision record: Playwright over Cypress

Chosen **Playwright**. Reasons: (1) multi-context role-switching — one test can be admin, supervisor and employee simultaneously via separate browser contexts, which our golden flows need (Cypress multi-origin support is weaker); (2) first-class TypeScript + auto-waiting; (3) built-in parallel workers and Docker/CI images — cheaper full-suite runs; (4) `context.setOffline()` + service-worker interception for our offline/PWA flows; (5) trace viewer makes CI failures debuggable without a paid dashboard; (6) mobile viewport emulation for the RTL mobile grid. Cypress's time-travel UI does not outweigh these.

### 2.3 Decision record: bun:test (api/packages) + Vitest (web)

API and packages run natively on Bun (the same runtime as production), so bun:test gives the highest fidelity with zero config. Web tooling is Node/Vite-based, so Vitest is the natural runner with shared transforms. Both run under one `turbo test` task; both enforce the same coverage gates (§11).

---

## 3. Test pyramid & scope matrix

| Artifact | Unit | Integration | E2E | Notes |
|---|---|---|---|---|
| `@sharq/payroll` functions | ✅ exhaustive | — | via flows | pure; no mocks needed |
| `@sharq/schemas` (registry, validators, normalizers, error map) | ✅ exhaustive | — | — | |
| Reducers (`*.reducer.ts`) | ✅ full action matrix | — | via flows | |
| `logic.ts` hooks / `mutations.ts` | ✅ mocked Query layer | — | via flows | |
| `view.tsx` components | ✅ render (props only) | — | visual baselines | a view test needing network mocks = the view broke SPEC §9.5 |
| API routes/services/repositories | services with mocked repos | ✅ real Postgres | — | routes are never unit-tested |
| DB constraints (exclusion, unique, FK) | — | ✅ | — | tested by direct SQL attempts |
| Auth/guards/role matrix | — | ✅ table-driven | spot flows | |
| Offline queue & sync | queue logic unit | replay endpoints integration | ✅ F-07 | |
| Payroll totals end-to-end parity | — | — | ✅ F-09/F-10 | grid = portal = export |
| Excel output | — | snapshot per fixture | ✅ F-10 | |
| A11y / RTL visuals | — | — | ✅ per route | |

**Duration budgets:** unit suite < 30 s · integration < 3 min · E2E < 10 min (2 parallel workers minimum).

---

## 4. Test workflow

> **Client decision 2026-10-19 (SPEC §20.1), effective Phase 2 onward: implement first, test after.** The red-first loop below is no longer required. §4.2's inventory remains the binding scope of what must HAVE tests by each phase's end — the tests are written once the phase's implementation is complete, then made green together with the phase's DoD gates. No PR merges with red/skipped tests (unchanged). Quality duty shifts forward: with no failing test to catch drift early, implementation sessions must read the SPEC rows they code against and cover the edge cases the tests would have pinned.

### 4.1 The loop (Phase 0–1 history; retained for reference)

1. **Red** — write the smallest failing test that expresses the next acceptance criterion or edge case. Run it. Watch it fail (for the right reason).
2. **Green** — write the minimum implementation that passes.
3. **Refactor** — clean up while staying green (this is where SPEC §9 principles get applied).

### 4.2 What must have tests (scope inventory; order per §4 — Phase 2+: written after implementation)

- All `@sharq/payroll` functions (math, resolution, periods, holidays).
- All `@sharq/schemas` registry defaults, cross-field validators, amount normalizer, error-map entries.
- Every `*.reducer.ts` (write the action-matrix test file before the reducer).
- Every api service method (test with a mocked repository first; the integration test against real Postgres comes with the route).
- Every `logic.ts` orchestration hook and mutation (optimistic/rollback asserted via cache state).
- Every contract test (write it from SPEC §10.6 before the route exists).

### 4.3 What ships with tests (not strictly test-first)

- `view.tsx` render tests (Arabic strings per SPEC §2, empty/loading/error variants) — may be written alongside the view; must exist in the same PR.
- Playwright flow specs — written from the flow definition before wiring screens when practical; must exist before a phase's DoD.

### 4.4 Commit & PR conventions

- Non-trivial logic PRs encouraged to show red-first history: `test: red — FR-PAY-02 weekly totals` followed by `feat: green — payroll totals`.
- Every PR must list the FR/EC ids it covers (reviewer checks against test names).
- **Skipped tests count as failed** in CI. `todo:` placeholders are allowed only with an issue link and expire in 7 days.

### 4.5 Test naming = the acceptance criterion

```
describe('FR-PAY-02 · weekly total')
  it('given 6 carrying days at 400 EGP and a 100 EGP deduction, when the week is computed, then total is 2300 EGP')

describe('EC-31 · Arabic-Indic digits in amount input')
  it('given "٤٠٠٫٥٠" typed, when normalized, then amount is 40050 minor units')
```
Arabic UI strings are asserted exactly as written in SPEC §2 (no partial matches).

---

## 5. Traceability

- **FR → tests:** each FR's Given/When/Then blocks appear verbatim (translated to test intent) in unit/integration/E2E per the §3 matrix.
- **EC → regression suite:** every EC-01..EC-60 row must be referenced by ≥ 1 test name. No "manual-only" edge cases are allowed.
- **Endpoints → contract tests:** 100% of SPEC §10.6 rows.
- The traceability gate is mechanical (§16): a CI script extracts `FR-*`/`EC-*` tokens from test titles across all runners and diffs them against the id lists parsed from SPEC.md. Missing id → red build. (New spec ids must land in the same PR as their tests.)

---

## 6. Unit testing details

### 6.1 `@sharq/payroll` — mandatory case list

- Totals: carrying vs non-carrying statuses; deductions; adjustments; floor-at-zero on/off (FR-PAY-02/03).
- Override detection: equal, different, back-to-base clearing (EC-15), snapshot immutability after rate change (EC-43).
- Rate resolution cascade: the full §5.3 worked-example table; team resolution via membership ranges incl. mid-week transfer (EC-08); missing rows → seeded default (EC-55).
- Effective dating: §5.4 examples 1–4 as named cases; overlap rejection is DB-level (integration) but boundary dates (valid_from day itself, valid_to day itself, day after) are unit-tested.
- Period generation: weekly rows from `weekStartDay`; idempotency; transition rule (no gaps/overlaps after setting change, EC-22); far-future start (EC-54).
- Payday resolution: Thu/Fri/mid-week; holiday shift earlier/later/keep; holidays-only skipping (EC-21, A10).
- Amount normalization: Western digits, Arabic-Indic digits, `٫` and `,` separators, >2 decimals rejection, zero, huge values (EC-31..34).

### 6.2 `@sharq/schemas`

- Registry completeness: every §5.2 key has schema + seeded default + validator (table-driven over the registry object — a new key without a default fails automatically).
- Cross-field validators: min ≤ max, quick-picks within bounds, ≤ 8 quick-picks (FR-SET-08).
- Error map completeness: every TypeBox keyword used + every API error code has an Arabic message (FR coverage of §10.4 codes).

### 6.3 Reducers

- Every action type, every illegal transition ignored, state immutability (deep-freeze helper), and for the grid reducer specifically: pending overlay math, conflict list population from 409 payloads, stale-settings delta application, offline flag flips (SPEC §12 shape).

### 6.4 Web hooks & mutations

- `logic.ts` hooks return exactly the view-props contract (snapshot the props object per scenario).
- Mutations: optimistic cache patch applied, rollback restores prior cache on rejection, invalidation map fired (assert via QueryClient spy).

### 6.5 Views

- Rendered with props only — **no query mocks**; if a test needs them the view is wrong (SPEC §9.5).
- Assert Arabic strings from SPEC §2, empty/loading/error variants via props, and ARIA roles for interactive elements.

---

## 7. Integration testing (apps/api)

- **Isolation:** ephemeral Postgres via Testcontainers, one container per suite file, schema migrated at setup, torn down at teardown; suites never share state. CI runs suites in parallel.
- **Fixtures/personas (factory-based):** admin «سيد», supervisor «محمد», employees «أحمد/خالد/نور/…», teams «الصيانة/التشغيل/المخزن», seeded rates/catalog/statuses/periods per SPEC §5.6 + TESTING §15 seed.
- **Must-verify at DB level:** membership exclusion rejects overlap (EC-11); rate exclusion rejects overlap (EC-40); `uniq(user_id, entry_date)` upsert semantics (EC-17); settings `version` conflict (EC-53); FK and enum integrity.
- **Role matrix, table-driven:** for every §10.6 route × {anonymous, employee, supervisor-own-team, supervisor-other-team, admin} → expected {401, 403, 200}. The matrix data lives next to the test and mirrors SPEC §3 exactly.
- **Behavioral suites:** edit window (EC-01..03), period states (EC-18..20), bounds/mode/reason revalidation (EC-32..35, FR-ATT-07), idempotent replay (EC-17/27/39), portal isolation ignoring params (EC-37), audit append-only (FR-AUD-04), `SETTINGS_CHANGED` payload freshness (EC-48).
- **Contract assertions inside the same suite:** every response validated against the route's TypeBox schema; `/openapi.json` route list diffed against §10.6.

---

## 8. Contract testing

1. **Compile-time:** web consumes Eden types generated from `type App`; schema drift between web forms and api routes fails typecheck (no runtime check needed).
2. **Runtime:** integration suite validates every response against its schema (above).
3. **Inventory parity:** CI diffs the OpenAPI route list against SPEC §10.6 (missing or extra route → red). The endpoint table is the single source; routes are generated/annotated from the same feature list.

---

## 9. E2E flows (Playwright) — inventory

| ID | Flow | Covers |
|---|---|---|
| F-01 | Admin logs in → dashboard renders teams/cards | AUTH-01, DSH-01 |
| F-02 | Admin creates team + supervisor + members (incl. mid-week join) → sheet shows member from join date | ADM-01..05, EC-06 |
| F-03 | Admin sets employee rate mid-week with impact preview → next day's prefill changes, old days keep snapshots | SET-03, §5.4, EC-40/41 |
| F-04 | Admin edits bounds, quick-picks, reason catalog → grid chips/validation update | SET-11/04, EC-48 |
| F-05 | Supervisor desktop grid: enters a week — normal day, override + reason, deduction; totals update live; override markers shown | ATT-01..03, GRID-01..08 |
| F-06 | Supervisor mobile day-mode entry (mobile viewport) | ATT-12, GRID-13 |
| F-07 | Offline: `setOffline(true)` → edit cells → «لسه بيرفع البيانات…» → back online → synced; then a forced conflict resolves via dialog | ATT-09, GRID-09, EC-26/60 |
| F-08 | Lock period → snapshot recalc identical → mark paid → portal flips to «متصرف» | PAY-04/05/10 |
| F-09 | Employee portal (separate context, same test): sees 2,400 − 100 = 2,300 EGP example, per-day reasons, history | PRT-01..03 |
| F-10 | Export: downloads xlsx, parses it, asserts totals == grid == portal == API; empty period exports zeros | EXP-01..05, EC-36 |
| F-11 | Session expires mid-edit → re-login dialog → edits preserved & replayed | AUTH-03, EC-39 |
| F-12 | Stale settings: admin changes bounds while supervisor sheet open → banner + pending revalidated | GRID-10, EC-48/49 |

Plus, every run: axe scan per route (zero critical), visual baselines per key screen (desktop RTL + mobile), one keyboard-only grid navigation pass (arrows/Enter/Esc/Tab per SPEC §14.4).

**Full-stack backing (Phase 1, row 13):** F-01 and later flows run against the real api (bun, :3000) + web dev server (:5173, `/api` proxied — mirrors prod Traefik routing), backed by the shared Neon Postgres: `e2e/global-setup.ts` re-applies migrations + seed (both idempotent) before the servers boot. No local container is involved. Locally the connection string lives in gitignored `apps/api/.env`; CI injects it as the `NEON_DATABASE_URL` secret (`DATABASE_URL` env on the e2e step — env vars beat `.env` under bun). The api's integration suites stay Testcontainers-based (§7 isolation; CI runners provide Docker).

**Visual-baseline policy** (wired in Phase 0, row 13):

- Goldens live in `<spec>.spec.ts-snapshots/` next to each spec and are **committed**; Playwright auto-suffixes each file with project + platform (`-desktop-RTL-linux` / `-mobile-win32`), so each OS keeps its own golden — never compare across renderers.
- Capture/tolerance options are set **once** in `apps/web/playwright.config.ts` (`expect.toHaveScreenshot`): `fullPage: true`, `animations: "disabled"` (freezes skeleton pulses), `maxDiffPixels: 500`. Specs stay policy-free.
- CI fails if a run writes or updates a golden (uncommitted-goldens check in the e2e job): fresh goldens arrive via the failure artifact, get committed, and the next run verifies them. A golden is therefore always reviewed-and-committed, never silently regenerated.
- Refreshing an intentional visual change: `pnpm e2e -- --update-snapshots` locally for win32, plus the CI artifact loop for linux; both goldens land in one commit.

---

## 10. Excel snapshot tests

- Deterministic seed → fixed team/period fixture → generated workbook.
- Assertions: stable byte/hash for the fixture; parsed checks — `rightToLeft: true`, header tokens from `export.headerText`, column order from `export.columns`, money format `#,##0.00`, totals rows equal `@sharq/payroll` outputs, filename matches `export.filenamePattern` tokens, long Arabic reason wraps (EC-29), mixed-script cell reading order (EC-30).

---

## 11. Coverage gates & quality gates

| Target | Gate | Enforcement |
|---|---|---|
| `@sharq/payroll` | ≥ 90% lines | bun coverage threshold |
| `@sharq/schemas` | ≥ 90% lines | bun coverage threshold |
| `@sharq/locales` | ≥ 85% lines | bun coverage threshold |
| `apps/api` services | ≥ 85% lines | bun coverage threshold |
| Web reducers + hooks (`logic.ts`, `mutations.ts`) | ≥ 80% lines | vitest coverage threshold |
| Views | 100% of screens have render tests (structural check, not line %) | traceability script |
| Contract | 100% of §10.6 rows | inventory parity script |
| Traceability | 100% FR & EC ids present in test titles | §16 script |
| Static | 0 lint errors, 0 line-count violations | ESLint + check-line-count |

Gates fail the build; coverage numbers are posted on every PR.

---

## 12. CI pipeline (stages, in order)

1. **install** — pnpm with turbo cache.
2. **lint** — shared ESLint config across all packages.
3. **line-count** — `tooling/check-line-count.mjs` + exemption-list validation.
4. **typecheck** — tsc project references; includes Eden type parity.
5. **unit** — bun:test (packages + api services) and Vitest (web) in parallel.
6. **integration** — Testcontainers Postgres suites.
7. **build** — web (vite) + api (bun build).
8. **e2e** — Playwright (Playwright Docker image, 2+ workers) incl. axe + visual baselines.
9. **gates** — coverage thresholds + traceability + inventory parity. Merge blocked on any red stage; **skipped tests = red**.

Nightly on main: full suite + dependency audit. Pre-release: Phase 9 release checklist (ROADMAP.md).

---

## 13. Bug, regression & flaky policies

- **Bugs:** every bug report becomes a failing test first (referencing the EC id, or a new EC row added to SPEC §16 in the same PR), then the fix. The test stays forever.
- **Flaky tests:** quarantined with a visible label + issue link; 7-day fix-or-delete SLA; no silent retries; quarantine list reviewed weekly.
- **Determinism:** all tests use the shared seed and fake timers for date-sensitive logic; Cairo timezone pinned via env in test runners; E2E never depends on wall-clock dates (fixture periods are relative to a frozen "today" injected via settings/seed).

---

## 14. What remains manual (everything else is automated)

| Item | When | Timebox |
|---|---|---|
| Theme/visual sign-off against the reference palette (A1) | once tokens are applied (Phase 8) | 30 min |
| Exploratory testing of new UX per phase | end of each phase | 30 min |
| Deploy smoke verification | scripted; human confirms the report | 10 min |
| Keyboard/a11y spot-check beyond automated axe | Phase 8 | 30 min |

No manual regression of business rules, totals, permissions, exports or offline behavior — those are fully covered by the suite.

---

## 15. Test data & seeding plan

One deterministic seed module used by dev, integration, E2E and screenshots:

- 1 company («شرق»), 3 teams: «الصيانة» (5 members), «التشغيل» (12), «المخزن» (120 — perf team).
- Users: 1 admin, 3 supervisors, 137 employees; known passwords; phone+username pairs for login tests.
- Rates: company 400; team override 500 (dated window); employee override 600 (from a fixed date) — mirrors §5.3.
- Catalogs: 2 override reasons, 2 deduction reasons (one with default amount); statuses incl. one custom «إجازة بعذر» (carries pay).
- Periods: one open, one locked (with snapshot), one paid (with an adjustment into the open period); holidays incl. one on a payday.
- Audit noise: a handful of settings changes for the audit viewer.
- All dates are generated relative to a frozen "today" constant so the seed never rots.

---

## 16. Traceability gate (mechanical)

A CI script (in `tooling/`) that: (1) parses FR/EC id lists from `docs/SPEC.md`; (2) greps test titles across bun:test and Vitest/Playwright specs for `FR-*`/`EC-*` tokens; (3) fails listing any spec id with no test and any test referencing an unknown id. This is the enforcement behind §5 and SPEC §9.10.
