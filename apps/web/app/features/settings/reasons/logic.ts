// apps/web â€” /settings/reasons screen logic (SPEC آ§11 reasons row,
// FR-SET-04): override/deduction catalogs with kind tabs and the active
// toggle. Deactivation only â€” never delete (EC-46). The dialog state
// machine lives in dialog.ts (آ§9.2/آ§9.3 split).
import { useCallback, useState } from "react";
import type { ReasonKind, ReasonResponse } from "@sharq/schemas";
import { errorMessage } from "../../../lib/sharq-error";
import { useReasons, useSettings } from "../queries";
import { useUpdateReason } from "../mutations";
import { useReasonDialogState, useReasonSubmit } from "./dialog";

export function useReasonsScreen() {
  const reasons = useReasons();
  const settings = useSettings();
  const [tab, setTab] = useState<ReasonKind>("override");
  const [confirming, setConfirming] = useState<ReasonResponse | null>(null);

  const scale = settings.data?.values["currency.minorUnitScale"] ?? 2;
  const maxPerEntry =
    settings.data?.values["deduction.maxPerEntryMinor"] ?? null;
  const state = useReasonDialogState(tab, scale);
  const submitter = useReasonSubmit(state, tab, scale, maxPerEntry);
  const toggleUpdate = useUpdateReason();

  const toggleActive = useCallback(
    (reason: ReasonResponse) => {
      toggleUpdate.mutate(
        {
          id: reason.id,
          body: { isActive: !reason.isActive, version: reason.version },
        },
        { onSettled: () => setConfirming(null) },
      );
    },
    [toggleUpdate],
  );

  const list =
    reasons.data?.reasons.filter((reason) => reason.kind === tab) ?? [];

  return {
    isPending: reasons.isPending,
    loadError: reasons.isError ? errorMessage(reasons.error) : null,
    retry: () => void reasons.refetch(),
    tab,
    setTab,
    list,
    scale,
    digitStyle: settings.data?.values["format.digitStyle"] ?? "western",
    dialog: state.dialog,
    confirming,
    dialogError: state.dialogError,
    name: state.name,
    amount: state.amount,
    setName: state.setName,
    setAmount: state.setAmount,
    openCreate: state.openCreate,
    openEdit: state.openEdit,
    closeDialog: state.closeDialog,
    submit: submitter.submit,
    requestDeactivate: setConfirming,
    cancelDeactivate: () => setConfirming(null),
    confirmDeactivate: () => {
      if (confirming) toggleActive(confirming);
    },
    reactivate: (reason: ReasonResponse) => toggleActive(reason),
    isSubmitting: submitter.isSubmitting,
  };
}

export type ReasonsScreen = ReturnType<typeof useReasonsScreen>;
