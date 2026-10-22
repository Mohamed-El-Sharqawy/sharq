// apps/web — the rates screen's row actions (FR-SET-03): close (dated end)
// and reopen via PATCH with the row's version; the shared row error shows
// EC-56's successor rule, FR-SET-09's period guard and CONFLICT_VERSION.
// Split from logic.ts (§9.2/§9.3 gate).
import { useCallback, useState } from "react";
import type { RateResponse } from "@sharq/schemas";
import { useUpdateRate } from "../mutations";
import { settingsFailureMessage } from "../use-settings-save";

export function useRateRowActions() {
  const update = useUpdateRate();
  const [rowError, setRowError] = useState<string | null>(null);
  const [closing, setClosing] = useState<RateResponse | null>(null);
  const [reopening, setReopening] = useState<RateResponse | null>(null);

  const confirmClose = useCallback(
    (rate: RateResponse, validTo: string) => {
      setRowError(null);
      update.mutate(
        { id: rate.id, body: { validTo, version: rate.version } },
        {
          onSuccess: () => setClosing(null),
          onError: (error) => setRowError(settingsFailureMessage(error)),
        },
      );
    },
    [update],
  );

  const confirmReopen = useCallback(
    (rate: RateResponse) => {
      setRowError(null);
      update.mutate(
        { id: rate.id, body: { validTo: null, version: rate.version } },
        {
          onSuccess: () => setReopening(null),
          onError: (error) => setRowError(settingsFailureMessage(error)),
        },
      );
    },
    [update],
  );

  const requestClose = useCallback((rate: RateResponse) => {
    setRowError(null);
    setClosing(rate);
  }, []);

  const requestReopen = useCallback((rate: RateResponse) => {
    setRowError(null);
    setReopening(rate);
  }, []);

  return {
    rowError,
    closing,
    reopening,
    requestClose,
    cancelClose: () => setClosing(null),
    requestReopen,
    cancelReopen: () => setReopening(null),
    confirmClose,
    confirmReopen,
    isMutating: update.isPending,
  };
}
