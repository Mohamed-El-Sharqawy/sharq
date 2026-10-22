// apps/web — the add-rate dialog's fields (FR-SET-03): scope picker, the
// conditional team/employee target picker, money, effective date + note and
// the static impact note (§5.4-2). Presentational — the dialog owns state.
import {
  RATES_AMOUNT_LABEL,
  RATES_IMPACT_NOTE,
  RATES_NOTE_LABEL,
  RATES_VALID_FROM,
} from "@sharq/locales";
import type { RateScope } from "@sharq/schemas";
import { TextField } from "@sharq/ui";
import { MoneyField } from "../../components/fields";
import { RateScopePicker, RateTargetPicker } from "./rate-pickers";

export type AddRateDraft = {
  scopeType: RateScope;
  scopeKey: string;
  amount: string;
  validFrom: string;
  note: string;
};

export function AddRateFields({
  draft,
  onDraft,
}: {
  draft: AddRateDraft;
  onDraft: (next: AddRateDraft) => void;
}) {
  return (
    <div className="space-y-3">
      <RateScopePicker
        scopeType={draft.scopeType}
        onChange={(scopeType) => onDraft({ ...draft, scopeType, scopeKey: "" })}
      />
      {draft.scopeType !== "company" ? (
        <RateTargetPicker
          scopeType={draft.scopeType}
          scopeKey={draft.scopeKey}
          onChange={(scopeKey) => onDraft({ ...draft, scopeKey })}
        />
      ) : null}
      <MoneyField
        label={RATES_AMOUNT_LABEL}
        value={draft.amount}
        onChange={(amount) => onDraft({ ...draft, amount })}
      />
      <TextField
        label={RATES_VALID_FROM}
        value={draft.validFrom}
        onChange={(validFrom) => onDraft({ ...draft, validFrom })}
        type="date"
      />
      <TextField
        label={RATES_NOTE_LABEL}
        value={draft.note}
        onChange={(note) => onDraft({ ...draft, note })}
      />
      <p className="text-xs text-muted-foreground">{RATES_IMPACT_NOTE}</p>
    </div>
  );
}
