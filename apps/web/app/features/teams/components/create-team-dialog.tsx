// apps/web — create-team dialog (FR-ADM-01): name + optional supervisor.
// Supervisor options arrive as props (the screen logic's users query) —
// this file stays pure.
import {
  DIALOG_CANCEL,
  SAVE_SUBMITTING,
  TEAM_CREATE_NAME,
  TEAM_SUPERVISOR_LABEL,
  TEAM_SUPERVISOR_NONE,
  TEAMS_CREATE,
} from "@sharq/locales";
import { DialogError, HiddenSubmit, SelectField, TextField } from "@sharq/ui";
import { Button } from "@sharq/ui/components/button";
import { Modal } from "@sharq/ui/components/modal";
import type { UserResponse } from "@sharq/schemas";
import type { CreateTeamForm } from "../screen.reducer";

export type CreateTeamDialogProps = {
  open: boolean;
  form: CreateTeamForm;
  supervisors: UserResponse[];
  error: string | null;
  submitting: boolean;
  onField: (field: keyof CreateTeamForm, value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function CreateTeamDialog({
  open,
  form,
  supervisors,
  error,
  submitting,
  onField,
  onSubmit,
  onClose,
}: CreateTeamDialogProps) {
  return (
    <Modal
      open={open}
      title={TEAMS_CREATE}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={onSubmit} disabled={submitting}>
            {submitting ? SAVE_SUBMITTING : TEAMS_CREATE}
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
        <TextField
          label={TEAM_CREATE_NAME}
          dir="auto"
          value={form.nameAr}
          onChange={(value) => onField("nameAr", value)}
        />
        <SelectField
          label={TEAM_SUPERVISOR_LABEL}
          placeholderOption={TEAM_SUPERVISOR_NONE}
          value={form.supervisorId}
          onChange={(value) => onField("supervisorId", value)}
        >
          {supervisors.map((user) => (
            <option key={user.id} value={user.id}>
              {user.displayNameAr}
            </option>
          ))}
        </SelectField>
        <DialogError message={error} />
        <HiddenSubmit />
      </form>
    </Modal>
  );
}
