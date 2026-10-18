# PROGRESS.md — the ledger

Single source of truth for "where are we". Updated only via the AGENTS.md closing ritual. Per-task status lives in `ROADMAP.md` checkboxes; requirements live in `SPEC.md`. Nothing is duplicated here beyond the pointer.

## Current position

- **Phase:** 0 — Monorepo, design system & test infrastructure
- **Status:** documentation complete; no code yet (git initialized, no packages, no CI).

## Next task

- [ ] CHORE: Turborepo + pnpm workspaces + `catalog:`; packages `schemas/payroll/locales/ui/tsconfig/eslint-config` (SPEC §8.1)

## Session log (newest first)

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
- Do not attempt to read `color direction - image examle.jpg` (no vision support).

## Blockers

- None.
