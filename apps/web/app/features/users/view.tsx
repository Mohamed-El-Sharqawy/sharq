// apps/web — /users screen view (SPEC §11 users row: list/search +
// create/reset/deactivate; §9.9 shared states). Props-only: every value
// and callback comes from useUsersScreen (logic.ts).
import {
  USERS_ADD,
  USERS_EMPTY,
  USERS_SEARCH_LABEL,
  USERS_SEARCH_PLACEHOLDER,
  USERS_SEARCH_SUBMIT,
  USERS_TITLE,
} from "@sharq/locales";
import {
  Button,
  EmptyState,
  ErrorState,
  ListPagination,
  LoadingState,
  TextField,
} from "@sharq/ui";
import type { UserResponse } from "@sharq/schemas";
import { CreateUserDialog } from "./components/create-user-dialog";
import { LifecycleConfirmDialog } from "./components/lifecycle-confirm-dialog";
import { TempPasswordDialog } from "./components/temp-password-dialog";
import { UserCard } from "./components/user-card";
import { UserRowActions } from "./components/user-row-actions";
import type { UsersScreen } from "./logic";
import type { UserLifecycleIntent } from "./screen.reducer";

function UsersList({
  users,
  onAction,
}: {
  users: UserResponse[];
  onAction: (intent: UserLifecycleIntent, id: string) => void;
}) {
  return (
    <ul className="space-y-2">
      {users.map((user) => (
        <li key={user.id} className="space-y-2">
          <UserCard user={user} />
          <UserRowActions user={user} onAction={onAction} />
        </li>
      ))}
    </ul>
  );
}

function UsersDialogs({ screen }: { screen: UsersScreen }) {
  const { dialog } = screen;
  return (
    <>
      <CreateUserDialog
        open={dialog.kind === "create"}
        form={screen.createForm}
        error={screen.dialogError}
        submitting={screen.isSubmitting}
        onField={screen.setCreateField}
        onSubmit={screen.submitCreate}
        onClose={screen.closeDialog}
      />
      {dialog.kind === "confirm" ? (
        <LifecycleConfirmDialog
          dialog={dialog}
          submitting={screen.isSubmitting}
          onConfirm={screen.confirmIntent}
          onClose={screen.closeDialog}
        />
      ) : null}
      <TempPasswordDialog
        open={dialog.kind === "temp"}
        tempPassword={dialog.kind === "temp" ? dialog.tempPassword : ""}
        onClose={screen.closeDialog}
      />
    </>
  );
}

export function UsersView({ screen }: { screen: UsersScreen }) {
  return (
    <main className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">{USERS_TITLE}</h1>
        <Button onClick={screen.openCreate}>{USERS_ADD}</Button>
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          screen.search.onSubmit();
        }}
      >
        <TextField
          label={USERS_SEARCH_LABEL}
          placeholder={USERS_SEARCH_PLACEHOLDER}
          type="search"
          value={screen.search.value}
          onChange={screen.search.onChange}
        />
        <Button type="submit" variant="outline">
          {USERS_SEARCH_SUBMIT}
        </Button>
      </form>
      {screen.isPending ? (
        <LoadingState rows={5} />
      ) : screen.errorMessage ? (
        <ErrorState message={screen.errorMessage} onRetry={screen.retry} />
      ) : !screen.list || screen.list.items.length === 0 ? (
        <EmptyState message={USERS_EMPTY} />
      ) : (
        <>
          <UsersList users={screen.list.items} onAction={screen.openConfirm} />
          <ListPagination
            total={screen.list.total}
            hasPrev={screen.pagination.hasPrev}
            hasNext={screen.pagination.hasNext}
            onPrev={screen.pagination.prev}
            onNext={screen.pagination.next}
          />
        </>
      )}
      <UsersDialogs screen={screen} />
    </main>
  );
}
