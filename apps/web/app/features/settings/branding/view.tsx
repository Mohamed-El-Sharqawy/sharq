// apps/web — /settings/branding view (SPEC §11 branding row, FR-SET-12):
// identity + currency fields, the export header/columns/filename editors
// and their LIVE previews (sample tokens substituted in the export group).
// Save flows through ImpactPreviewDialog (FR-SET-02).
import {
  BRANDING_COMPANY_NAME,
  BRANDING_LOGO_HINT,
  BRANDING_LOGO_URL,
  SAVE_SUBMIT,
  SETTINGS_NAV_BRANDING,
} from "@sharq/locales";
import { Button, DialogError, TextField } from "@sharq/ui";
import { FieldGroup } from "../components/fields";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { ImpactPreviewDialog } from "../components/impact-preview-dialog";
import { CurrencyGroup } from "./components/currency-group";
import { ExportGroup } from "./components/export-group";
import type { BrandingScreen } from "./logic";

export function BrandingView({ screen }: { screen: BrandingScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_BRANDING} saver={screen.saver}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={null}
        onRetry={screen.retry}
      >
        {screen.draft ? <BrandingForm screen={screen} /> : null}
      </SettingsBody>
      <ImpactPreviewDialog saver={screen.saver} />
    </SettingsScreen>
  );
}

function BrandingForm({ screen }: { screen: BrandingScreen }) {
  const draft = screen.draft!;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        screen.submit();
      }}
    >
      <FieldGroup title={BRANDING_COMPANY_NAME}>
        <TextField
          label={BRANDING_COMPANY_NAME}
          value={draft.companyName}
          onChange={(value) => screen.set("companyName", value)}
        />
        <div className="space-y-1">
          <TextField
            label={BRANDING_LOGO_URL}
            value={draft.logoUrl}
            onChange={(value) => screen.set("logoUrl", value)}
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">{BRANDING_LOGO_HINT}</p>
        </div>
      </FieldGroup>
      <CurrencyGroup screen={screen} />
      <ExportGroup screen={screen} />
      <DialogError message={screen.formError} />
      <Button type="submit" disabled={screen.saver.previewing}>
        {SAVE_SUBMIT}
      </Button>
    </form>
  );
}
