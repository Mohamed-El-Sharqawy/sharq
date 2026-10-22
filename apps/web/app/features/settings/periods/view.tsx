// apps/web — /settings/periods view (SPEC §11: week start & payday selects
// + the next-boundaries transition preview, FR-SET-07). The preview renders
// the SHARED generator's drafts (§5.1) — what the first two fresh weeks
// would look like if saved today. Save flows through ImpactPreviewDialog
// (FR-SET-02; the impact kind for these keys is future-periods).
import {
  PERIODS_PAYDAY_LABEL,
  PERIODS_PREVIEW_PAYDAY,
  PERIODS_PREVIEW_PERIOD,
  PERIODS_PREVIEW_TITLE,
  PERIODS_WEEK_START_LABEL,
  SAVE_SUBMIT,
  SETTINGS_NAV_PERIODS,
  WEEKDAY_LABELS,
} from "@sharq/locales";
import { Button, DialogError, SelectField } from "@sharq/ui";
import { formatDateLabel } from "../format";
import { ImpactPreviewDialog } from "../components/impact-preview-dialog";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { PAYDAYS, WEEK_START_DAYS, type PeriodsScreen } from "./logic";

export function PeriodsView({ screen }: { screen: PeriodsScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_PERIODS} saver={screen.saver}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        {screen.draft ? <PeriodsForm screen={screen} /> : null}
      </SettingsBody>
      <ImpactPreviewDialog saver={screen.saver} />
    </SettingsScreen>
  );
}

function PeriodsForm({ screen }: { screen: PeriodsScreen }) {
  const draft = screen.draft!;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        screen.submit();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label={PERIODS_WEEK_START_LABEL}
          value={draft.weekStartDay}
          onChange={screen.setWeekStartDay}
        >
          {WEEK_START_DAYS.map((day) => (
            <option key={day} value={day}>
              {WEEKDAY_LABELS[day]}
            </option>
          ))}
        </SelectField>
        <SelectField
          label={PERIODS_PAYDAY_LABEL}
          value={draft.payday}
          onChange={screen.setPayday}
        >
          {PAYDAYS.map((day) => (
            <option key={day} value={day}>
              {WEEKDAY_LABELS[day]}
            </option>
          ))}
        </SelectField>
      </div>
      <BoundaryPreview screen={screen} />
      <DialogError message={screen.formError} />
      <Button type="submit" disabled={screen.saver.previewing}>
        {SAVE_SUBMIT}
      </Button>
    </form>
  );
}

function BoundaryPreview({ screen }: { screen: PeriodsScreen }) {
  if (!screen.preview) return null;
  const style = screen.digitStyle;
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h2 className="text-sm font-semibold">{PERIODS_PREVIEW_TITLE}</h2>
      <ul className="space-y-1 text-sm text-muted-foreground">
        {screen.preview.map((period, index) => (
          <li key={period.startDate}>
            {PERIODS_PREVIEW_PERIOD} {index + 1}:{" "}
            {formatDateLabel(period.startDate, style)} ←{" "}
            {formatDateLabel(period.endDate, style)} — {PERIODS_PREVIEW_PAYDAY}{" "}
            {formatDateLabel(period.paydayDate, style)}
          </li>
        ))}
      </ul>
    </section>
  );
}
