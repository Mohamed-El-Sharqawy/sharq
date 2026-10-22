// apps/web â€” /settings/branding screen logic (SPEC آ§11 branding row,
// FR-SET-12): company name/logo, currency + digit style, export header/
// columns/filename with live previews. The previews substitute sample
// tokens in the VIEW (display-only); here: draft state, آ§10.3 registry
// pre-checks, and the shared FR-SET-02 saver flow.
import { useCallback, useState } from "react";
import { SETTINGS_REGISTRY, type SettingValues } from "@sharq/schemas";
import {
  BRANDING_COLUMNS_LABEL,
  BRANDING_COMPANY_NAME,
  BRANDING_CURRENCY_CODE,
  BRANDING_DIGIT_STYLE,
  BRANDING_FILENAME_PATTERN,
  BRANDING_HEADER_TEXT,
  BRANDING_LOGO_URL,
  BRANDING_SCALE_LABEL,
  SETTINGS_INVALID_VALUE,
} from "@sharq/locales";
import { errorMessage } from "../../../lib/sharq-error";
import { changedDrafts, schemaFailure } from "../drafts";
import { useSettings } from "../queries";
import { useSettingsSaver, type SettingDraft } from "../use-settings-save";

export type BrandingDraft = {
  companyName: string;
  logoUrl: string; // "" = null
  currencyCode: string;
  scale: string; // "2".."4"
  digitStyle: SettingValues["format.digitStyle"];
  headerText: string;
  columns: SettingValues["export.columns"];
  filenamePattern: string;
};

// آ§5.2's canonical column order â€” the seed IS the allowed set in display
// order; the editor always emits this order filtered to the selection.
const CANONICAL_COLUMNS = SETTINGS_REGISTRY["export.columns"].seededDefault;

function draftFrom(values: SettingValues): BrandingDraft {
  return {
    companyName: values["branding.companyName"],
    logoUrl: values["branding.logoUrl"] ?? "",
    currencyCode: values["currency.code"],
    scale: String(values["currency.minorUnitScale"]),
    digitStyle: values["format.digitStyle"],
    headerText: values["export.headerText"],
    columns: [...values["export.columns"]],
    filenamePattern: values["export.filenamePattern"],
  };
}

// The eight آ§5.2 candidates the branding screen can change, one SettingDraft
// per key (prettier's object-per-entry form keeps the mapping scannable).
function brandingDrafts(current: BrandingDraft): SettingDraft[] {
  return [
    {
      key: "branding.companyName",
      value: current.companyName,
      label: BRANDING_COMPANY_NAME,
    },
    {
      key: "branding.logoUrl",
      value: current.logoUrl === "" ? null : current.logoUrl,
      label: BRANDING_LOGO_URL,
    },
    {
      key: "currency.code",
      value: current.currencyCode,
      label: BRANDING_CURRENCY_CODE,
    },
    {
      key: "currency.minorUnitScale",
      value: Number(current.scale),
      label: BRANDING_SCALE_LABEL,
    },
    {
      key: "format.digitStyle",
      value: current.digitStyle,
      label: BRANDING_DIGIT_STYLE,
    },
    {
      key: "export.headerText",
      value: current.headerText,
      label: BRANDING_HEADER_TEXT,
    },
    {
      key: "export.columns",
      value: current.columns,
      label: BRANDING_COLUMNS_LABEL,
    },
    {
      key: "export.filenamePattern",
      value: current.filenamePattern,
      label: BRANDING_FILENAME_PATTERN,
    },
  ];
}

export function useBrandingScreen() {
  const settings = useSettings();
  const saver = useSettingsSaver();
  const [draft, setDraft] = useState<BrandingDraft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const values = settings.data?.values;
  const current = draft ?? (values ? draftFrom(values) : null);

  const submit = useCallback(() => {
    const data = settings.data;
    if (!data || !current || saver.previewing) return;
    const drafts = brandingDrafts(current);
    // EC-52 rides the same schema-check surface server-side
    // (IMMUTABLE_ONCE_ATTENDANCE_EXISTS) â€” the server message stays the
    // authority; here the generic pre-check just blocks the round trip.
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
    digitStyle: values?.["format.digitStyle"] ?? "western",
    formError,
    set: <K extends keyof BrandingDraft>(field: K, value: BrandingDraft[K]) => {
      if (!current) return;
      setFormError(null);
      setDraft({ ...current, [field]: value });
    },
    toggleColumn: (column: SettingValues["export.columns"][number]) => {
      if (!current) return;
      setFormError(null);
      const selected = new Set(current.columns);
      if (selected.has(column)) selected.delete(column);
      else selected.add(column);
      setDraft({
        ...current,
        columns: CANONICAL_COLUMNS.filter((name) => selected.has(name)),
      });
    },
    submit,
    saver,
  };
}

export type BrandingScreen = ReturnType<typeof useBrandingScreen>;
