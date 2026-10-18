# PROGRESS.md — the ledger

Single source of truth for "where are we". Updated only via the AGENTS.md closing ritual. Per-task status lives in `ROADMAP.md` checkboxes; requirements live in `SPEC.md`. Nothing is duplicated here beyond the pointer.

## Current position

- **Phase:** 0 — Monorepo, design system & test infrastructure
- **Status:** task 1/13 done — monorepo skeleton green (pnpm workspaces + `catalog:` + Turborepo + all 6 `@sharq/*` packages with §8.2 edges); no runners/config wired yet.

## Next task

- [ ] CHORE: shared tsconfig bases + ESLint flat config with import zones, 150-line rule, complexity thresholds (SPEC §9.2/9.3)

## Session log (newest first)

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

- None yet. Rule: any deviation updates SPEC.md first, in the same session it happens.

## Environment notes

- Windows host; Bun only for `apps/api`; Node/pnpm for web + root; Docker required for integration tests.
- Git initialized 2026-10-18 (documentation baseline committed). If commits fail on missing identity, set a repo-local `git config user.name/user.email` and note it here.
- Remote: https://github.com/Mohamed-El-Sharqawy/sharq (**public**). `gh` CLI installed and authenticated as Mohamed-El-Sharqawy — **PR flow is ACTIVE**.
- Do not attempt to read `color direction - image examle.jpg` (no vision support).
- TypeScript pinned at **7.0.2** (the Go-native line; 5.x is EOL — dist-tags show 6.0-beta → 7.0.2 latest). If TS7 config incompatibility appears in task 2, bump within `pnpm-workspace.yaml` catalog (one line).
- pnpm 10.15.1 pinned via `packageManager` (12.x is available; upgrade is a deliberate future decision, not a drive-by).

## Blockers

- None.
