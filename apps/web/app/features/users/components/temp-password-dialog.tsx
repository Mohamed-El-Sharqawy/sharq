// apps/web — the one-shot temp-password reveal (FR-AUTH-04/05: create +
// admin reset both land here). Read-only dialog: copy happens by the user
// selecting the code; no clipboard plumbing in v1.
import {
  DIALOG_CLOSE,
  TEMP_PASSWORD_HINT,
  TEMP_PASSWORD_TITLE,
} from "@sharq/locales";
import { Button } from "@sharq/ui/components/button";
import { Modal } from "@sharq/ui/components/modal";

export type TempPasswordDialogProps = {
  open: boolean;
  tempPassword: string;
  onClose: () => void;
};

export function TempPasswordDialog({
  open,
  tempPassword,
  onClose,
}: TempPasswordDialogProps) {
  return (
    <Modal
      open={open}
      title={TEMP_PASSWORD_TITLE}
      onClose={onClose}
      footer={<Button onClick={onClose}>{DIALOG_CLOSE}</Button>}
    >
      <p className="mb-2 text-sm text-muted-foreground">{TEMP_PASSWORD_HINT}</p>
      <code
        dir="ltr"
        className="block rounded-md bg-muted px-3 py-2 text-center font-mono text-lg"
      >
        {tempPassword}
      </code>
    </Modal>
  );
}
