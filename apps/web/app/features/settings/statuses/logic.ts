// apps/web â€” /settings/statuses screen logic (SPEC آ§11 statuses row,
// FR-SET-05): the status list plus the active toggle for custom rows;
// system rows stay locked in the UI (آ§11). Dialog state: dialog.ts.
import { useCallback, useState } from "react";
import type { StatusResponse } from "@sharq/schemas";
import { errorMessage } from "../../../lib/sharq-error";
import { useStatuses } from "../queries";
import { useUpdateStatus } from "../mutations";
import { useStatusDialogState, useStatusSubmit } from "./dialog";

export function useStatusesScreen() {
  const statuses = useStatuses();
  const [confirming, setConfirming] = useState<StatusResponse | null>(null);
  const state = useStatusDialogState();
  const submitter = useStatusSubmit(state);
  const toggleUpdate = useUpdateStatus();

  const toggleActive = useCallback(
    (status: StatusResponse) => {
      toggleUpdate.mutate(
        {
          id: status.id,
          body: { isActive: !status.isActive, version: status.version },
        },
        { onSettled: () => setConfirming(null) },
      );
    },
    [toggleUpdate],
  );

  return {
    isPending: statuses.isPending,
    loadError: statuses.isError ? errorMessage(statuses.error) : null,
    retry: () => void statuses.refetch(),
    list: statuses.data?.statuses ?? [],
    dialog: state.dialog,
    confirming,
    dialogError: state.dialogError,
    code: state.code,
    name: state.name,
    carriesPay: state.carriesPay,
    setCode: state.setCode,
    setName: state.setName,
    setCarriesPay: state.setCarriesPay,
    openCreate: state.openCreate,
    openEdit: state.openEdit,
    closeDialog: state.closeDialog,
    submit: submitter.submit,
    requestDeactivate: setConfirming,
    cancelDeactivate: () => setConfirming(null),
    confirmDeactivate: () => {
      if (confirming) toggleActive(confirming);
    },
    reactivate: (status: StatusResponse) => toggleActive(status),
    isSubmitting: submitter.isSubmitting,
  };
}

export type StatusesScreen = ReturnType<typeof useStatusesScreen>;
