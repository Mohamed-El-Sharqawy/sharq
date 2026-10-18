# شرق (Sharq)

Payroll & attendance web app — weekly pay (Thursday/Friday) · EGP · Egyptian-Arabic RTL UI.
Stack: Turborepo + pnpm · Bun + Elysia (Postgres + Drizzle) · React + Vite (React Router v7, TanStack, shadcn/ui, PWA) · Eden Treaty.

## Documentation

| File | Contents |
|---|---|
| [docs/SPEC.md](docs/SPEC.md) | Requirements specification, Sections 1–22: vision, roles, permission matrix, functional requirements (FR IDs), dynamic configuration catalog, payroll rules, data model (ER), monorepo architecture, engineering standards (incl. TDD mandate §9.10), backend & API inventory, screens, grid/export specs, UI/UX & RTL, security, edge-case catalog (EC IDs), NFRs, assumptions, risks |
| [docs/TESTING.md](docs/TESTING.md) | TDD workflow and full test strategy: unit / integration / contract / E2E (Playwright) / a11y / visual / Excel snapshots, coverage gates, CI pipeline, traceability gates, seeding plan, what little remains manual |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phased implementation plan (Phase 0–9), test-first task checklists referencing FR/EC IDs, definitions of done, MVP marker, v1.1 backlog |
| [docs/PROGRESS.md](docs/PROGRESS.md) | **The ledger** — current phase, exact next task, session log, deviations, blockers. The resume point for any fresh session |
| `AGENTS.md` | Session protocol — document map, session boot, working rules, closing ritual, environment facts. Read automatically by coding agents each session |

## Status

- Spec **v1.1** — approved for implementation. All client decisions recorded in SPEC §20.1.
- **TDD is mandatory** (SPEC §9.10, TESTING.md §4): every acceptance criterion and every edge case is an automated test; no repeated manual regression.
- **Sessions resume with zero context**: agents read `AGENTS.md` → `docs/PROGRESS.md` → next roadmap task. Progress is only "done" when the closing ritual has updated the ledger and committed. **Each phase ships as a branch + pull request — you review and merge.**
- Theme reference `color direction - image examle.jpg` exists in the repo root but **could not be analyzed** (no image-input support in this environment). Theme tokens are placeholders — SPEC §14.4, assumption A1. Describe the palette in text (or analyze the image with a vision-capable model) and the token file is a drop-in swap.
