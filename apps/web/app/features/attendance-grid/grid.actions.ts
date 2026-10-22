// apps/web — the §12 grid reducer's ACTION types (split from grid.types.ts
// by the §9.2 gate; that file keeps the state/data types + CellKey helpers).
// Action NAMES are §12-verbatim; payloads carry what the SPEC's hints leave
// open (clientBatchId minted by the caller, per-row results on SAVED).
import type { ApiErrorCode } from "@sharq/schemas";
import type {
  CellKey,
  ConflictServerValue,
  EntryReason,
  GridRow,
  GridSettingsDelta,
  RowKey,
} from "./grid.types";

/** The cell fields an edit/bulk action may change. */
export type CellEditPatch = {
  statusId?: string;
  amountMinor?: number;
  reason?: EntryReason;
};

export type ConflictPick = "local" | "server";

export type EditCellAction = {
  type: "EDIT_CELL";
  userId: string;
  date: string;
  patch: CellEditPatch;
  clientBatchId: string;
};
export type SelectAction = {
  type: "SELECT";
  target: CellKey | RowKey | null;
  mode?: "toggle" | "set";
};
export type BulkSetAction = {
  type: "BULK_SET";
  amountMinor: number;
  reason?: EntryReason;
  clientBatchId: string;
};
export type MarkAllPresentAction = {
  type: "MARK_ALL_PRESENT";
  date: string;
  statusId: string;
  clientBatchId: string;
};
export type SavingAction = { type: "SAVING"; batchId: string };
/** §10.5 returns per-row results: SAVED carries the batch's APPLIED keys;
 * each rejected row arrives as its own REJECT. */
export type SavedAction = {
  type: "SAVED";
  batchId: string;
  keys: readonly CellKey[];
};
export type OfflineAction = { type: "OFFLINE"; offline: boolean };
export type RejectAction = {
  type: "REJECT";
  key: CellKey;
  code: ApiErrorCode;
  currentValue?: ConflictServerValue;
  batchId?: string;
};
export type ConflictResolveAction = {
  type: "CONFLICT_RESOLVE";
  key: CellKey;
  pick: ConflictPick;
  clientBatchId?: string;
};
export type SettingsDeltaAction = {
  type: "SETTINGS_DELTA";
  delta: GridSettingsDelta;
};
/** The data-in channel §12's action list omits: the hook dispatches it on
 * query load/refetch so state.rows stays "query + overlay" (§12 comment). */
export type QuerySyncedAction = { type: "QUERY_SYNCED"; rows: GridRow[] };
export type ResetAction = { type: "RESET" };

/** §12 Actions, names verbatim + QUERY_SYNCED (see above). */
export type GridAction =
  | EditCellAction
  | SelectAction
  | BulkSetAction
  | MarkAllPresentAction
  | SavingAction
  | SavedAction
  | OfflineAction
  | RejectAction
  | ConflictResolveAction
  | SettingsDeltaAction
  | QuerySyncedAction
  | ResetAction;

/** The server-driven half of the union (grid.sync.ts handles it). */
export type SyncSideAction =
  | SavingAction
  | SavedAction
  | OfflineAction
  | RejectAction
  | ConflictResolveAction
  | SettingsDeltaAction;

/** The local/sheet half (grid.reducer.ts + grid.edits.ts handle it). */
export type SheetSideAction = Exclude<GridAction, SyncSideAction>;
