// apps/web — /settings/entry view (SPEC §11 entry row: min/max, quick-picks
// editor, entry mode, live chip preview). The chips render the DRAFT at the
// resolved scale — editing picks updates them live. Save flows through
// ImpactPreviewDialog (FR-SET-02).
import {
  ENTRY_MAX_LABEL,
  ENTRY_MIN_LABEL,
  ENTRY_MODE_FREE,
  ENTRY_MODE_LABEL,
  ENTRY_MODE_PICKS_ONLY,
  ENTRY_QUICK_PICKS_LABEL,
  ENTRY_QUICK_PICK_INPUT,
  ENTRY_QUICK_PICK_ADD,
  ENTRY_QUICK_PICK_REMOVE,
  SAVE_SUBMIT,
  SETTINGS_NAV_ENTRY,
} from "@sharq/locales";
import { Button, DialogError, SelectField, TextField } from "@sharq/ui";
import { MoneyField } from "../components/fields";
import { ImpactPreviewDialog } from "../components/impact-preview-dialog";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { formatMoney } from "../format";
import type { EntryScreen } from "./logic";

export function EntryView({ screen }: { screen: EntryScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_ENTRY} saver={screen.saver}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        {screen.draft ? <EntryForm screen={screen} /> : null}
      </SettingsBody>
      <ImpactPreviewDialog saver={screen.saver} />
    </SettingsScreen>
  );
}

// SETTINGS_NAV_ENTRY doubles as the §11 screen title.
function EntryForm({ screen }: { screen: EntryScreen }) {
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
        <MoneyField
          label={ENTRY_MIN_LABEL}
          value={draft.minMinor}
          onChange={(value) => screen.setMoneyField("minMinor", value)}
          error={screen.errors.minMinor}
        />
        <MoneyField
          label={ENTRY_MAX_LABEL}
          value={draft.maxMinor}
          onChange={(value) => screen.setMoneyField("maxMinor", value)}
          error={screen.errors.maxMinor}
        />
      </div>
      <QuickPicksEditor screen={screen} />
      <SelectField
        label={ENTRY_MODE_LABEL}
        value={draft.mode}
        onChange={screen.setMode}
      >
        <option value="free">{ENTRY_MODE_FREE}</option>
        <option value="quick_picks_only">{ENTRY_MODE_PICKS_ONLY}</option>
      </SelectField>
      <DialogError message={screen.formError} />
      <Button type="submit" disabled={screen.saver.previewing}>
        {SAVE_SUBMIT}
      </Button>
    </form>
  );
}

function QuickPicksEditor({ screen }: { screen: EntryScreen }) {
  const draft = screen.draft!;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{ENTRY_QUICK_PICKS_LABEL}</p>
      <DialogError message={screen.errors.picks ?? null} />
      <div className="flex flex-wrap gap-2">
        {draft.picks.map((pick, index) => (
          <span
            key={`${pick}-${index}`}
            className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-sm"
          >
            {formatMoney(pick, screen.scale, screen.digitStyle)}
            <button
              type="button"
              aria-label={ENTRY_QUICK_PICK_REMOVE}
              onClick={() => screen.removePick(index)}
            >
              ✕
            </button>
          </span>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <TextField
            label={ENTRY_QUICK_PICK_INPUT}
            value={screen.pickInput}
            onChange={screen.setPickInput}
            inputMode="numeric"
          />
        </div>
        <Button type="button" variant="outline" onClick={screen.addPick}>
          {ENTRY_QUICK_PICK_ADD}
        </Button>
      </div>
    </div>
  );
}
