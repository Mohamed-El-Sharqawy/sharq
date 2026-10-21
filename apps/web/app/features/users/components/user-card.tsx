// apps/web — one user card in the /users list (§11 "Card list" mobile
// behavior). Trivial presentational component — single file per §9.5.
import { ROLE_LABELS, USERS_ACTIVE, USERS_INACTIVE } from "@sharq/locales";
import type { UserResponse } from "@sharq/schemas";
import { Link } from "react-router";

export function UserCard({ user }: { user: UserResponse }) {
  const isActive = user.isActive;
  return (
    <li
      data-slot="user-card"
      className="rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <Link
          to={`/users/${user.id}`}
          viewTransition
          className="font-medium hover:underline"
        >
          {user.displayNameAr}
        </Link>
        <span
          className={
            isActive
              ? "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              : "rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
          }
        >
          {isActive ? USERS_ACTIVE : USERS_INACTIVE}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground" dir="ltr">
        {user.username}
        {user.phone ? ` · ${user.phone}` : ""}
      </p>
      <p className="mt-1 text-sm">{ROLE_LABELS[user.role]}</p>
    </li>
  );
}
