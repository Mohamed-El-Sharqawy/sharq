// apps/web — create-user dialog (FR-AUTH-04): pure fields over the
// reducer-owned form; submit is the screen logic's callback. Arabic
// labels from @sharq/locales only (§9); fields are ui primitives.
import {
  DIALOG_CANCEL,
  ROLE_LABELS,
  SAVE_SUBMITTING,
  USER_CREATE_DISPLAY_NAME,
  USER_CREATE_PHONE,
  USER_CREATE_ROLE,
  USER_CREATE_SUBMIT,
  USER_CREATE_TITLE,
  USER_CREATE_USERNAME,
} from "@sharq/locales";
import { DialogError, HiddenSubmit, SelectField, TextField } from "@sharq/ui";
import { Button } from "@sharq/ui/components/button";
import { Modal } from "@sharq/ui/components/modal";
import type { AuthUserResponse } from "@sharq/schemas";
import type { CreateUserForm } from "../screen.reducer";

const ROLES: ReadonlyArray<AuthUserResponse["role"]> = [
  "employee",
  "supervisor",
  "admin",
];

function CreateUserFields({
  form,
  onField,
}: {
  form: CreateUserForm;
  onField: (field: keyof CreateUserForm, value: string) => void;
}) {
  return (
    <>
      <TextField
        label={USER_CREATE_DISPLAY_NAME}
        dir="auto"
        value={form.displayNameAr}
        onChange={(value) => onField("displayNameAr", value)}
      />
      <TextField
        label={USER_CREATE_USERNAME}
        dir="ltr"
        value={form.username}
        onChange={(value) => onField("username", value)}
      />
      <TextField
        label={USER_CREATE_PHONE}
        dir="ltr"
        inputMode="tel"
        value={form.phone}
        onChange={(value) => onField("phone", value)}
      />
      <SelectField
        label={USER_CREATE_ROLE}
        value={form.role}
        onChange={(value) => onField("role", value)}
      >
        {ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </SelectField>
    </>
  );
}

export type CreateUserDialogProps = {
  open: boolean;
  form: CreateUserForm;
  error: string | null;
  submitting: boolean;
  onField: (field: keyof CreateUserForm, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function CreateUserDialog({
  open,
  form,
  error,
  submitting,
  onField,
  onSubmit,
  onClose,
}: CreateUserDialogProps) {
  return (
    <Modal
      open={open}
      title={USER_CREATE_TITLE}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? SAVE_SUBMITTING : USER_CREATE_SUBMIT}
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <CreateUserFields form={form} onField={onField} />
        <DialogError message={error} />
        <HiddenSubmit />
      </form>
    </Modal>
  );
}
