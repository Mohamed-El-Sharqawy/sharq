// apps/web — the §12 reducer's conflict/reject side: per-row rejects from the
// bulk endpoint (§10.5), 409 CONFLICT_VERSION conflict-list population
// (EC-16/FR-GRID-09) and the supervisor's resolution. Pure — ids and server
// values arrive inside the actions.
import type { ApiErrorCode } from "@sharq/schemas";
import type { ConflictResolveAction, RejectAction } from "./grid.actions";
import type { GridState, PendingChange } from "./grid.types";
import {
  applyCellPatchToRows,
  rebaseCellOnServer,
  settleSync,
} from "./grid.utils";

/** Rejects that will fail again unchanged — the cell is FLAGGED (invalidCode)
 * for the supervisor to fix, never dropped (EC-49 semantics). Everything else
 * (transport loss, RATE_LIMITED, DUPLICATE races, session events) stays
 * retryable via lastRejectCode; the 401/403 session flow is the hook's duty
 * (EC-39), not the reducer's. SETTINGS_CHANGED rides SETTINGS_DELTA instead. */
const DETERMINISTIC_REJECTS: ReadonlySet<ApiErrorCode> = new Set([
  "VALIDATION_FAILED",
  "AMOUNT_OUT_OF_BOUNDS",
  "REASON_REQUIRED",
  "EDIT_WINDOW_CLOSED",
  "PERIOD_LOCKED",
  "PERIOD_PAID",
  "NOT_FOUND",
]);

export function reduceReject(
  state: GridState,
  action: RejectAction,
): GridState {
  const existing = state.pending[action.key];
  // Nothing of ours failed — still settle the header line.
  if (!existing) return settleSync(state, { keepOffline: true });
  return action.code === "CONFLICT_VERSION"
    ? conflictFrom(state, action, existing)
    : rejectPlain(state, action, existing);
}

function rejectPlain(
  state: GridState,
  action: RejectAction,
  existing: PendingChange,
): GridState {
  const deterministic = DETERMINISTIC_REJECTS.has(action.code);
  const change: PendingChange = {
    ...existing,
    stage: "queued",
    invalidCode: deterministic ? action.code : existing.invalidCode,
    lastRejectCode: deterministic ? undefined : action.code,
    serverValue: action.currentValue ?? existing.serverValue,
  };
  const rows = action.currentValue
    ? rebaseCellOnServer(state.rows, action.key, action.currentValue)
    : state.rows;
  return settleSync(
    { ...state, pending: { ...state.pending, [action.key]: change }, rows },
    { keepOffline: true },
  );
}

/** 409 CONFLICT_VERSION (EC-16): the cell joins the decision queue, its
 * display re-bases on the fresh server value, and the local value survives
 * inside the pending change for the both-values dialog (FR-GRID-09). */
function conflictFrom(
  state: GridState,
  action: RejectAction,
  existing: PendingChange,
): GridState {
  const change: PendingChange = {
    ...existing,
    stage: "conflict",
    serverValue: action.currentValue ?? existing.serverValue,
    lastRejectCode: undefined,
  };
  const conflicts = state.conflicts.includes(action.key)
    ? state.conflicts
    : [...state.conflicts, action.key];
  const rows = action.currentValue
    ? rebaseCellOnServer(state.rows, action.key, action.currentValue)
    : state.rows;
  return settleSync(
    {
      ...state,
      pending: { ...state.pending, [action.key]: change },
      conflicts,
      rows,
    },
    { keepOffline: true },
  );
}

/** §12 CONFLICT_RESOLVE — the supervisor picks (FR-GRID-09); never a silent
 * last-write-wins. */
export function reduceConflictResolve(
  state: GridState,
  action: ConflictResolveAction,
): GridState {
  const existing = state.pending[action.key];
  if (existing?.stage !== "conflict") return state; // nothing awaits decision
  const conflicts = state.conflicts.filter((key) => key !== action.key);
  if (action.pick === "server") {
    const pending = { ...state.pending };
    delete pending[action.key]; // the server value stands; nothing left to send
    return settleSync({ ...state, pending, conflicts }, { keepOffline: true });
  }
  // pick "local": re-queue as a NEW batch — replaying the old idempotency key
  // would return the cached 409 (§10.4) — targeting the server's current row
  // version (§10.5 change.version). Offline-safe: it waits in the outbox.
  const change: PendingChange = {
    ...existing,
    stage: "queued",
    clientBatchId: action.clientBatchId ?? existing.clientBatchId,
    version: existing.serverValue?.version ?? existing.version,
    invalidCode: undefined,
    lastRejectCode: undefined,
  };
  return settleSync(
    {
      ...state,
      pending: { ...state.pending, [action.key]: change },
      conflicts,
      rows: applyCellPatchToRows(
        state.rows,
        existing.userId,
        existing.date,
        change,
      ),
    },
    { keepOffline: true },
  );
}
