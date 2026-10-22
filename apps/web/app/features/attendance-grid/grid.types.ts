// apps/web — the §12 grid reducer's STATE/DATA types + CellKey helpers
// (SPEC §9.4; the §9.2 gate split the action union into grid.actions.ts).
// Pure data only — no React, no fetching. Money is integer minor units
// (§6.2); Arabic strings never appear here (machine codes only, §9's
// locales rule).
import type { ApiErrorCode, SettingValues } from "@sharq/schemas";

/** "userId::date" — the grid cell identity (§12 CellKey). */
export type CellKey = `${string}::${string}`;

/** A whole-employee selection (bulk ops expand it to the row's day cells). */
export type RowKey = string;

export function cellKey(userId: string, date: string): CellKey {
  return `${userId}::${date}`;
}

export function parseCellKey(key: CellKey): { userId: string; date: string } {
  const separator = key.indexOf("::");
  return { userId: key.slice(0, separator), date: key.slice(separator + 2) };
}

/** §10.5 bulk-change reason shape, verbatim. */
export type EntryReason = { catalogId?: string; text?: string };

/** The server's current cell on a 409 CONFLICT_VERSION (EC-16: both values
 * shown — the local value lives in the conflicted pending change). */
export type ConflictServerValue = {
  statusId: string | null;
  amountMinor: number | null;
  version: number;
  reason?: EntryReason | null;
};

/** One member × one day. Rows arrive DENSE: every period day has a cell per
 * member (amount/status null = unrecorded «مش متسجل» EC-04; baseMinor = the
 * day's effective rate §5.3, the prefill + override base; version 0 = the
 * entry does not exist server-side yet). */
export type GridCell = {
  statusId: string | null;
  amountMinor: number | null;
  baseMinor: number | null;
  isOverride: boolean;
  reason: EntryReason | null;
  version: number;
};

export type GridRow = {
  userId: RowKey;
  displayNameAr: string;
  cells: Record<string, GridCell>;
};

/** queued = awaiting its flush; in-flight = a batch is POSTing it;
 * conflict = 409 CONFLICT_VERSION, supervisor decides (FR-GRID-09). */
export type PendingStage = "queued" | "in-flight" | "conflict";

/** §12's PendingChange: one debounce/queue item carrying the §10.5 change
 * fields + the idempotency batch id (minted by the CALLER — this reducer is
 * pure: no Date.now/randomUUID inside, TESTING §6.3). invalidCode flags a
 * deterministic reject or a stale-settings re-validation (EC-49: flagged,
 * never dropped); lastRejectCode holds a transient failure awaiting retry. */
export type PendingChange = {
  key: CellKey;
  userId: string;
  date: string;
  statusId?: string;
  amountMinor?: number;
  reason?: EntryReason;
  version?: number;
  clientBatchId: string;
  stage: PendingStage;
  invalidCode?: ApiErrorCode;
  lastRejectCode?: ApiErrorCode;
  serverValue?: ConflictServerValue;
};

/** §12 verbatim: 'idle' | 'saving' | 'offline' | 'error'. */
export type SyncStatus = "idle" | "saving" | "offline" | "error";

/** The attendance-relevant resolved §5.2 keys the grid revalidates pending
 * edits against (§5.8's fresh payload; §9.8: settings are inputs, never
 * constants). Deduction rules ride along for the deductions flow (row 8). */
export type GridSettingsKey =
  | "attendance.amount.minMinor"
  | "attendance.amount.maxMinor"
  | "attendance.quickPicks"
  | "attendance.entryMode"
  | "attendance.reason.requiredOnOverride"
  | "attendance.reason.requiredOnDeduction"
  | "attendance.reason.minLength";

export type GridSettingsSnapshot = Pick<SettingValues, GridSettingsKey>;

/** §12's SettingsDelta — the 409 SETTINGS_CHANGED payload (§5.8): the fresh
 * values plus which keys moved (the banner's per-change explanation). */
export type GridSettingsDelta = {
  fresh: GridSettingsSnapshot;
  changedKeys: readonly GridSettingsKey[];
};

/** §12 State, verbatim shape (rows = query data + the pending overlay). */
export type GridState = {
  rows: GridRow[];
  editing: { userId: string; date: string } | null;
  selection: Set<CellKey | RowKey>;
  pending: Record<CellKey, PendingChange>;
  sync: SyncStatus;
  conflicts: CellKey[];
  staleSettings: GridSettingsDelta | null;
};
