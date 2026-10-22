// apps/web — the §12 reducer's save-lifecycle side: SAVING/SAVED batch
// transitions (single-flight batches, §10.5), the OFFLINE flips (FR-ATT-09)
// and the stale-settings delta (§5.8/EC-48/49). Pure, like the sheet side.
import type { ApiErrorCode } from "@sharq/schemas";
import type {
  OfflineAction,
  SavedAction,
  SettingsDeltaAction,
  SavingAction,
  SyncSideAction,
} from "./grid.actions";
import { reduceConflictResolve, reduceReject } from "./grid.conflicts";
import type {
  CellKey,
  GridRow,
  GridSettingsSnapshot,
  GridState,
  PendingChange,
} from "./grid.types";
import {
  cellAt,
  hasReasonContent,
  isOverrideFor,
  pendingEntries,
  settleSync,
} from "./grid.utils";

function reduceSaving(state: GridState, action: SavingAction): GridState {
  // Nothing leaves while offline (FR-ATT-09) — the outbox replays later.
  if (state.sync === "offline") return state;
  let touched = false;
  const pending: Record<CellKey, PendingChange> = {};
  for (const [key, change] of pendingEntries(state.pending)) {
    if (change.clientBatchId !== action.batchId) {
      pending[key] = change;
      continue;
    }
    touched = true;
    pending[key] = { ...change, stage: "in-flight", lastRejectCode: undefined };
  }
  return touched ? settleSync({ ...state, pending }) : state;
}

function reduceSaved(state: GridState, action: SavedAction): GridState {
  const applied = new Set(action.keys);
  let touched = false;
  const pending: Record<CellKey, PendingChange> = {};
  for (const [key, change] of pendingEntries(state.pending)) {
    // A conflicted cell is never dropped by a late ack — the decision rules.
    if (
      change.clientBatchId === action.batchId &&
      applied.has(key) &&
      change.stage !== "conflict"
    ) {
      touched = true;
      continue; // acked → leaves the overlay; server truth arrives via refetch
    }
    pending[key] = change;
  }
  // A replayed/double ack still settles the header line (idempotent).
  return settleSync(touched ? { ...state, pending } : state, {
    keepOffline: true,
  });
}

function reduceOffline(state: GridState, action: OfflineAction): GridState {
  if (!action.offline) return settleSync(state);
  // In-flight requests may still land (their SAVED/REJECT is processed);
  // queued items wait for the replay (FR-ATT-09).
  return { ...state, sync: "offline" };
}

/** EC-49: queued pendings re-validated IN PLACE against the FRESH §5.2
 * values — flagged, never dropped. Conflict/in-flight items keep their
 * stage (a decision or an ack governs them, not the settings). */
function reduceSettingsDelta(
  state: GridState,
  action: SettingsDeltaAction,
): GridState {
  const pending: Record<CellKey, PendingChange> = {};
  for (const [key, change] of pendingEntries(state.pending)) {
    pending[key] = revalidatePending(change, action.delta.fresh, state.rows);
  }
  return settleSync(
    { ...state, pending, staleSettings: action.delta },
    {
      keepOffline: true,
    },
  );
}

function revalidatePending(
  change: PendingChange,
  fresh: GridSettingsSnapshot,
  rows: GridRow[],
): PendingChange {
  if (change.stage !== "queued") return change;
  const invalidCode = pendingInvalidCode(change, fresh, rows);
  if (invalidCode === undefined) {
    return change.invalidCode === undefined
      ? change
      : { ...change, invalidCode: undefined };
  }
  return { ...change, invalidCode };
}

/** The amount half of EC-32..35: fresh bounds, then the quick-picks-only
 * mode (the pick list a rejection must show is the view's job). */
function amountOutOfBounds(
  amountMinor: number,
  fresh: GridSettingsSnapshot,
): boolean {
  if (
    amountMinor < fresh["attendance.amount.minMinor"] ||
    amountMinor > fresh["attendance.amount.maxMinor"]
  )
    return true;
  return (
    fresh["attendance.entryMode"] === "quick_picks_only" &&
    !fresh["attendance.quickPicks"].includes(amountMinor)
  );
}

function pendingInvalidCode(
  change: PendingChange,
  fresh: GridSettingsSnapshot,
  rows: GridRow[],
): ApiErrorCode | undefined {
  if (change.amountMinor === undefined) return undefined; // status-only change
  if (amountOutOfBounds(change.amountMinor, fresh))
    return "AMOUNT_OUT_OF_BOUNDS";
  const base = cellAt(rows, change.userId, change.date)?.baseMinor ?? null;
  const override = isOverrideFor(change.amountMinor, base);
  if (
    override &&
    fresh["attendance.reason.requiredOnOverride"] &&
    !hasReasonContent(change.reason)
  )
    return "REASON_REQUIRED";
  return undefined;
}

/** The server-event half of the §12 action union (grid.reducer.ts routes it
 * here — the union partitions by type, see grid.types.ts). */
export function reduceSyncSide(
  state: GridState,
  action: SyncSideAction,
): GridState {
  switch (action.type) {
    case "SAVING":
      return reduceSaving(state, action);
    case "SAVED":
      return reduceSaved(state, action);
    case "OFFLINE":
      return reduceOffline(state, action);
    case "REJECT":
      return reduceReject(state, action);
    case "CONFLICT_RESOLVE":
      return reduceConflictResolve(state, action);
    case "SETTINGS_DELTA":
      return reduceSettingsDelta(state, action);
  }
}
