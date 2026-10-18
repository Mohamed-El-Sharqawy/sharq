# AGENTS.md — session protocol for شرق (Sharq)

You are building the app described in `docs/SPEC.md` on the plan in `docs/ROADMAP.md`. This file is the operating protocol. Read it fully once; obey **Session boot** and **Closing ritual** every session, without being asked.

## Document map (read on trigger, not all at once)

| File | Reach it when… |
|---|---|
| `docs/PROGRESS.md` | **Always first, every session.** The ledger: current phase, the exact next task, last session's log, deviations, blockers. |
| `docs/ROADMAP.md` | Picking or finishing a task. Its checkboxes are the single per-task source of truth. |
| `docs/SPEC.md` | Implementing anything — rules, FR-\*/EC-\* ids, data model, endpoint inventory, screens. If code and SPEC disagree, SPEC wins; a legitimate change updates SPEC first. |
| `docs/TESTING.md` | Before writing any test, when a CI gate fails, when coverage/traceability complains. |

## Session boot

1. Read `docs/PROGRESS.md` in full.
2. Open the ROADMAP phase it names; re-read that phase's tasks and Definition of Done.
3. Reconcile drift: if PROGRESS and the ROADMAP checkboxes disagree, ROADMAP wins for task state — fix PROGRESS and log the discrepancy.
4. Sanity-check the environment (`pnpm install`, then `pnpm test` once code exists). If red for reasons unrelated to your task, stop and log it in PROGRESS; do not fix silently.
5. Work the task in **Next task**, or the next unticked task of the current phase. One task ≈ one working session (half a day); smaller is fine — tick and log.

## Working rules (pointers, not summaries — the docs carry the detail)

- TDD is mandatory: red → green → refactor, scope in TESTING §4; tests are named after FR-\*/EC-\* ids.
- No source file over 150 non-blank, non-comment lines (SPEC §9.2).
- No hard-coded business value: every number/list/enum is a SPEC §5 settings row or marked "fixed in code" with a reason.
- Money is integer minor units; Arabic strings live only in `@sharq/locales`; all other standards in SPEC §9.

## Closing ritual (never end a session without it)

1. **Tick** every task finished this session in `docs/ROADMAP.md` (`[ ]` → `[x]`). A task counts as finished only when its tests are green and the phase gates (TESTING §11) pass. In doubt = unticked.
2. **Update the ledger** `docs/PROGRESS.md`:
   - *Current position*: phase + one status line; when a phase's DoD is met, record «Phase N complete (date)».
   - *Next task*: copy the exact next roadmap line, so a fresh session needs zero searching.
   - *Session log* (prepend, dated, one short paragraph): what was done, files touched, FR/EC ids covered.
   - *Decisions & deviations*: anything diverging from SPEC — SPEC updated in the same session (SPEC → tests → code, in that order).
   - *Environment notes / blockers*.
3. **Commit**: if `.git` is missing (first implementation session), `git init` first. Message: `phase N: <task> (FR-xxx/EC-xxx)`. Docs updates ride in the same commit.
4. **Done-check** — the ritual is complete only when: *a brand-new session reading nothing but `PROGRESS.md` + `ROADMAP.md` can state the next task and start working without asking anyone anything.* If it couldn't, the ledger isn't finished — revise PROGRESS until it could.

## Environment facts (cached so you don't rediscover them)

- Windows host. Bun runs only `apps/api` and its tests; Node/pnpm tooling runs web + root (SPEC §8.4).
- Docker Desktop must be running for integration tests (Testcontainers Postgres).
- Repo starts **without git** — the first implementation session initializes it (Closing ritual step 3).
- `color direction - image examle.jpg` (repo root) is the client's theme reference. It **cannot be read without vision** — never attempt to read it; theme tokens are placeholders pending a text description (SPEC §14.4, §20 A1).
- Deploy target: Coolify on a Hostinger VPS, one domain, Traefik `/api` routing (SPEC §8.4).
