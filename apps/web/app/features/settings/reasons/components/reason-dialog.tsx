// apps/web — the reason create/edit dialog (FR-SET-04). The default-amount
// field shows for deduction reasons only; the deduction-cap pre-check and
// the server's DEFAULT_EXCEEDS_DEDUCTION_MAX surface here.
import {
  DIALOG_CANCEL,
  REASONS_ADD,
  REASONS_DEFAULT_AMOUNT,
  REASONS_NAME_LABEL,
  SAVE_SUBMIT,
  SAVE_SUBMITTING,
} from "@sharq/locales";
import { Button, DialogError, Modal, TextField } from "@sharq/ui";
import { MoneyField } from "../../components/fields";
import type { ReasonsScreen } from "../logic";

export function ReasonEditDialog({ screen }: { screen: ReasonsScreen }) {
  if (screen.dialog === null) return null;
  const dialog = screen.dialog;
  const kind = dialog.mode === "edit" ? dialog.reason.kind : dialog.kind;
  return (
    <Modal
      open
      title={dialog.mode === "create" ? REASONS_ADD : dialog.reason.nameAr}
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
        <TextField
          label={REASONS_NAME_LABEL}
          value={screen.name}
          onChange={screen.setName}
        />
        {kind === "deduction" ? (
          <MoneyField
            label={REASONS_DEFAULT_AMOUNT}
            value={screen.amount}
            onChange={screen.setAmount}
          />
        ) : null}
        <DialogError message={screen.dialogError} />
      </div>
    </Modal>
  );
}
