// apps/web — /settings/statuses view (SPEC §11 statuses row: add custom
// with the carries-pay flag; system rows locked — they render a badge and
// no actions). Deactivation rides the shared ConfirmDialog.
import {
  EDIT_ACTION,
  REASONS_DEACTIVATE,
  REASONS_INACTIVE_BADGE,
  REASONS_REACTIVATE,
  SETTINGS_NAV_STATUSES,
  STATUSES_ADD,
  STATUSES_CARRIES_PAY,
  STATUSES_DEACTIVATE_CONFIRM,
  STATUSES_DEACTIVATE_TITLE,
  STATUSES_SYSTEM_BADGE,
} from "@sharq/locales";
import type { StatusResponse } from "@sharq/schemas";
import { Button, ConfirmDialog } from "@sharq/ui";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { StatusDialogView } from "./components/status-dialog";
import type { StatusesScreen } from "./logic";

export function StatusesView({ screen }: { screen: StatusesScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_STATUSES}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button onClick={screen.openCreate}>{STATUSES_ADD}</Button>
          </div>
          <ul className="space-y-2">
            {screen.list.map((status) => (
              <StatusRow key={status.id} screen={screen} status={status} />
            ))}
          </ul>
        </div>
      </SettingsBody>
      <StatusDialogView screen={screen} />
      <ConfirmDialog
        open={screen.confirming !== null}
        title={STATUSES_DEACTIVATE_TITLE}
        message={STATUSES_DEACTIVATE_CONFIRM}
        confirmLabel={REASONS_DEACTIVATE}
        destructive
        submitting={screen.isSubmitting}
        onConfirm={screen.confirmDeactivate}
        onClose={screen.cancelDeactivate}
      />
    </SettingsScreen>
  );
}

function StatusRow({
  screen,
  status,
}: {
  screen: StatusesScreen;
  status: StatusResponse;
}) {
  return (
    <li className="flex items-center justify-between gap-2 rounded-md border border-border p-3">
      <div>
        <p className="text-sm font-medium">
          {status.nameAr}
          {status.isSystem ? (
            <span className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {STATUSES_SYSTEM_BADGE}
            </span>
          ) : null}
          {!status.isActive ? (
            <span className="ms-2 text-xs text-muted-foreground">
              ({REASONS_INACTIVE_BADGE})
            </span>
          ) : null}
        </p>
        <p className="text-xs text-muted-foreground" dir="ltr">
          {status.code} · {status.carriesPay ? STATUSES_CARRIES_PAY : "—"}
        </p>
      </div>
      {status.isSystem ? null : (
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => screen.openEdit(status)}>
            {EDIT_ACTION}
          </Button>
          {status.isActive ? (
            <Button
              variant="destructive"
              onClick={() => screen.requestDeactivate(status)}
            >
              {REASONS_DEACTIVATE}
            </Button>
          ) : (
            <Button onClick={() => screen.reactivate(status)}>
              {REASONS_REACTIVATE}
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
