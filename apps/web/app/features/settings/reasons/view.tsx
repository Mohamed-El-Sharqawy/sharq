// apps/web — /settings/reasons view (SPEC §11 reasons row: kind tabs,
// default amounts, active toggle). «مفيش أسباب» is the §11-verbatim empty
// state; deactivation rides the shared ConfirmDialog (EC-46: never delete).
import {
  EDIT_ACTION,
  REASONS_ADD,
  REASONS_DEACTIVATE,
  REASONS_DEACTIVATE_CONFIRM,
  REASONS_DEFAULT_AMOUNT,
  REASONS_EMPTY,
  REASONS_INACTIVE_BADGE,
  REASONS_REACTIVATE,
  REASONS_TAB_DEDUCTION,
  REASONS_TAB_OVERRIDE,
  SETTINGS_NAV_REASONS,
} from "@sharq/locales";
import type { ReasonKind, ReasonResponse } from "@sharq/schemas";
import { Button, ConfirmDialog } from "@sharq/ui";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { formatMoney } from "../format";
import { ReasonEditDialog } from "./components/reason-dialog";
import type { ReasonsScreen } from "./logic";
const TABS: { kind: ReasonKind; label: string }[] = [
  { kind: "override", label: REASONS_TAB_OVERRIDE },
  { kind: "deduction", label: REASONS_TAB_DEDUCTION },
];

export function ReasonsView({ screen }: { screen: ReasonsScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_REASONS}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        <ReasonsContent screen={screen} />
      </SettingsBody>
      <ReasonEditDialog screen={screen} />
      <ConfirmDialog
        open={screen.confirming !== null}
        title={REASONS_DEACTIVATE}
        message={REASONS_DEACTIVATE_CONFIRM}
        confirmLabel={REASONS_DEACTIVATE}
        destructive
        submitting={screen.isSubmitting}
        onConfirm={screen.confirmDeactivate}
        onClose={screen.cancelDeactivate}
      />
    </SettingsScreen>
  );
}

function ReasonsContent({ screen }: { screen: ReasonsScreen }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <nav className="flex gap-2">
          {TABS.map((candidate) => (
            <Button
              key={candidate.kind}
              variant={screen.tab === candidate.kind ? "default" : "outline"}
              onClick={() => screen.setTab(candidate.kind)}
            >
              {candidate.label}
            </Button>
          ))}
        </nav>
        <Button onClick={screen.openCreate}>{REASONS_ADD}</Button>
      </div>
      {screen.list.length === 0 ? (
        <p className="text-sm text-muted-foreground">{REASONS_EMPTY}</p>
      ) : (
        <ul className="space-y-2">
          {screen.list.map((reason) => (
            <ReasonRow key={reason.id} screen={screen} reason={reason} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ReasonRow({
  screen,
  reason,
}: {
  screen: ReasonsScreen;
  reason: ReasonResponse;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
      <div className="space-y-0.5">
        <p className="text-sm font-medium">
          {reason.nameAr}
          {!reason.isActive ? (
            <span className="ms-2 text-xs text-muted-foreground">
              ({REASONS_INACTIVE_BADGE})
            </span>
          ) : null}
        </p>
        {reason.defaultAmountMinor !== null ? (
          <p className="text-xs text-muted-foreground">
            {REASONS_DEFAULT_AMOUNT}:{" "}
            {formatMoney(
              reason.defaultAmountMinor,
              screen.scale,
              screen.digitStyle,
            )}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => screen.openEdit(reason)}>
          {EDIT_ACTION}
        </Button>
        {reason.isActive ? (
          <Button
            variant="destructive"
            onClick={() => screen.requestDeactivate(reason)}
          >
            {REASONS_DEACTIVATE}
          </Button>
        ) : (
          <Button onClick={() => screen.reactivate(reason)}>
            {REASONS_REACTIVATE}
          </Button>
        )}
      </div>
    </li>
  );
}
