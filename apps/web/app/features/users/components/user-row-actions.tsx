// apps/web — per-user lifecycle action row in the /users list
// (FR-AUTH-05/06 surface: reset + deactivate/reactivate).
import {
  USER_DEACTIVATE,
  USER_REACTIVATE,
  USER_RESET_PASSWORD,
} from "@sharq/locales";
import { Button } from "@sharq/ui";
import type { UserResponse } from "@sharq/schemas";
import type { UserLifecycleIntent } from "../screen.reducer";

export function UserRowActions({
  user,
  onAction,
}: {
  user: UserResponse;
  onAction: (intent: UserLifecycleIntent, id: string) => void;
}) {
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={() => onAction("reset", user.id)}
      >
        {USER_RESET_PASSWORD}
      </Button>
      {user.isActive ? (
        <Button
          size="sm"
          variant="destructive"
          onClick={() => onAction("deactivate", user.id)}
        >
          {USER_DEACTIVATE}
        </Button>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onAction("reactivate", user.id)}
        >
          {USER_REACTIVATE}
        </Button>
      )}
    </div>
  );
}
