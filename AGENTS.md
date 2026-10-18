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
3. If PROGRESS shows a phase **in review (PR open)**: work only that PR per the Branch & PR workflow below (address feedback, or report and stop) — never start the next phase before the PR is merged.
4. Branch: all phase work lands on `phase/<n>-<slug>` (e.g. `phase/0-foundation`), created from fresh `main` if missing. Docs-only protocol changes ride a small `docs/*` branch + PR — `main` is protected (2026-10-18: PR required, strict required CI checks, no direct/force pushes, no deletions, admins included).
5. Reconcile drift: if PROGRESS and the ROADMAP checkboxes disagree, ROADMAP wins for task state — fix PROGRESS and log the discrepancy.
6. Sanity-check the environment (`pnpm install`, then `pnpm test` once code exists). If red for reasons unrelated to your task, stop and log it in PROGRESS; do not fix silently.
7. Work the task in **Next task**, or the next unticked task of the current phase. One task ≈ one working session (half a day); smaller is fine — tick and log.

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
3. **Commit to the phase branch**: message `phase N: <task> (FR-xxx/EC-xxx)`; docs updates ride in the same commit. Phase work never lands on `main` directly.
4. **Phase end → PR**: when every task of the phase is ticked and the DoD gates (TESTING §11/§12) pass — push the branch and open a PR titled `Phase N: <name>` (body: ticked task checklist, gate evidence, FR/EC ids covered, how to run the tests). Record it in PROGRESS as «Phase N — in review (PR #x)». **Never merge or approve your own PR, and never start the next phase before it is merged** — the client reviews and merges.
5. **Done-check** — the ritual is complete only when: *a brand-new session reading nothing but `PROGRESS.md` + `ROADMAP.md` can state the next task (or the open PR to attend to) and start working without asking anyone anything.* If it couldn't, the ledger isn't finished — revise PROGRESS until it could.

## Branch & PR workflow

- One branch per phase: `phase/<n>-<slug>` (short kebab name, e.g. `phase/4-attendance-grid`), cut from fresh `main` (`git fetch; git switch main; git pull` first). All session commits of that phase land on it.
- One open phase PR at a time; phases are sequential — phase N+1 starts only after N is merged.
- While a PR is open, a session's only work is that PR: address requested changes on the branch, push, update PROGRESS. If `gh pr view` shows **merged**, record «Phase N complete (date)» in PROGRESS and start the next branch.
- No remote yet (`git remote` empty): keep committing to the local phase branch, log a blocker in PROGRESS with the setup command (`git remote add origin <url>`, then push), and open the PR as soon as the remote exists.
- `gh` missing or unauthenticated: push the branch and log the compare URL (`<repo-url>/compare/main...<branch>`) so the client can open the PR manually.
- Platform assumption: GitHub + `gh` CLI (adjust commands if the client hosts elsewhere).
- Releases: after recording a merged phase PR — and before starting the next branch — tag it (`git tag phase-<n>; git push --tags`) and publish `gh release create phase-<n> --generate-notes` with the ticked checklist as notes. Milestones: `v1.0.0` when Phase 9 merges.

## Environment facts (cached so you don't rediscover them)

- Windows host. Bun runs only `apps/api` and its tests; Node/pnpm tooling runs web + root (SPEC §8.4).
- Docker Desktop must be running for integration tests (Testcontainers Postgres).
- Git initialized (docs baseline on `main`); **no remote yet** — GitHub + `gh` CLI assumed for the PR flow (Branch & PR workflow above).
- `color direction - image examle.jpg` (repo root) is the client's theme reference. It **cannot be read without vision** — never attempt to read it; theme tokens are placeholders pending a text description (SPEC §14.4, §20 A1).
- Deploy target: Coolify on a Hostinger VPS, one domain, Traefik `/api` routing (SPEC §8.4).
