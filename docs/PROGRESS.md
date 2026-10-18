# PROGRESS.md — the ledger

Single source of truth for "where are we". Updated only via the AGENTS.md closing ritual. Per-task status lives in `ROADMAP.md` checkboxes; requirements live in `SPEC.md`. Nothing is duplicated here beyond the pointer.

## Current position

- **Phase:** 0 — Monorepo, design system & test infrastructure
- **Status:** tasks 1–3/13 done — monorepo skeleton, tsconfig bases + ESLint flat config, and the dual-enforced §9.2 line-count gate (script + exemptions + turbo task) all red-test-proven and green.

## Next task

- [ ] CHORE: bun:test runner wired in `packages/*` and `apps/api`; Vitest + jsdom + Testing Library in `apps/web` (TESTING §2.1)

## Session log (newest first)

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
