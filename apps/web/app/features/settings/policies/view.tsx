// apps/web — /settings/policies view (SPEC §11 policies row): three field
// groups — edit window, lock/pay flags, deduction limits — over the shared
// primitives. Save flows through ImpactPreviewDialog (FR-SET-02).
import { SAVE_SUBMIT, SETTINGS_NAV_POLICIES } from "@sharq/locales";
import { Button, DialogError } from "@sharq/ui";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { ImpactPreviewDialog } from "../components/impact-preview-dialog";
import {
  DeductionsGroup,
  EditWindowGroup,
  LocksGroup,
} from "./components/groups";
import type { PoliciesScreen } from "./logic";

export function PoliciesView({ screen }: { screen: PoliciesScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_POLICIES} saver={screen.saver}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        {screen.draft ? <PoliciesForm screen={screen} /> : null}
      </SettingsBody>
      <ImpactPreviewDialog saver={screen.saver} />
    </SettingsScreen>
  );
}

function PoliciesForm({ screen }: { screen: PoliciesScreen }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        screen.submit();
      }}
    >
      <EditWindowGroup screen={screen} />
      <LocksGroup screen={screen} />
      <DeductionsGroup screen={screen} />
      <DialogError message={screen.formError} />
      <Button type="submit" disabled={screen.saver.previewing}>
        {SAVE_SUBMIT}
      </Button>
    </form>
  );
}
