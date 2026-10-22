// apps/web — the settings screens' shared shell (SPEC §11: every screen
// reuses the §9.9 states; the section nav + title + §5.8 stale banner are
// common, the body is screen-supplied).
import type { ReactNode } from "react";
import { SETTINGS_STALE_BANNER } from "@sharq/locales";
import { EmptyState, ErrorState, LoadingState } from "@sharq/ui";
import type { SettingsSaver } from "../use-settings-save";
import { StaleSettingsBanner } from "./impact-preview-dialog";
import { SettingsNav } from "./settings-nav";

export function SettingsScreen({
  title,
  saver,
  children,
}: {
  title: string;
  saver?: SettingsSaver;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="text-xl font-semibold">{title}</h1>
      <SettingsNav />
      {saver?.stale ? (
        <StaleSettingsBanner
          message={SETTINGS_STALE_BANNER}
          onDismiss={saver.dismissStale}
        />
      ) : null}
      {children}
    </main>
  );
}

/** The standard data-area: loading skeleton / error+retry / empty / body. */
export function SettingsBody({
  isPending,
  errorMessage,
  emptyMessage,
  onRetry,
  children,
}: {
  isPending: boolean;
  errorMessage: string | null;
  emptyMessage: string | null;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isPending) return <LoadingState rows={4} />;
  if (errorMessage)
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  if (emptyMessage !== null) return <EmptyState message={emptyMessage} />;
  return <>{children}</>;
}
