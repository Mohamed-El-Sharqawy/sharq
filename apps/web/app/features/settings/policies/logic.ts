// apps/web â€” /settings/policies screen logic (SPEC آ§11 policies row):
// edit window, auto-lock, lock/pay/unlock flags, deduction limits & floor.
// Every changed key flows through the shared FR-SET-02 saver; numbers
// pre-check against the registry schema (آ§10.3 one source) before any
// round trip. Draft model + key mapping live in draft.ts (آ§9.2/آ§9.3 gate).
import { useCallback, useState } from "react";
import { SETTINGS_INVALID_VALUE } from "@sharq/locales";
import { errorMessage } from "../../../lib/sharq-error";
import { changedDrafts, schemaFailure } from "../drafts";
import { useSettings } from "../queries";
import { useSettingsSaver } from "../use-settings-save";
import {
  draftFrom,
  optionalInt,
  parseMaxPerEntry,
  policiesDrafts,
  type PoliciesDraft,
} from "./draft";

export function usePoliciesScreen() {
  const settings = useSettings();
  const saver = useSettingsSaver();
  const [draft, setDraft] = useState<PoliciesDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const values = settings.data?.values;
  const scale = values?.["currency.minorUnitScale"] ?? 2;
  const current = draft ?? (values ? draftFrom(values, scale) : null);

  const submit = useCallback(() => {
    const data = settings.data;
    if (!data || !current || saver.previewing) return;
    const daysBack = optionalInt(current.daysBack);
    const autoLockDays = optionalInt(current.autoLockDays);
    if (daysBack === "invalid" || autoLockDays === "invalid") {
      setFormError(SETTINGS_INVALID_VALUE);
      return;
    }
    const maxPerEntry = parseMaxPerEntry(current.maxPerEntry, scale);
    if (typeof maxPerEntry === "string") {
      setFormError(maxPerEntry);
      return;
    }
    const drafts = policiesDrafts(current, daysBack, autoLockDays, maxPerEntry);
    if (
      drafts.some((candidate) => schemaFailure(candidate.key, candidate.value))
    ) {
      setFormError(SETTINGS_INVALID_VALUE);
      return;
    }
    setFormError(null);
    void saver.beginSave(changedDrafts(drafts, data.values));
  }, [current, scale, settings.data, saver]);

  return {
    ready: current !== null,
    isPending: settings.isPending,
    loadError: settings.isError ? errorMessage(settings.error) : null,
    retry: () => void settings.refetch(),
    draft: current,
    formError,
    set: <K extends keyof PoliciesDraft>(field: K, value: PoliciesDraft[K]) => {
      if (!current) return;
      setFormError(null);
      setDraft({ ...current, [field]: value });
    },
    submit,
    saver,
  };
}

export type PoliciesScreen = ReturnType<typeof usePoliciesScreen>;
