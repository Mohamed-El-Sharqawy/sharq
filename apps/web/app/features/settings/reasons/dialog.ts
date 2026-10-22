// apps/web — the reasons screen's dialog state machine (FR-SET-04), split
// in two hooks for the §9.3 budget: useReasonDialogState owns the form
// fields, useReasonSubmit owns the create/edit mutations + the
// deduction-cap pre-check (the same rule the server enforces as
// DEFAULT_EXCEEDS_DEDUCTION_MAX).
import { useCallback, useState } from "react";
import { minorToDecimal } from "@sharq/schemas";
import type { ReasonKind, ReasonResponse } from "@sharq/schemas";
import {
  REASONS_NAME_REQUIRED,
  SETTINGS_REASON_MESSAGES,
} from "@sharq/locales";
import { parseMoneyInput } from "../format";
import { useCreateReason, useUpdateReason } from "../mutations";
import { settingsFailureMessage } from "../use-settings-save";

export type ReasonDialog =
  | { mode: "create"; kind: ReasonKind }
  | { mode: "edit"; reason: ReasonResponse };

export function useReasonDialogState(kind: ReasonKind, scale: number) {
  const [dialog, setDialog] = useState<ReasonDialog | null>(null);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dialogError, setDialogError] = useState<string | null>(null);

  const closeDialog = useCallback(() => {
    setDialog(null);
    setDialogError(null);
    setName("");
    setAmount("");
  }, []);

  const openCreate = useCallback(() => {
    setDialogError(null);
    setName("");
    setAmount("");
    setDialog({ mode: "create", kind });
  }, [kind]);

  const openEdit = useCallback(
    (reason: ReasonResponse) => {
      setName(reason.nameAr);
      setAmount(
        reason.defaultAmountMinor === null
          ? ""
          : String(minorToDecimal(reason.defaultAmountMinor, scale)),
      );
      setDialogError(null);
      setDialog({ mode: "edit", reason });
    },
    [scale],
  );

  return {
    dialog,
    dialogError,
    name,
    amount,
    setDialogError,
    setName: (value: string) => {
      setDialogError(null);
      setName(value);
    },
    setAmount: (value: string) => {
      setDialogError(null);
      setAmount(value);
    },
    openCreate,
    openEdit,
    closeDialog,
  };
}

type DialogState = ReturnType<typeof useReasonDialogState>;

/** "" / non-deduction → null (clears on save); a parse failure or the cap
 * breach → Arabic message; otherwise the minor amount (server rechecks). */
function amountOrMessage(
  state: DialogState,
  target: ReasonKind,
  scale: number,
  maxPerEntry: number | null,
): number | null | string {
  if (target !== "deduction" || state.amount.trim() === "") return null;
  const parsed = parseMoneyInput(state.amount, scale);
  if (!parsed.ok) return parsed.message;
  if (maxPerEntry !== null && parsed.minor > maxPerEntry) {
    // The key is a fixed literal in the map (§5.6's rule text).
    return SETTINGS_REASON_MESSAGES.DEFAULT_EXCEEDS_DEDUCTION_MAX as string;
  }
  return parsed.minor;
}

export function useReasonSubmit(
  state: DialogState,
  kind: ReasonKind,
  scale: number,
  maxPerEntry: number | null,
) {
  const create = useCreateReason();
  const update = useUpdateReason();

  const submit = useCallback(() => {
    const dialog = state.dialog;
    if (create.isPending || update.isPending || !dialog) return;
    const nameAr = state.name.trim();
    if (nameAr === "") {
      state.setDialogError(REASONS_NAME_REQUIRED);
      return;
    }
    const target = dialog.mode === "edit" ? dialog.reason.kind : kind;
    const amount = amountOrMessage(state, target, scale, maxPerEntry);
    if (typeof amount === "string") {
      state.setDialogError(amount);
      return;
    }
    const onError = (error: unknown) =>
      state.setDialogError(settingsFailureMessage(error));
    if (dialog.mode === "create") {
      create.mutate(
        {
          kind,
          nameAr,
          ...(amount !== null ? { defaultAmountMinor: amount } : {}),
        },
        { onSuccess: state.closeDialog, onError },
      );
      return;
    }
    update.mutate(
      {
        id: dialog.reason.id,
        body: {
          nameAr,
          defaultAmountMinor: amount,
          version: dialog.reason.version,
        },
      },
      { onSuccess: state.closeDialog, onError },
    );
  }, [state, kind, scale, maxPerEntry, create, update]);

  return { submit, isSubmitting: create.isPending || update.isPending };
}
