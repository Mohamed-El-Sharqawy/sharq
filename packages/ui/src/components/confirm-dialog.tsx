// @sharq/ui — the shared confirm dialog: Modal + copy + two buttons.
// Screens supply the Arabic copy (title/message/confirm label) so this
// stays a pure shell (SPEC §9.9 reuse rule: no bespoke dialog JSX per
// screen for the same shape).
import { DIALOG_CANCEL, SAVE_SUBMITTING } from "@sharq/locales";
import { Button } from "./button";
import { Modal } from "./modal";

export type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  submitting?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  submitting = false,
  destructive = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {DIALOG_CANCEL}
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? SAVE_SUBMITTING : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="text-sm text-muted-foreground">{message}</p>
    </Modal>
  );
}
