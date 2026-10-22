// apps/web — the entry screen's draft model (SPEC §11 entry row): the raw
// input shapes and the parse+rule pass (FR-SET-11/08 helpers, split from
// logic.ts for the §9.2 gate).
import { useState } from "react";
import { minorToDecimal, type SettingValues } from "@sharq/schemas";
import { QUICK_PICKS_UNIQUE } from "@sharq/locales";
import { parseMoneyInput } from "../format";

export type EntryDraft = {
  minMinor: string;
  maxMinor: string;
  picks: number[];
  mode: SettingValues["attendance.entryMode"];
};

export type FieldErrors = {
  minMinor?: string;
  maxMinor?: string;
  picks?: string;
};

export function draftFrom(values: SettingValues, scale: number): EntryDraft {
  return {
    minMinor: String(
      minorToDecimal(values["attendance.amount.minMinor"], scale),
    ),
    maxMinor: String(
      minorToDecimal(values["attendance.amount.maxMinor"], scale),
    ),
    picks: [...values["attendance.quickPicks"]],
    mode: values["attendance.entryMode"],
  };
}

/** Parse+rule pass over the draft: Arabic field errors, or the parsed
 * minor values when everything is clean (duplicates blocked, EC-31..34). */
export function collectErrors(
  draft: EntryDraft,
  scale: number,
): { errors: FieldErrors; parsed: { min: number; max: number } | null } {
  const errors: FieldErrors = {};
  const min = parseMoneyInput(draft.minMinor, scale);
  if (!min.ok) errors.minMinor = min.message;
  const max = parseMoneyInput(draft.maxMinor, scale);
  if (!max.ok) errors.maxMinor = max.message;
  if (new Set(draft.picks).size !== draft.picks.length) {
    errors.picks = QUICK_PICKS_UNIQUE;
  }
  return {
    errors,
    parsed: min.ok && max.ok ? { min: min.minor, max: max.minor } : null,
  };
}

/** The quick-picks editor's state: the raw input, its parse error and the
 * add/remove actions over the DRAFT's parsed minor list (the chips render
 * live from it). A hook so the screen logic stays under the §9.3 budget. */
export function useEntryPicks(
  current: EntryDraft | null,
  scale: number,
  onDraft: (next: EntryDraft) => void,
) {
  const [pickInput, setPickInput] = useState("");
  const [pickError, setPickError] = useState<string | undefined>(undefined);

  const addPick = () => {
    if (!current) return;
    const parsed = parseMoneyInput(pickInput, scale);
    if (!parsed.ok) {
      setPickError(parsed.message);
      return;
    }
    setPickError(undefined);
    setPickInput("");
    onDraft({ ...current, picks: [...current.picks, parsed.minor] });
  };

  const removePick = (index: number) => {
    if (!current) return;
    onDraft({ ...current, picks: current.picks.filter((_, i) => i !== index) });
  };

  return { pickInput, setPickInput, pickError, addPick, removePick };
}
