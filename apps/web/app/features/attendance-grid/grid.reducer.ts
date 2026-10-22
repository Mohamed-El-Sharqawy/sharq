// apps/web — the §12 grid reducer (SPEC §9.4 grid.reducer.ts): one pure
// (state, action) → state entry point over the sheet's local half —
// selection, editing focus, query hydration and RESET — plus the routing
// into the split handler modules (§9.2 gate): edits in grid.edits.ts, the
// server-event half in grid.sync.ts, conflicts in grid.conflicts.ts, math in
// grid.utils.ts. Purity (TESTING §6.3): no Date.now/randomUUID — the caller
// mints every clientBatchId; no mutation — every transition allocates.
import type {
  GridAction,
  QuerySyncedAction,
  SelectAction,
  SheetSideAction,
  SyncSideAction,
} from "./grid.actions";
import {
  reduceBulkSet,
  reduceEditCell,
  reduceMarkAllPresent,
} from "./grid.edits";
import { reduceSyncSide } from "./grid.sync";
import type { GridState } from "./grid.types";
import { cellKey } from "./grid.types";
import { applyPendingOverlay } from "./grid.utils";

export function initialGridState(): GridState {
  return {
    rows: [],
    editing: null,
    selection: new Set(),
    pending: {},
    sync: "idle",
    conflicts: [],
    staleSettings: null,
  };
}

function reduceSelect(state: GridState, action: SelectAction): GridState {
  if (action.target === null)
    return { ...state, selection: new Set(), editing: null };
  const selection = new Set(state.selection);
  if (action.mode === "set") {
    selection.clear();
    selection.add(action.target);
  } else if (selection.has(action.target)) {
    selection.delete(action.target);
  } else {
    selection.add(action.target);
  }
  // Clicking another cell/row closes the open editor (Excel behavior); the
  // inline input commits via its own EDIT_CELL dispatch before this lands.
  const editing =
    state.editing &&
    cellKey(state.editing.userId, state.editing.date) === action.target
      ? state.editing
      : null;
  return { ...state, selection, editing };
}

function reduceQuerySynced(
  state: GridState,
  action: QuerySyncedAction,
): GridState {
  return { ...state, rows: applyPendingOverlay(action.rows, state.pending) };
}

function reduceSheetSide(state: GridState, action: SheetSideAction): GridState {
  switch (action.type) {
    case "EDIT_CELL":
      return reduceEditCell(state, action);
    case "SELECT":
      return reduceSelect(state, action);
    case "BULK_SET":
      return reduceBulkSet(state, action);
    case "MARK_ALL_PRESENT":
      return reduceMarkAllPresent(state, action);
    case "QUERY_SYNCED":
      return reduceQuerySynced(state, action);
    case "RESET":
      return initialGridState();
  }
}

const SYNC_SIDE_TYPES: ReadonlySet<GridAction["type"]> = new Set([
  "SAVING",
  "SAVED",
  "OFFLINE",
  "REJECT",
  "CONFLICT_RESOLVE",
  "SETTINGS_DELTA",
]);

/** The §12 reducer entry point. The action union partitions into sheet-side
 * and sync-side (grid.actions.ts) — the membership check and the casts below
 * agree by construction. */
export function gridReducer(state: GridState, action: GridAction): GridState {
  if (SYNC_SIDE_TYPES.has(action.type))
    return reduceSyncSide(state, action as SyncSideAction);
  return reduceSheetSide(state, action as SheetSideAction);
}
