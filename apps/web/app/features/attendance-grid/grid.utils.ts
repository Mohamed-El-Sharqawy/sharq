// apps/web — pure cell/overlay math for the §12 grid (SPEC §9.4:
// grid.utils.ts = pure helpers; totals math delegates to @sharq/payroll when
// Phase 5 wires the live preview). Everything here is deterministic and
// allocation-only — the reducer stays deep-freeze testable (TESTING §6.3).
import type { CellEditPatch } from "./grid.actions";
import type {
  CellKey,
  ConflictServerValue,
  EntryReason,
  GridCell,
  GridRow,
  GridState,
  PendingChange,
  RowKey,
} from "./grid.types";
import { parseCellKey } from "./grid.types";

/** FR-GRID-04: a cell is an override iff its amount differs from the day's
 * base. No base resolved (§5.3 found nothing) → not an override client-side;
 * the server's snapshot at save time is the authority (FR-ATT-10). */
export function isOverrideFor(
  amountMinor: number | null,
  baseMinor: number | null,
): boolean {
  return (
    amountMinor !== null && baseMinor !== null && amountMinor !== baseMinor
  );
}

/** The free-text half of a reason, trimmed — REASON_REQUIRED checks measure
 * content, not presence. */
export function reasonText(reason: EntryReason | null | undefined): string {
  return reason?.text?.trim() ?? "";
}

export function hasReasonContent(
  reason: EntryReason | null | undefined,
): boolean {
  return reason?.catalogId !== undefined || reasonText(reason) !== "";
}

export function emptyCell(baseMinor: number | null): GridCell {
  return {
    statusId: null,
    amountMinor: null,
    baseMinor,
    isOverride: false,
    reason: null,
    version: 0,
  };
}

export function cellAt(
  rows: GridRow[],
  userId: string,
  date: string,
): GridCell | undefined {
  return rows.find((row) => row.userId === userId)?.cells[date];
}

/** Object.entries for the pending map — the ONE cast point where the runtime
 * string keys re-gain their CellKey branding. */
export function pendingEntries(
  pending: Record<CellKey, PendingChange>,
): [CellKey, PendingChange][] {
  return Object.entries(pending) as [CellKey, PendingChange][];
}

/** One cell change applied optimistically. Back-to-base clears the override
 * AND the reason (EC-15's client mirror — the server is the stored truth);
 * a present-but-empty reason clears it (the popover can save «none»), an
 * absent reason key keeps the cell's. */
export function applyCellEdit(cell: GridCell, patch: CellEditPatch): GridCell {
  const amountMinor = patch.amountMinor ?? cell.amountMinor;
  const isOverride = isOverrideFor(amountMinor, cell.baseMinor);
  return {
    ...cell,
    statusId: patch.statusId ?? cell.statusId,
    amountMinor,
    isOverride,
    reason: isOverride
      ? (("reason" in patch ? patch.reason : cell.reason) ?? null)
      : null,
  };
}

function rowWithCell(row: GridRow, date: string, cell: GridCell): GridRow {
  return { ...row, cells: { ...row.cells, [date]: cell } };
}

/** Patch one member's day cell; an unknown member leaves rows untouched. */
export function applyCellPatchToRows(
  rows: GridRow[],
  userId: string,
  date: string,
  patch: CellEditPatch,
): GridRow[] {
  const index = rows.findIndex((row) => row.userId === userId);
  if (index === -1) return rows;
  const row = rows[index] as GridRow;
  const base = row.cells[date] ?? emptyCell(null);
  const next = [...rows];
  next[index] = rowWithCell(row, date, applyCellEdit(base, patch));
  return next;
}

/** §12's "rows = query + pending overlay": every non-conflicted pending
 * change re-applied onto fresh query rows (QUERY_SYNCED / hydrate). */
export function applyPendingOverlay(
  rows: GridRow[],
  pending: Record<CellKey, PendingChange>,
): GridRow[] {
  let next = rows;
  for (const change of Object.values(pending)) {
    // A conflicted cell shows the SERVER value until the supervisor picks
    // (FR-GRID-09) — its local value stays only in the pending change.
    if (change.stage === "conflict") continue;
    next = applyCellPatchToRows(next, change.userId, change.date, change);
  }
  return next;
}

/** Re-base a cell on the server's current value (FR-GRID-09: the cell shows
 * the fresh value while the supervisor decides). */
export function rebaseCellOnServer(
  rows: GridRow[],
  key: CellKey,
  value: ConflictServerValue,
): GridRow[] {
  const { userId, date } = parseCellKey(key);
  const index = rows.findIndex((row) => row.userId === userId);
  if (index === -1) return rows;
  const row = rows[index] as GridRow;
  const base = row.cells[date] ?? emptyCell(null);
  const isOverride = isOverrideFor(value.amountMinor, base.baseMinor);
  const next = [...rows];
  next[index] = rowWithCell(row, date, {
    ...base,
    statusId: value.statusId,
    amountMinor: value.amountMinor,
    version: value.version,
    isOverride,
    reason: value.reason ?? null,
  });
  return next;
}

/** BULK_SET targets: selected cells as-is, selected rows expanded to all
 * their day cells (rows are dense — see GridRow). Unknown rows are skipped. */
export function resolveBulkTargets(
  rows: GridRow[],
  selection: Set<CellKey | RowKey>,
): { userId: string; date: string }[] {
  const targets: { userId: string; date: string }[] = [];
  for (const selected of selection) {
    if (selected.includes("::")) {
      targets.push(parseCellKey(selected as CellKey));
      continue;
    }
    const row = rows.find((candidate) => candidate.userId === selected);
    if (!row) continue;
    for (const date of Object.keys(row.cells))
      targets.push({ userId: row.userId, date });
  }
  return targets;
}

/** The §12 sync machine's source of truth, re-derived after every server
 * event: 'offline' sticks (only the OFFLINE action lifts it, which re-runs
 * this with keepOffline off); problems outrank saving, saving outranks idle. */
export function settleSync(
  state: GridState,
  options: { keepOffline?: boolean } = {},
): GridState {
  if (options.keepOffline && state.sync === "offline") return state;
  const pending = Object.values(state.pending);
  const hasProblem =
    state.conflicts.length > 0 ||
    pending.some(
      (change) =>
        change.invalidCode !== undefined || change.lastRejectCode !== undefined,
    );
  const sync = hasProblem
    ? "error"
    : pending.some((change) => change.stage === "in-flight")
      ? "saving"
      : "idle";
  return { ...state, sync };
}
