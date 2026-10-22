// apps/web — the status create/edit dialog (FR-SET-05): code (create only),
// Arabic name, carries-pay flag. Server rejects duplicate codes (409
// DUPLICATE) and system-row changes (SYSTEM_PROTECTED) — both surface here.
import {
  DIALOG_CANCEL,
  SAVE_SUBMIT,
  SAVE_SUBMITTING,
  STATUSES_ADD,
  STATUSES_CODE_LABEL,
  STATUSES_NAME_LABEL,
  STATUSES_CARRIES_PAY,
} from "@sharq/locales";
import { Button, DialogError, Modal, TextField } from "@sharq/ui";
import { CheckField } from "../../components/fields";
import type { StatusesScreen } from "../logic";

export function StatusDialogView({ screen }: { screen: StatusesScreen }) {
  if (screen.dialog === null) return null;
  const dialog = screen.dialog;
  return (
    <Modal
      open
      title={dialog.mode === "create" ? STATUSES_ADD : dialog.status.nameAr}
      onClose={screen.closeDialog}
      footer={
        <>
          <Button variant="outline" onClick={screen.closeDialog}>
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={screen.submit} disabled={screen.isSubmitting}>
            {screen.isSubmitting ? SAVE_SUBMITTING : SAVE_SUBMIT}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        {dialog.mode === "create" ? (
          <TextField
            label={STATUSES_CODE_LABEL}
            value={screen.code}
            onChange={screen.setCode}
            dir="ltr"
          />
        ) : null}
        <TextField
          label={STATUSES_NAME_LABEL}
          value={screen.name}
          onChange={screen.setName}
        />
        <CheckField
          label={STATUSES_CARRIES_PAY}
          checked={screen.carriesPay}
          onChange={screen.setCarriesPay}
        />
        <DialogError message={screen.dialogError} />
      </div>
    </Modal>
  );
}
