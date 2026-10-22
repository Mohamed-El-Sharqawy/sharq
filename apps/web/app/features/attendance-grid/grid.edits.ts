// apps/web — the §12 reducer's sheet-edit handlers (split from
// grid.reducer.ts by the §9.2 gate): EDIT_CELL / BULK_SET / MARK_ALL_PRESENT
// and the pending-change mechanics they share. Pure — the caller mints every
// clientBatchId (no Date.now/randomUUID here, TESTING §6.3).
import type {
  BulkSetAction,
  EditCellAction,
  MarkAllPresentAction,
} from "./grid.actions";
import type { CellKey, GridCell, GridState, PendingChange } from "./grid.types";
import { cellKey } from "./grid.types";
import {
  applyCellPatchToRows,
  cellAt,
  resolveBulkTargets,
  settleSync,
} from "./grid.utils";

type CellTarget = { userId: string; date: string };

type ChangeSeed = {
  key: CellKey;
  userId: string;
  date: string;
  clientBatchId: string;
  version: number | undefined;
};

/** A fresh pending change — the batch id comes from the caller so this
 * module stays deterministic (EC-17/27: idempotency keys minted at the
 * edge). version seeds from the cell the edit was based on (§10.5). */
function seedChange(seed: ChangeSeed): PendingChange {
  return { ...seed, stage: "queued" };
}

/** Shared edit/bulk mechanics per target cell: skip cells awaiting a
 * conflict decision (FR-GRID-09), seed-or-merge the pending change, overlay
 * the row. Ends by re-settling the sync line (a cleared flag fixes a cell). */
function upsertPending(
  state: GridState,
  targets: CellTarget[],
  build: (
    existing: PendingChange | undefined,
    cell: GridCell | undefined,
    target: CellTarget,
  ) => PendingChange,
): GridState {
  let pending = state.pending;
  let rows = state.rows;
  for (const target of targets) {
    const key = cellKey(target.userId, target.date);
    if (pending[key]?.stage === "conflict") continue;
    const change = build(
      pending[key],
      cellAt(rows, target.userId, target.date),
      target,
    );
    pending = { ...pending, [key]: change };
    rows = applyCellPatchToRows(rows, target.userId, target.date, change);
  }
  if (pending === state.pending) return state; // nothing selectable targeted
  return settleSync({ ...state, pending, rows }, { keepOffline: true });
}

/** EDIT_CELL merges into an existing un-flushed change (one batch per
 * un-flushed edit streak — the debounce's unit) and clears any stale
 * reject flags: the user just rewrote the cell. */
function pendingFromEdit(
  existing: PendingChange | undefined,
  action: EditCellAction,
  cellVersion: number | undefined,
): PendingChange {
  const base =
    existing ??
    seedChange({
      key: cellKey(action.userId, action.date),
      userId: action.userId,
      date: action.date,
      clientBatchId: action.clientBatchId,
      version: cellVersion,
    });
  return {
    ...base,
    statusId: action.patch.statusId ?? base.statusId,
    amountMinor: action.patch.amountMinor ?? base.amountMinor,
    // Reasons are CLEARABLE (the popover can save «none»): a present reason
    // key replaces — even with undefined — an absent key keeps the old one.
    // Amounts/statuses are never nulled by a grid flow, so they just merge.
    reason: "reason" in action.patch ? action.patch.reason : base.reason,
    stage: "queued",
    invalidCode: undefined,
    lastRejectCode: undefined,
  };
}

export function reduceEditCell(
  state: GridState,
  action: EditCellAction,
): GridState {
  const key = cellKey(action.userId, action.date);
  // A cell awaiting conflict resolution is decided first (FR-GRID-09) —
  // editing it would fork the value being decided on.
  if (state.pending[key]?.stage === "conflict") return state;
  // A member absent from the sheet cannot be edited from it (view-bug guard).
  if (!state.rows.some((row) => row.userId === action.userId)) return state;
  const target = { userId: action.userId, date: action.date };
  const next = upsertPending(state, [target], (existing, cell) =>
    pendingFromEdit(existing, action, cell?.version),
  );
  if (next === state) return state;
  return { ...next, editing: { userId: action.userId, date: action.date } };
}

/** §12 «نفس المبلغ للكل»: one amount + (optional) popover reason onto every
 * selected cell/row. The bulk reason replaces per-cell reasons — the popover
 * gathered it for exactly this application. */
export function reduceBulkSet(
  state: GridState,
  action: BulkSetAction,
): GridState {
  return upsertPending(
    state,
    resolveBulkTargets(state.rows, state.selection),
    (existing, cell, target) => ({
      ...(existing ??
        seedChange({
          key: cellKey(target.userId, target.date),
          ...target,
          clientBatchId: action.clientBatchId,
          version: cell?.version,
        })),
      amountMinor: action.amountMinor,
      reason: action.reason,
      stage: "queued",
      invalidCode: undefined,
      lastRejectCode: undefined,
    }),
  );
}

/** §12 «تحديد الكل حضور» for one day: every member row gets the status; a
 * day with no amount yet is prefilled with its base (FR-ATT-01's prefill). */
export function reduceMarkAllPresent(
  state: GridState,
  action: MarkAllPresentAction,
): GridState {
  const targets = state.rows.map((row) => ({
    userId: row.userId,
    date: action.date,
  }));
  return upsertPending(state, targets, (existing, cell, target) => ({
    ...(existing ??
      seedChange({
        key: cellKey(target.userId, target.date),
        ...target,
        clientBatchId: action.clientBatchId,
        version: cell?.version,
      })),
    statusId: action.statusId,
    amountMinor: cell?.amountMinor ?? cell?.baseMinor ?? existing?.amountMinor,
    stage: "queued",
    invalidCode: undefined,
    lastRejectCode: undefined,
  }));
}
