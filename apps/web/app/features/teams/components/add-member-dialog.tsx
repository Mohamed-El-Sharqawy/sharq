// apps/web — add-member dialog (FR-ADM-03; FR-ADM-05 transfer when the
// user lives elsewhere — the static impact note covers both). The date
// default is Cairo today (logic.ts); the server owns real validation.
import {
  DIALOG_CANCEL,
  SAVE_SUBMITTING,
  TEAM_ADD_MEMBER,
  TEAM_ADD_MEMBER_FROM,
  TEAM_ADD_MEMBER_TRANSFER_NOTE,
  TEAM_ADD_MEMBER_USER,
} from "@sharq/locales";
import { DialogError, HiddenSubmit, SelectField, TextField } from "@sharq/ui";
import { Button } from "@sharq/ui/components/button";
import { Modal } from "@sharq/ui/components/modal";
import type { UserResponse } from "@sharq/schemas";
import type { AddMemberForm } from "../detail.reducer";

export type AddMemberDialogProps = {
  open: boolean;
  form: AddMemberForm;
  users: UserResponse[];
  error: string | null;
  submitting: boolean;
  onField: (field: keyof AddMemberForm, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

function AddMemberFields({
  form,
  users,
  onField,
}: {
  form: AddMemberForm;
  users: UserResponse[];
  onField: (field: keyof AddMemberForm, value: string) => void;
}) {
  return (
    <>
      <SelectField
        label={TEAM_ADD_MEMBER_USER}
        placeholderOption=""
        value={form.userId}
        onChange={(value) => onField("userId", value)}
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.displayNameAr}
          </option>
        ))}
      </SelectField>
      <TextField
        label={TEAM_ADD_MEMBER_FROM}
        dir="ltr"
        type="date"
        value={form.validFrom}
        onChange={(value) => onField("validFrom", value)}
      />
      <p className="text-xs text-muted-foreground">
        {TEAM_ADD_MEMBER_TRANSFER_NOTE}
      </p>
    </>
  );
}

export function AddMemberDialog({
  open,
  form,
  users,
  error,
  submitting,
  onField,
  onSubmit,
  onClose,
}: AddMemberDialogProps) {
  return (
    <Modal
      open={open}
      title={TEAM_ADD_MEMBER}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !form.userId}>
            {submitting ? SAVE_SUBMITTING : TEAM_ADD_MEMBER}
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
        <AddMemberFields form={form} users={users} onField={onField} />
        <DialogError message={error} />
        <HiddenSubmit />
      </form>
    </Modal>
  );
}
