// apps/web â€” /settings/periods screen logic (SPEC آ§11 periods row,
// FR-SET-07): week start + payday with a transition preview of the next
// boundaries computed by the SHARED @sharq/payroll generator (آ§5.1 DRY) â€”
// the same pure function the api will persist with in Phase 5. The preview
// applies the DRAFT config from Cairo today; existing periods are never
// regenerated retroactively (FR-PAY-09), so this is forward-only shape.
// Holidays feed the payday shift (FR-PAY-08); their UI is v1.1.
import {
  generatePeriods,
  type GenerationConfig,
  type PeriodDraft,
} from "@sharq/payroll/periods";
import { useCallback, useMemo, useState } from "react";
import type { IsoDate, SettingValues } from "@sharq/schemas";
import {
  PERIODS_PAYDAY_LABEL,
  PERIODS_WEEK_START_LABEL,
  SETTINGS_INVALID_VALUE,
} from "@sharq/locales";
import { cairoTodayIso } from "../../../lib/cairo-today";
import { errorMessage } from "../../../lib/sharq-error";
import { changedDrafts, schemaFailure } from "../drafts";
import { useHolidays, useSettings } from "../queries";
import { useSettingsSaver, type SettingDraft } from "../use-settings-save";

export const WEEK_START_DAYS: SettingValues["payroll.weekStartDay"][] = [
  "sat",
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];
// آ§5.2 payroll.payday: sun..fri â€” Saturday is never a payday.
export const PAYDAYS: SettingValues["payroll.payday"][] = [
  "sun",
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
];

type PeriodsDraft = {
  weekStartDay: SettingValues["payroll.weekStartDay"];
  payday: SettingValues["payroll.payday"];
};

function draftFrom(values: SettingValues): PeriodsDraft {
  return {
    weekStartDay: values["payroll.weekStartDay"],
    payday: values["payroll.payday"],
  };
}

function periodsDrafts(current: PeriodsDraft): SettingDraft[] {
  return [
    {
      key: "payroll.weekStartDay",
      value: current.weekStartDay,
      label: PERIODS_WEEK_START_LABEL,
    },
    {
      key: "payroll.payday",
      value: current.payday,
      label: PERIODS_PAYDAY_LABEL,
    },
  ];
}

/** The next two weekly boundaries under the DRAFT config (آ§6.1 generator,
 * anchored at Cairo today). */
function computePreview(
  values: SettingValues,
  draft: PeriodsDraft,
  holidays: IsoDate[],
): PeriodDraft[] {
  const config: GenerationConfig = {
    weekStartDay: draft.weekStartDay,
    payday: draft.payday,
    paydayHolidayPolicy: values["calendar.paydayHolidayPolicy"],
    holidays,
  };
  return generatePeriods(
    "preview",
    { kind: "fromDate", fromDate: cairoTodayIso() },
    config,
    2,
  );
}

export function usePeriodsScreen() {
  const settings = useSettings();
  const holidays = useHolidays();
  const saver = useSettingsSaver();
  const [draft, setDraft] = useState<PeriodsDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const values = settings.data?.values;
  const current = useMemo(
    () => draft ?? (values ? draftFrom(values) : null),
    [draft, values],
  );
  const preview = useMemo(() => {
    if (!values || !current) return null;
    return computePreview(
      values,
      current,
      holidays.data?.holidays.map((holiday) => holiday.date) ?? [],
    );
  }, [values, current, holidays.data]);

  const submit = useCallback(() => {
    const data = settings.data;
    if (!data || !current || saver.previewing) return;
    const drafts = periodsDrafts(current);
    if (
      drafts.some((candidate) => schemaFailure(candidate.key, candidate.value))
    ) {
      setFormError(SETTINGS_INVALID_VALUE);
      return;
    }
    setFormError(null);
    void saver.beginSave(changedDrafts(drafts, data.values));
  }, [current, settings.data, saver]);

  return {
    ready: current !== null,
    isPending: settings.isPending,
    loadError: settings.isError ? errorMessage(settings.error) : null,
    retry: () => void settings.refetch(),
    draft: current,
    preview,
    digitStyle: values?.["format.digitStyle"] ?? "western",
    formError,
    setWeekStartDay: (day: string) => {
      if (!current) return;
      setFormError(null);
      setDraft({
        ...current,
        weekStartDay: day as PeriodsDraft["weekStartDay"],
      });
    },
    setPayday: (day: string) => {
      if (!current) return;
      setFormError(null);
      setDraft({ ...current, payday: day as PeriodsDraft["payday"] });
    },
    submit,
    saver,
  };
}

export type PeriodsScreen = ReturnType<typeof usePeriodsScreen>;
