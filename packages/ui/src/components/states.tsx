// SPEC §9.9 — the three shared state components, one implementation each,
// reused by every screen (no bespoke empty/loading/error JSX). Fixed Arabic
// labels come from @sharq/locales; screen-specific Arabic messages arrive via
// props (SPEC §11 rows). Utilities are logical/physical-neutral (SPEC §14.1).
import {
  ERROR_MESSAGE,
  ERROR_TITLE,
  LOADING_LABEL,
  RETRY_ACTION,
} from "@sharq/locales";
import { cn } from "cn";
import { Button } from "./button";

function EmptyState({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <div
      data-slot="empty-state"
      role="status"
      className={cn(
        "flex min-h-24 flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/30 p-6 text-center",
        className,
      )}
    >
      <p className="text-sm font-medium text-muted-foreground">{message}</p>
    </div>
  );
}

function LoadingState({
  rows = 3,
  className,
}: {
  // Bar count fixed in code: presentational default, not a business value.
  rows?: number;
  className?: string;
}) {
  return (
    <div
      data-slot="loading-state"
      role="status"
      aria-busy="true"
      className={cn("flex flex-col gap-2", className)}
    >
      <span className="sr-only">{LOADING_LABEL}</span>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          data-slot="skeleton"
          className="h-4 w-full animate-pulse rounded-md bg-muted"
        />
      ))}
    </div>
  );
}

function ErrorState({
  onRetry,
  message = ERROR_MESSAGE,
  className,
}: {
  onRetry: () => void;
  message?: string;
  className?: string;
}) {
  return (
    <div
      data-slot="error-state"
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center",
        className,
      )}
    >
      <h2 className="text-base font-semibold text-destructive">
        {ERROR_TITLE}
      </h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onRetry}>
        {RETRY_ACTION}
      </Button>
    </div>
  );
}

export { EmptyState, ErrorState, LoadingState };
