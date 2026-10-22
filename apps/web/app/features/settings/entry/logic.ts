// apps/web â€” /settings/entry screen logic (SPEC آ§11 entry row, FR-SET-11):
// min/max bounds, quick-picks editor, entry mode. Money edits stay raw
// strings until submit (آ§6.2 input boundary â†’ parseMoneyInput at scale);
// picks parse the moment they're added so the chips ARE the live preview.
// Submit = FR-SET-08 pre-checks â†’ the shared FR-SET-02 saver flow; the
// pipeline + picks editor live in draft.ts (آ§9.2/آ§9.3 split).
import { useState } from "react";
import {
  ENTRY_MAX_LABEL,
  ENTRY_MIN_LABEL,
  ENTRY_MODE_LABEL,
  ENTRY_QUICK_PICKS_LABEL,
} from "@sharq/locales";
import type { SettingValues } from "@sharq/schemas";
import { errorMessage } from "../../../lib/sharq-error";
import { changedDrafts, crossFieldFailure } from "../drafts";
import { useSettings } from "../queries";
import { useSettingsSaver, type SettingDraft } from "../use-settings-save";
import {
  collectErrors,
  draftFrom,
  useEntryPicks,
  type EntryDraft,
} from "./draft";
/** Submit pipeline: parse (Arabic field errors) â†’ FR-SET-08 cross-field
 * over the DRAFT merged onto the CURRENT values â†’ changed-key drafts. */
function prepareEntrySave(
  draft: EntryDraft,
  scale: number,
  values: SettingValues,
): {
  errors: ReturnType<typeof collectErrors>["errors"];
  payload: SettingDraft[] | null;
  error: string | null;
} {
  const checked = collectErrors(draft, scale);
  if (!checked.parsed) {
    return { errors: checked.errors, payload: null, error: null };
  }
  const cross = crossFieldFailure({
    ...values,
    "attendance.amount.minMinor": checked.parsed.min,
    "attendance.amount.maxMinor": checked.parsed.max,
    "attendance.quickPicks": draft.picks,
  });
  if (cross) {
    return { errors: checked.errors, payload: null, error: cross };
  }
  const drafts: SettingDraft[] = [
    {
      key: "attendance.amount.minMinor",
      value: checked.parsed.min,
      label: ENTRY_MIN_LABEL,
    },
    {
      key: "attendance.amount.maxMinor",
      value: checked.parsed.max,
      label: ENTRY_MAX_LABEL,
    },
    {
      key: "attendance.quickPicks",
      value: draft.picks,
      label: ENTRY_QUICK_PICKS_LABEL,
    },
    { key: "attendance.entryMode", value: draft.mode, label: ENTRY_MODE_LABEL },
  ];
  return { errors: checked.errors, payload: drafts, error: null };
}

export function useEntryScreen() {
  const settings = useSettings();
  const saver = useSettingsSaver();
  const [draft, setDraft] = useState<EntryDraft | null>(null);
  const [errors, setErrors] = useState<
    ReturnType<typeof collectErrors>["errors"]
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  const scale = settings.data?.values["currency.minorUnitScale"] ?? 2;
  const values = settings.data?.values;
  const current = draft ?? (values ? draftFrom(values, scale) : null);

  const mutate = (next: EntryDraft) => {
    setFormError(null);
    setDraft(next);
  };
  const picks = useEntryPicks(current, scale, mutate);

  const submit = () => {
    const data = settings.data;
    if (!data || !current || saver.previewing) return;
    const outcome = prepareEntrySave(current, scale, data.values);
    setErrors(outcome.errors);
    setFormError(outcome.error);
    if (outcome.payload)
      void saver.beginSave(changedDrafts(outcome.payload, data.values));
  };

  return {
    ready: current !== null,
    isPending: settings.isPending,
    loadError: settings.isError ? errorMessage(settings.error) : null,
    retry: () => void settings.refetch(),
    draft: current,
    scale,
    digitStyle: values?.["format.digitStyle"] ?? "western",
    errors: { ...errors, picks: picks.pickError },
    pickInput: picks.pickInput,
    setPickInput: picks.setPickInput,
    formError,
    setMoneyField: (field: "minMinor" | "maxMinor", value: string) => {
      setErrors((errors) => ({ ...errors, [field]: undefined }));
      mutate({ ...current!, [field]: value });
    },
    setMode: (mode: string) =>
      mutate({ ...current!, mode: mode as EntryDraft["mode"] }),
    addPick: picks.addPick,
    removePick: picks.removePick,
    submit,
    saver,
  };
}

export type EntryScreen = ReturnType<typeof useEntryScreen>;
