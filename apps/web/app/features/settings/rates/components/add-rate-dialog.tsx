// apps/web — the add-rate dialog (FR-SET-03): scope + target picker, money
// input (parsed at submit via the §6.2 normalizer), effective date with the
// static impact note (§5.4-2 — past entries keep their snapshots; the
// server's FR-SET-09 guard rejects locked/paid windows, EC-56's successor
// rule surfaces on close, not create). Fields live in add-rate-fields.tsx.
import { useCallback, useEffect, useState } from "react";
import type { CreateRateBody } from "@sharq/schemas";
import {
  DIALOG_CANCEL,
  RATES_ADD,
  RATES_TARGET_MISSING,
  SAVE_SUBMIT,
  SAVE_SUBMITTING,
} from "@sharq/locales";
import { Button, DialogError, Modal } from "@sharq/ui";
import { cairoTodayIso } from "../../../../lib/cairo-today";
import { parseMoneyInput } from "../../format";
import { useCreateRate } from "../../mutations";
import { useSettings } from "../../queries";
import { settingsFailureMessage } from "../../use-settings-save";
import { AddRateFields, type AddRateDraft } from "./add-rate-fields";

const DEFAULTS: AddRateDraft = {
  scopeType: "company",
  scopeKey: "",
  amount: "",
  validFrom: "",
  note: "",
};

/** Client-side pass before the POST: money parse (§6.2) + a target for
 * team/employee scopes (the server re-validates everything). */
function buildCreateBody(
  draft: AddRateDraft,
  scale: number,
): { error: string } | { body: CreateRateBody } {
  const parsed = parseMoneyInput(draft.amount, scale);
  if (!parsed.ok) return { error: parsed.message };
  if (draft.scopeType !== "company" && draft.scopeKey === "") {
    return { error: RATES_TARGET_MISSING };
  }
  return {
    body: {
      scopeType: draft.scopeType,
      ...(draft.scopeKey !== "" ? { scopeKey: draft.scopeKey } : {}),
      amountMinor: parsed.minor,
      validFrom: draft.validFrom,
      ...(draft.note.trim() !== "" ? { note: draft.note.trim() } : {}),
    },
  };
}

export function AddRateDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const create = useCreateRate();
  const [draft, setDraft] = useState<AddRateDraft>(DEFAULTS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft({ ...DEFAULTS, validFrom: cairoTodayIso() });
      setError(null);
    }
  }, [open]);

  const submit = useCallback(() => {
    if (create.isPending) return;
    const scale = settings.data?.values["currency.minorUnitScale"] ?? 2;
    const outcome = buildCreateBody(draft, scale);
    if ("error" in outcome) return setError(outcome.error);
    create.mutate(outcome.body, {
      onSuccess: onClose,
      onError: (cause) => setError(settingsFailureMessage(cause)),
    });
  }, [create, draft, settings.data, onClose]);

  return (
    <Modal
      open={open}
      title={RATES_ADD}
      onClose={onClose}
      footer={
        <>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={create.isPending}
          >
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={submit} disabled={create.isPending}>
            {create.isPending ? SAVE_SUBMITTING : SAVE_SUBMIT}
          </Button>
        </>
      }
    >
      <AddRateFields
        draft={draft}
        onDraft={(next) => {
          setError(null);
          setDraft(next);
        }}
      />
      <DialogError message={error} />
    </Modal>
  );
}
