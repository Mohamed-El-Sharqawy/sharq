// apps/web — the FR-SET-02 save flow every settings screen shares: drafts →
// server impact previews (§5.5.6) → the shared ImpactPreviewDialog → confirm
// → one PATCH per key with ITS OWN version token (EC-53). A 409
// CONFLICT_VERSION runs the §5.8 stale-write protocol: rebase the cache from
// `meta.current`, show the banner, keep the drafts for re-validation —
// flagged, never silently dropped (EC-48). The server re-validates every
// value; `details.reason` machine codes map to Arabic here (EC-52/56).
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import type {
  SettingImpactResponse,
  SettingKey,
  SettingValues,
  SettingsResponseBody,
} from "@sharq/schemas";
import { SETTINGS_REASON_MESSAGES } from "@sharq/locales";
import { errorMessage, isSharqError } from "../../lib/sharq-error";
import { previewSettingImpact } from "./api";
import { usePatchSetting } from "./mutations";
import { settingsKeys } from "./queries";

export type SettingDraft = {
  key: SettingKey;
  value: SettingValues[SettingKey];
  label: string;
};

type PendingSave = {
  drafts: SettingDraft[];
  impacts: SettingImpactResponse[];
};

/** `details.reason` → Arabic; unmapped codes fall back to the envelope's
 * message (§10.4). Shared by the dialogs (rates/reasons/statuses) too. */
export function settingsFailureMessage(error: unknown): string {
  if (isSharqError(error)) {
    const reason = (error.details as { reason?: unknown } | null)?.reason;
    if (typeof reason === "string" && reason in SETTINGS_REASON_MESSAGES) {
      return SETTINGS_REASON_MESSAGES[reason] ?? errorMessage(error);
    }
  }
  return errorMessage(error);
}

/** EC-48/EC-53 half: fold the 409's fresh payload (`meta.current` =
 * {key, value, validFrom, version}) into the ['settings'] cache so the
 * screens re-resolve against what the server actually has. */
function rebaseCache(
  queryClient: ReturnType<typeof useQueryClient>,
  error: { meta: unknown },
): void {
  const current = (
    error.meta as {
      current?: { key: string; value: unknown; version: number };
    } | null
  )?.current;
  if (!current) return;
  queryClient.setQueryData<SettingsResponseBody>(settingsKeys.all, (old) =>
    old
      ? {
          values: { ...old.values, [current.key]: current.value },
          versions: { ...old.versions, [current.key]: current.version },
        }
      : old,
  );
}

type SaveRun = {
  versions: Record<string, number> | undefined;
  save: (input: {
    key: string;
    value: unknown;
    version: number;
  }) => Promise<unknown>;
  onConflict: (error: { meta: unknown }) => void;
  onError: (message: string) => void;
};

/** Sequential PATCHes, each key with its own token (EC-53); the first
 * failure stops the run with the rest of the drafts intact (§5.8). */
async function saveAll(drafts: SettingDraft[], run: SaveRun): Promise<boolean> {
  for (const draft of drafts) {
    try {
      await run.save({
        key: draft.key,
        value: draft.value as unknown,
        version: run.versions?.[draft.key] ?? 0,
      });
    } catch (error) {
      if (isSharqError(error) && error.code === "CONFLICT_VERSION") {
        run.onConflict(error);
      }
      run.onError(settingsFailureMessage(error));
      return false;
    }
  }
  return true;
}

export function useSettingsSaver() {
  const queryClient = useQueryClient();
  const patch = usePatchSetting();
  const [pending, setPending] = useState<PendingSave | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const beginSave = useCallback(async (drafts: SettingDraft[]) => {
    if (drafts.length === 0) return;
    setDialogError(null);
    setPreviewing(true);
    try {
      const impacts = await Promise.all(
        drafts.map(({ key, value }) =>
          previewSettingImpact({ key, value: value as unknown }),
        ),
      );
      setPending({ drafts, impacts });
    } catch (error) {
      setDialogError(settingsFailureMessage(error));
    } finally {
      setPreviewing(false);
    }
  }, []);

  const close = useCallback(() => {
    setPending(null);
    setDialogError(null);
  }, []);

  const confirm = useCallback(() => {
    if (!pending || patch.isPending) return;
    const saved = queryClient.getQueryData<SettingsResponseBody>(
      settingsKeys.all,
    );
    setDialogError(null);
    void saveAll(pending.drafts, {
      versions: saved?.versions,
      save: (input) => patch.mutateAsync(input),
      onConflict: (error) => {
        rebaseCache(queryClient, error);
        setStale(true); // §5.8: «الإعدادات اتحدثت من مدير النظام»
      },
      onError: setDialogError,
    }).then((done) => {
      if (done) close();
    });
  }, [pending, patch, queryClient, close]);

  return {
    pending,
    previewing,
    saving: patch.isPending,
    dialogError,
    stale,
    beginSave,
    confirm,
    close,
    dismissStale: useCallback(() => setStale(false), []),
  };
}

export type SettingsSaver = ReturnType<typeof useSettingsSaver>;
