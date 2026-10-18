# PROGRESS.md — the ledger

Single source of truth for "where are we". Updated only via the AGENTS.md closing ritual. Per-task status lives in `ROADMAP.md` checkboxes; requirements live in `SPEC.md`. Nothing is duplicated here beyond the pointer.

## Current position

- **Phase:** 0 — Monorepo, design system & test infrastructure
- **Status:** tasks 1–7 of 14 done (rows 1–7; earlier ledger said "of 13" — recount, ROADMAP's 14 checkboxes win). CI live on **draft PR #1**: stages install→lint→line-count→typecheck→unit + e2e job; green, caches restore, failure path proven (artifact upload works). **Draft PR #1 exists for CI verification only — phase work continues; not «in review» until marked ready at phase end.**

## Next task

- [ ] IMPL: Vite + React Router v7 framework mode (SPA) + fs-routes folder routing + `_app` layout + 404/error boundaries (SPEC §8.1, §11)
  - `apps/web` dirs exist (`app/routes, features, lib, styles, test, e2e`); react 19.3.1 already in catalog — `react-router` v7 (framework mode) + vite plugin are new deps to add. Root `pnpm build` gains web once `vite build` lands.
  - TEMP hello-wiring duty due in this task: `e2e/hello.spec.ts` swaps `setContent` → `page.goto("/")`; `playwright.config.ts` gains `webServer` (vite dev on 5173) — e2e in CI then runs against a real server (already proven on setContent).
  - Spec authority: SPEC §8.1 (app structure), §11 (screens/routes inventory: `_app` layout + 404/error boundaries).

## Session log (newest first)

### 2026-10-18 — Phase 0 task 6 (row 6): CI pipeline skeleton
- `.github/workflows/ci.yml`: `quality` job runs stages in order — install (pnpm via `packageManager`, Node 24 + pnpm store cache, setup-bun 1.2.21 = host, turbo cache: actions/cache sha-key + prefix restore) → lint → line-count → typecheck → unit (turbo parallelizes bun:test packages + vitest web). `e2e` job (needs quality): browser cache keyed on lockfile, `playwright install --with-deps chromium`, `pnpm e2e`, artifacts on failure. Triggers pull_request + push main + workflow_dispatch; per-ref concurrency cancel; `permissions: contents: read`. Stages 6/7/9 (integration/build/gates) deliberately absent — placeholders documented in the file header.
- Runner pinned `ubuntu-24.04` (ubuntu-latest flips to Ubuntu 26 on 2026-10-19 — upgrades stay deliberate); actions on node24 majors (checkout v7, setup-node v7, cache v6, upload-artifact v7, pnpm/action-setup v6, setup-bun v2) after run 1 flagged Node-20 deprecation.
- **Draft PR #1 opened early** (deviation, logged below): CI must run "on every PR", so the phase branch was pushed and its eventual PR opened as draft right after the workflow landed; marked ready at phase end.
- Proven on GitHub: green run (quality 38s cold, e2e 43s cold, 4/4 specs) → turbo prefix-cache restore (quality 15s) + browser-cache restore → **deliberate red** (temp commit fails an e2e assertion): e2e job X with retries visible, `upload-artifact@v7` step ✓ + `playwright-artifacts` present on the run, quality job unaffected; reverted, green again. En-route lesson (cost one run): `toHaveText("شرق ")` PASSES against `شرق` — Playwright normalizes whitespace; first "failing" attempt was green and was reset off the branch.
- CHORE only — no FR/EC ids.

### 2026-10-18 — Phase 0 task 5 (row 5): Playwright scaffold
- Catalog grew: `@playwright/test` 1.64.1, `@axe-core/playwright` 4.14.0, `playwright-core` 1.64.1. `apps/web` devDeps (catalog:) + `e2e: playwright test` script; chromium v1248 (CfT 156) installed host-wide.
- `apps/web/playwright.config.ts`: testDir `e2e`, chromium-only via device descriptors; projects `desktop-RTL` (Desktop Chrome, viewport 1280×720) + `mobile` (Pixel 7); shared context `locale ar-EG` + `timezoneId Africa/Cairo` (TESTING §13); `trace: retain-on-failure` + `screenshot: only-on-failure`; CI: `workers 2` (TESTING §3 minimum), `retries 1`, `forbidOnly`; reporter list + html(`open:never`), `github` on CI; `baseURL :5173` ready for the Vite task (no webServer yet — that task adds it).
- `e2e/hello.spec.ts` (TEMP hello-wiring, grep-able): RTL render assert + axe zero-critical scan, both via `page.setContent` (no server exists yet); replaced by `page.goto("/")` when Vite+RRv7 lands. `e2e/.gitkeep` removed.
- Wiring: web tsconfig `include` now `app, e2e, vitest.config.ts, playwright.config.ts` (specs + configs typechecked — vitest.config.ts was silently uncovered before, drift fixed); turbo `lint`/`typecheck` inputs gained `e2e/**` + `playwright.config.ts`/`vitest.config.ts`.
- Proven: green 4/4 via root `pnpm e2e` (turbo `cache:false` honored — "cache bypass, force executing"); red-proven on desktop-RTL — empty `<button>` → axe `button-name` critical fails the scan with full violation detail, and `test-results/<test>/trace.zip` retained (`playwright show-trace` usage printed by the runner). Full `turbo run lint typecheck test line-count --force` 23/23; prettier clean. One en-route fix: reporter array literal needed explicit `ReporterDescription[]` typing under TS strict.
- CHORE only — no FR/EC ids.

### 2026-10-18 — Phase 0 tasks 4+7 (rows 4 & 7): test runners + hello specs red→green
- Commit 1 (CHORE, green): `apps/api` skeleton (§8.1: src/index, src/app, db/plugins/modules/lib, tests; dev/build/lint/typecheck/line-count scripts, `bun build --target=bun` verified) + `apps/web` skeleton (app/routes, features, lib, styles, test, e2e; vitest.config.ts + setup.ts with explicit RTL cleanup — globals off; lint/typecheck/line-count). Catalog grew: @types/bun 1.2.23 (matches host bun 1.2.21 line), @types/node 24.19.2, @types/react(-dom) 19.3.0, @testing-library/{react 16.3.3, dom 10.4.2, jest-dom 7.0.1}, jsdom 30.1.3, vite 7.3.7, vitest 5.0.5 (vite is a required vitest peer; 7.x picked as the RRv7-compat-safe line). turbo lint/typecheck inputs broadened for `app/**`, `tests/**`, `e2e/**`, `vitest.config.ts`.
- Commit 2 (test: red): `test` scripts land WITH the hello specs so no commit is red-on-empty (bun test exits 1 with zero test files): schemas/payroll/locales/api assert a not-yet-existing `runnerInfo` export (clean-compile cast → pure assertion red: Expected "bun"/Received undefined); web imports a missing `./hello` (vitest resolve error). All 5 tasks red for the designed reasons, verified individually.
- Commit 3 (test: green): one-line TEMP `runnerInfo = "bun"` exports + `apps/web/app/hello.tsx` (`<div>شرق</div>`; jest-dom `toBeInTheDocument` proves setup). Full gate `turbo run lint typecheck test line-count build --force`: 24/24 green; prettier clean; `pnpm test` 5/5.
- Fixes en route: TS 6.0.3 did not auto-include `@types/bun` for `bun:test` ambient modules → explicit `"types": ["@types/bun"]` in schemas/payroll/locales/api tsconfigs (Bun's documented snippet).
- CHORE only — no FR/EC ids.

### 2026-10-18 — Phase 0 task 3: line-count gate (script + exemptions + turbo task)
- `tooling/check-line-count.mjs` (Node, ~190 lines): counts non-blank/non-comment lines per SPEC §9.2 exactly — comment trivia comes from the TypeScript scanner (root devDep `typescript: catalog:`), so `//` in strings/URLs/templates is never a comment; code lines with trailing comments count; pure-comment and blank lines don't; CRLF + BOM safe. Scans the invoking workspace (cwd) recursively for `.ts/.tsx` (skips node_modules/dist/coverage/.turbo/.git), reports repo-relative paths.
- `.linecount-exemptions.json` at root: strict shape `{exemptions: {path: {reason, reviewDate}}}`, starts empty (shadcn entries land with task 8). Validation is global (every package's run validates the whole list): non-POSIX/`..` paths, missing/extra keys, empty reason, non-real `YYYY-MM-DD` (round-trip check, rejects 2026-02-31), **expired review date = error**, stale entry (file gone) = error, under-limit entry = warning. Exempted over-limit files pass but are listed.
- Wiring: `line-count` script (`node ../../tooling/check-line-count.mjs`) in schemas/payroll/locales/ui; turbo `line-count` inputs widened to `**/*.ts(x)` + the gate files themselves (formatting the script invalidated all caches — proven).
- Red-test proven: 151-line plain fixture and a comment-exactness fixture (128 plain + trailing-comment + template-`//` + URL lines = exactly 151) both FAIL at exactly 151 — and ESLint `max-lines` independently reports 151 on the same file (dual gate, identical semantics); CRLF+BOM fixture at 150 passes, at 151 fails at 151. Exemption lifecycle: valid→exempt-listed, missing reason/extra key/backslash path/impossible date/non-date/broken JSON/wrong shape/missing file/past review date all FAIL; under-limit entry warns. All fixtures removed after; full `turbo run lint typecheck test line-count` 12/12 green; prettier clean.
- CHORE only — no FR/EC ids.

### 2026-10-18 — Phase 0 task 2: tsconfig bases + ESLint flat config
- `@sharq/tsconfig`: `base.json` (strict, `module: preserve`, `moduleResolution: bundler`, `verbatimModuleSyntax`, `noEmit`) + `pkg.json` + `app.json` (DOM + `react-jsx`); wired as devDep + `tsconfig.json` + `typecheck` script in schemas/payroll/locales/ui (ui adds DOM lib + jsx).
- `@sharq/eslint-config` (flat, ESLint 10): §9.3 thresholds verbatim (max-lines 150, max-lines-per-function 60, complexity 10, max-params 4, max-depth 3, react-hooks/exhaustive-deps error, import/order warn), §9.1 bans (drizzle/bun imports + `fetch` global outside sanctioned contexts), `packageZones()` enforcing §8.2 downward-only edges via `import/no-restricted-paths` (plain dir paths — glob zones break on Windows minimatch; zone `target`=importer, `from`=banned source). Per-package `eslint.config.js` + `lint` script. `eslint` added to catalog; turbo `lint`/`typecheck` tasks got explicit `inputs` hashing the shared config packages (consumer caches were blind to config changes); `.prettierignore` protects client docs from `format`.
- Red-test proven: zones (schemas→locales import), fetch ban, and max-lines all fire on deliberate violations; removed after. Unresolved-import violations fall to typecheck (zones only see resolvable imports) — layered coverage as designed.
- CHORE only — no FR/EC ids. Committed as `phase 0: tsconfig bases + eslint flat config, zones proven (CHORE)`.

### 2026-10-18 — Phase 0 task 1: monorepo skeleton
- Cut `phase/0-foundation` from fresh `main`. Added root `package.json` (turbo 2.11.9, prettier 3.9.10, §8.4 scripts minus `db:*`/`seed` which need apps), `pnpm-workspace.yaml` with the `catalog:` block (react 19.3.1, typescript 7.0.2, typebox 0.34.52, tailwindcss 4.3.3, tanstack table/query/virtual, date-fns 4.4.0, i18next 26.5.2, react-i18next 17.1.0), `turbo.json` (tasks: dev/build/lint/typecheck/test/line-count/e2e per §8.4), and the six `@sharq/*` packages with placeholder `src/index.ts` and §8.2 dependency edges (ui→schemas+locales, payroll→schemas, locales→schemas, schemas→typebox).
- Verified: `pnpm install` green (7 projects, catalog resolved), `pnpm turbo run build lint typecheck test line-count` exit 0 (0 tasks — runners land tasks 2/4), `pnpm -r ls` shows exact §8.2 edges.
- CHORE only — no FR/EC ids. Committed as `phase 0: turborepo + pnpm workspaces + catalog (CHORE)`.

### 2026-10-18 — repo About section + releases
- Set repo description (bilingual) and 20 topics; published release `docs-v1.1` (planning baseline); added the release policy to AGENTS.md Branch & PR workflow (phase tags after each merge, `v1.0.0` at Phase 9).

### 2026-10-18 — repo created & pushed
- Created private GitHub repo `Mohamed-El-Sharqawy/sharq`, added `origin`, pushed `main` (docs baseline + review workflow commits). PR flow active; Phase 0 can start on `phase/0-foundation`.

### 2026-10-18 — review workflow
- AGENTS.md: added Branch & PR workflow — `phase/<n>-<slug>` branch per phase, one PR per phase, client reviews and merges, no self-merge, next phase waits for merge. ROADMAP DoD + working agreements and README updated to match. Assumption: GitHub + `gh` CLI; no remote configured yet.

### 2026-10-18 — documentation & session protocol
- Wrote `docs/SPEC.md` v1.1 (22 sections; 79 FRs; 60 ECs), `docs/TESTING.md` (TDD workflow, gates, CI), `docs/ROADMAP.md` (Phases 0–9, test-first checklists), `README.md`, `AGENTS.md`, this ledger.
- All client decisions recorded in SPEC §20.1 (18 Step-A answers + quality model: TDD mandatory, Playwright for E2E).
- Theme reference image exists in repo root but is unreadable without vision — tokens are placeholders (SPEC §20 A1).
- Initialized git + `.gitignore`; committed the documentation baseline (closing ritual step 3).

## Decisions & deviations

- **Draft PR #1 opened mid-phase (2026-10-18, task 6):** the CI task demands the workflow run *on every PR*, so the phase's PR exists as a draft from task 6 onward and every phase-0 push exercises CI against it. NOT «in review»: marked ready only when all 14 tasks are ticked + DoD gates pass; Branch & PR workflow otherwise unchanged.
- **CI runner pinned `ubuntu-24.04`; actions on node24 majors; bun 1.2.21 in CI (2026-10-18, task 6):** `ubuntu-latest` silently flips to Ubuntu 26 on 2026-10-19 (actions/runner-images#14748) — pin now, upgrade deliberately. Node-20-targeting action majors were bumped the same day (deprecation warning). CI bun = host bun so the bun:test runtime never drifts from dev.
- **CI skeleton excludes TESTING §12 stages 6/7/9 (2026-10-18, task 6):** integration (Testcontainers) starts with Phase 1 suites; the build stage joins when web's `vite build` lands (row 8); gates (coverage thresholds + traceability + inventory parity) come with the phases that own them (traceability script per TESTING §16 when the first FR tests land). Roadmap task text scopes stages 1–5; the e2e job was added, not deferred, per the Phase DoD line "E2E hello spec runs in CI".

- **`playwright-core` pinned in catalog (2026-10-18, task 5):** `@axe-core/playwright` peers on `playwright-core`, which pnpm's `auto-install-peers` would float to *latest* on fresh installs — drifting from `@playwright/test`. Pinning `playwright-core` 1.64.1 (lockstep release line with `@playwright/test`) in the catalog + web devDeps keeps both resolvable at one exact version.
- **e2e hello spec is `setContent`-based until the Vite task (2026-10-18, task 5):** no dev server exists yet, so the scaffold proof renders inline Arabic RTL HTML instead of `page.goto("/")`; `baseURL` is pre-wired and the webServer + goto swap is part of the Vite+RRv7 task (row 8). Tracked under the same TEMP hello-wiring grep marker.
- **Web tsconfig now typechecks configs + e2e (2026-10-18, task 5):** `include` was `app` only — `vitest.config.ts` was never typechecked (turbo inputs listed it, tsconfig never included it). Both configs + `e2e/` are now in scope; drift fixed in the same session, no SPEC change needed.

- **TEMP hello-wiring artifacts, removal duty tracked (2026-10-18, tasks 4+7):** `runnerInfo` exports in schemas/locales/api/payroll `src/index.ts` + `apps/web/app/hello.tsx` + the five `hello.test.*` files are wiring proofs only. Delete when real exports/screens land (schemas+locales+api: Phase 1; payroll: Phase 3; web hello: the Vite+RR task). Grep `TEMP hello-wiring`.
- **`bun:test` types need an explicit `"types": ["@types/bun"]` (2026-10-18, task 4):** TS 6.0.3 did not auto-include the ambient `declare module "bun:test"` from bun-types via @types auto-inclusion under pnpm; Bun's documented snippet fixes it. Side effect: Bun globals typecheck inside packages — the §9.1 ESLint import bans (`bun`, `drizzle-orm`) remain the guard on src.
- **`packages/ui` test wiring deferred to the shadcn task (2026-10-18, task 4):** roadmap said "bun:test in packages/*", but TESTING §2.1 (the binding authority) scopes bun:test to schemas/payroll/locales/api; ui's destiny is component tests (Vitest+RTL, same stack as web — decide runner location when shadcn lands, row 9's render tests).
- **Test scripts land together with their first tests (2026-10-18, task 4):** `bun test` exits 1 on zero test files (vitest too), so a `test` script without tests breaks `turbo test`. Convention: a package gains its `test` script in the same (red) commit as its first spec.

- **Expired exemption review dates fail the gate (2026-10-18, task 3):** SPEC §9.2 requires "reason + review date" per entry but doesn't state expiry behavior; the script treats `reviewDate < today` as an error (review → renew or remove). This is the anti-erosion teeth SPEC §18 risk table implies; interpretation logged here, SPEC text unchanged.
- **ESLint 10 option spelling (2026-10-18, task 2):** SPEC §9.2 `max-lines` options updated from `ignoreBlankLines/ignoreComments` to `skipBlankLines/skipComments` — ESLint 10 renamed them, semantics identical. SPEC edited in the same session; threshold value (150, non-blank, non-comment) unchanged.
- **TypeScript pinned 6.0.3, not 7.0.2 (2026-10-18, task 2):** typescript-eslint 8.71 hard-refuses TS 7 (native rewrite, unsupported until typescript-eslint#10940 lands). 6.0.3 is the newest line inside its peer range; single catalog line to bump later.

## Environment notes

- Windows host; Bun only for `apps/api`; Node/pnpm for web + root; Docker required for integration tests.
- Git initialized 2026-10-18 (documentation baseline committed). If commits fail on missing identity, set a repo-local `git config user.name/user.email` and note it here.
- **PowerShell 5.1 pitfall (hit 2026-10-18):** PS text pipelines (`Set-Content -Encoding Ascii/UTF8`) corrupt UTF-8 files containing `§`/`—` and add BOMs — it mangled a package header comment once; restored via `git checkout`. Edit files with the edit tool / node / git only.
- Remote: https://github.com/Mohamed-El-Sharqawy/sharq (**public**). `gh` CLI installed and authenticated as Mohamed-El-Sharqawy — **PR flow is ACTIVE**.
- Do not attempt to read `color direction - image examle.jpg` (no vision support).
- TypeScript pinned at **6.0.3** in the catalog (was briefly 7.0.2; see Decisions). Revisit when typescript-eslint supports TS ≥7.1.
- pnpm 10.15.1 pinned via `packageManager` (12.x is available; upgrade is a deliberate future decision, not a drive-by).

## Blockers

- None.
