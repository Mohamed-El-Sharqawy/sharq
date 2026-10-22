// apps/web — the shared ImpactPreviewDialog (FR-SET-02): every settings
// save flows through it. One row per changed key with its §5.5.6 impact —
// employees affected from a date, future-periods note, or no impact — plus
// the violating-future-entries count for the bounds keys and the standing
// «السجلات القديمة مش هتتغير» line. Numbers/dates render through §14.2
// Intl with the resolved format.digitStyle.
import type { SettingImpactResponse } from "@sharq/schemas";
import {
  DIALOG_CANCEL,
  IMPACT_EMPLOYEES_LINE,
  IMPACT_NONE_LINE,
  IMPACT_PAST_SAFE_LINE,
  IMPACT_PERIODS_LINE,
  IMPACT_TITLE,
  IMPACT_VIOLATING_LINE,
  SAVE_SUBMIT,
  SAVE_SUBMITTING,
} from "@sharq/locales";
import { Button, DialogError, Modal } from "@sharq/ui";
import { formatDateLabel } from "../format";
import { useSettings } from "../queries";
import type { SettingDraft, SettingsSaver } from "../use-settings-save";

function impactLines(
  impact: SettingImpactResponse,
  digitStyle: "western" | "arabic_indic",
): string[] {
  const lines: string[] = [];
  if (impact.kind === "none") return [IMPACT_NONE_LINE];
  if (impact.affectedEmployees > 0) {
    lines.push(
      IMPACT_EMPLOYEES_LINE(
        impact.affectedEmployees,
        formatDateLabel(impact.validFrom, digitStyle),
      ),
    );
  }
  if (impact.futureViolatingEntries > 0) {
    lines.push(IMPACT_VIOLATING_LINE(impact.futureViolatingEntries));
  }
  lines.push(
    impact.kind === "future-periods"
      ? IMPACT_PERIODS_LINE
      : IMPACT_PAST_SAFE_LINE,
  );
  return lines;
}

function ImpactRow({
  draft,
  impact,
  digitStyle,
}: {
  draft: SettingDraft;
  impact: SettingImpactResponse;
  digitStyle: "western" | "arabic_indic";
}) {
  return (
    <li className="space-y-1">
      <p className="text-sm font-medium">{draft.label}</p>
      {impactLines(impact, digitStyle).map((line) => (
        <p key={line} className="text-sm text-muted-foreground">
          {line}
        </p>
      ))}
    </li>
  );
}

export type ImpactPreviewDialogProps = {
  saver: SettingsSaver;
};

export function ImpactPreviewDialog({ saver }: ImpactPreviewDialogProps) {
  const settings = useSettings();
  const digitStyle = settings.data?.values["format.digitStyle"] ?? "western";
  const open = saver.pending !== null;
  return (
    <Modal
      open={open}
      title={IMPACT_TITLE}
      onClose={saver.close}
      footer={
        <>
          <Button
            variant="outline"
            onClick={saver.close}
            disabled={saver.saving}
          >
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={saver.confirm} disabled={saver.saving}>
            {saver.saving ? SAVE_SUBMITTING : SAVE_SUBMIT}
          </Button>
        </>
      }
    >
      <ul className="space-y-3">
        {saver.pending?.drafts.map((draft, index) => (
          <ImpactRow
            key={draft.key}
            draft={draft}
            impact={saver.pending!.impacts[index]!}
            digitStyle={digitStyle}
          />
        ))}
      </ul>
      <div className="mt-3">
        <DialogError message={saver.dialogError} />
      </div>
    </Modal>
  );
}

/** The §5.8 stale-write banner (EC-48) — rendered by every settings screen
 * while a conflict rebased the cache. */
export function StaleSettingsBanner({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2 rounded-md border border-border bg-amber-50 px-3 py-2 text-sm dark:bg-amber-950"
    >
      <span>{message}</span>
      <Button variant="ghost" onClick={onDismiss}>
        ✕
      </Button>
    </div>
  );
}
