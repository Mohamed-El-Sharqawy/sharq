// apps/web — the users lifecycle confirm dialog (shared by /users list
// and /users/:id profile): one Arabic wording per intent, FR-AUTH-05/06.
import {
  USER_DEACTIVATE,
  USER_DEACTIVATE_CONFIRM,
  USER_REACTIVATE,
  USER_REACTIVATE_CONFIRM,
  USER_RESET_CONFIRM,
  USER_RESET_PASSWORD,
} from "@sharq/locales";
import { ConfirmDialog } from "@sharq/ui";
import type { UserConfirmDialog, UserLifecycleIntent } from "../screen.reducer";

const CONFIRM_COPY: Record<
  UserLifecycleIntent,
  { title: string; message: string; label: string; destructive: boolean }
> = {
  reset: {
    title: USER_RESET_PASSWORD,
    message: USER_RESET_CONFIRM,
    label: USER_RESET_PASSWORD,
    destructive: false,
  },
  deactivate: {
    title: USER_DEACTIVATE,
    message: USER_DEACTIVATE_CONFIRM,
    label: USER_DEACTIVATE,
    destructive: true,
  },
  reactivate: {
    title: USER_REACTIVATE,
    message: USER_REACTIVATE_CONFIRM,
    label: USER_REACTIVATE,
    destructive: false,
  },
};

export function LifecycleConfirmDialog({
  dialog,
  submitting,
  onConfirm,
  onClose,
}: {
  dialog: UserConfirmDialog;
  submitting: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const copy = CONFIRM_COPY[dialog.intent];
  return (
    <ConfirmDialog
      open
      title={copy.title}
      message={copy.message}
      confirmLabel={copy.label}
      destructive={copy.destructive}
      submitting={submitting}
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
}
