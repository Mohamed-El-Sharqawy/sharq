// apps/web — the statuses screen's dialog state machine (FR-SET-05), split
// in two hooks for the §9.3 budget: useStatusDialogState owns the form
// fields, useStatusSubmit owns the create/edit mutations.
import { useCallback, useState } from "react";
import type { StatusResponse } from "@sharq/schemas";
import { STATUSES_CODE_REQUIRED } from "@sharq/locales";
import { useCreateStatus, useUpdateStatus } from "../mutations";
import { settingsFailureMessage } from "../use-settings-save";

export type StatusDialog =
  { mode: "create" } | { mode: "edit"; status: StatusResponse };

export function useStatusDialogState() {
  const [dialog, setDialog] = useState<StatusDialog | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [carriesPay, setCarriesPay] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const closeDialog = useCallback(() => {
    setDialog(null);
    setDialogError(null);
    setCode("");
    setName("");
    setCarriesPay(false);
  }, []);

  const openCreate = useCallback(() => {
    setDialogError(null);
    setCode("");
    setName("");
    setCarriesPay(false);
    setDialog({ mode: "create" });
  }, []);

  const openEdit = useCallback((status: StatusResponse) => {
    setName(status.nameAr);
    setCarriesPay(status.carriesPay);
    setDialogError(null);
    setDialog({ mode: "edit", status });
  }, []);

  return {
    dialog,
    dialogError,
    code,
    name,
    carriesPay,
    setDialogError,
    setCode: (value: string) => {
      setDialogError(null);
      setCode(value);
    },
    setName: (value: string) => {
      setDialogError(null);
      setName(value);
    },
    setCarriesPay,
    openCreate,
    openEdit,
    closeDialog,
  };
}

type DialogState = ReturnType<typeof useStatusDialogState>;

export function useStatusSubmit(state: DialogState) {
  const create = useCreateStatus();
  const update = useUpdateStatus();

  const submit = useCallback(() => {
    const dialog = state.dialog;
    if (create.isPending || update.isPending || !dialog) return;
    const nameAr = state.name.trim();
    const trimmedCode = state.code.trim();
    if (nameAr === "" || (dialog.mode === "create" && trimmedCode === "")) {
      state.setDialogError(STATUSES_CODE_REQUIRED);
      return;
    }
    const onError = (error: unknown) =>
      state.setDialogError(settingsFailureMessage(error));
    if (dialog.mode === "create") {
      create.mutate(
        { code: trimmedCode, nameAr, carriesPay: state.carriesPay },
        { onSuccess: state.closeDialog, onError },
      );
      return;
    }
    update.mutate(
      {
        id: dialog.status.id,
        body: {
          nameAr,
          carriesPay: state.carriesPay,
          version: dialog.status.version,
        },
      },
      { onSuccess: state.closeDialog, onError },
    );
  }, [state, create, update]);

  return { submit, isSubmitting: create.isPending || update.isPending };
}
