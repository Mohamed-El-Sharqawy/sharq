// apps/web — the branding screen's currency/format group (FR-SET-12):
// currency code, minor-unit scale (EC-52-locked once attendance exists —
// the server is the authority) and the digit style.
import {
  BRANDING_CURRENCY_CODE,
  BRANDING_DIGIT_STYLE,
  BRANDING_SCALE_HINT,
  BRANDING_SCALE_LABEL,
  DIGIT_STYLE_ARABIC,
  DIGIT_STYLE_WESTERN,
} from "@sharq/locales";
import { SelectField, TextField } from "@sharq/ui";
import { FieldGroup } from "../../components/fields";
import type { BrandingDraft, BrandingScreen } from "../logic";

export function CurrencyGroup({ screen }: { screen: BrandingScreen }) {
  const draft = screen.draft;
  if (!draft) return null;
  return (
    <FieldGroup title={BRANDING_CURRENCY_CODE}>
      <div className="grid gap-3 sm:grid-cols-3">
        <TextField
          label={BRANDING_CURRENCY_CODE}
          value={draft.currencyCode}
          onChange={(value) => screen.set("currencyCode", value)}
          dir="ltr"
        />
        <SelectField
          label={BRANDING_SCALE_LABEL}
          value={draft.scale}
          onChange={(value) => screen.set("scale", value)}
        >
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
        </SelectField>
        <SelectField
          label={BRANDING_DIGIT_STYLE}
          value={draft.digitStyle}
          onChange={(value) =>
            screen.set("digitStyle", value as BrandingDraft["digitStyle"])
          }
        >
          <option value="western">{DIGIT_STYLE_WESTERN}</option>
          <option value="arabic_indic">{DIGIT_STYLE_ARABIC}</option>
        </SelectField>
      </div>
      <p className="text-xs text-muted-foreground">{BRANDING_SCALE_HINT}</p>
    </FieldGroup>
  );
}
