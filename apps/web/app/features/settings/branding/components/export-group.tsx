// apps/web — the branding screen's export group (FR-SET-12): header text,
// the ordered-column subset editor (canonical §5.2 order), the filename
// pattern and their LIVE previews with sample tokens substituted.
import {
  BRANDING_COLUMNS_LABEL,
  BRANDING_FILENAME_PATTERN,
  BRANDING_HEADER_TEXT,
  BRANDING_PREVIEW_FILENAME,
  BRANDING_PREVIEW_HEADER,
  BRANDING_PREVIEW_TITLE,
  BRANDING_TOKENS_HINT,
  EXPORT_COLUMN_LABELS,
} from "@sharq/locales";
import type { SettingValues } from "@sharq/schemas";
import { TextField } from "@sharq/ui";
import { CheckField, FieldGroup } from "../../components/fields";
import type { BrandingDraft, BrandingScreen } from "../logic";

const HEADER_TOKENS: Record<string, string> = {
  team: "الصيانة",
  period: "الأسبوع ٤٣ — ٢٠٢٦",
};
const FILENAME_TOKENS: Record<string, string> = {
  team: "team",
  from: "2026-10-24",
  to: "2026-10-30",
};

function withTokens(pattern: string, tokens: Record<string, string>): string {
  return pattern.replace(/\{(\w+)\}/g, (name) => tokens[name] ?? name);
}

export function ExportGroup({ screen }: { screen: BrandingScreen }) {
  const draft = screen.draft;
  if (!draft) return null;
  return (
    <FieldGroup title={BRANDING_HEADER_TEXT}>
      <TextField
        label={BRANDING_HEADER_TEXT}
        value={draft.headerText}
        onChange={(value) => screen.set("headerText", value)}
      />
      <ColumnEditor draft={draft} screen={screen} />
      <div className="space-y-1">
        <TextField
          label={BRANDING_FILENAME_PATTERN}
          value={draft.filenamePattern}
          onChange={(value) => screen.set("filenamePattern", value)}
          dir="ltr"
        />
        <p className="text-xs text-muted-foreground">{BRANDING_TOKENS_HINT}</p>
      </div>
      <PreviewPanel draft={draft} />
    </FieldGroup>
  );
}

function ColumnEditor({
  draft,
  screen,
}: {
  draft: BrandingDraft;
  screen: BrandingScreen;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{BRANDING_COLUMNS_LABEL}</p>
      <div className="grid gap-1 sm:grid-cols-3">
        {Object.entries(EXPORT_COLUMN_LABELS).map(([column, label]) => (
          <CheckField
            key={column}
            label={label}
            checked={(draft.columns as string[]).includes(column)}
            onChange={() =>
              screen.toggleColumn(
                column as SettingValues["export.columns"][number],
              )
            }
          />
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ draft }: { draft: BrandingDraft }) {
  return (
    <div className="space-y-1 rounded-md bg-muted p-3 text-sm">
      <p className="font-medium">{BRANDING_PREVIEW_TITLE}</p>
      <p>
        {BRANDING_PREVIEW_HEADER}: {withTokens(draft.headerText, HEADER_TOKENS)}
      </p>
      <p dir="ltr" className="text-start">
        {BRANDING_PREVIEW_FILENAME}:{" "}
        {withTokens(draft.filenamePattern, FILENAME_TOKENS)}
      </p>
    </div>
  );
}
