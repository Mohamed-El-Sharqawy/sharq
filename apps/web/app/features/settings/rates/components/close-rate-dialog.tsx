// apps/web — the close-rate dialog (FR-SET-03): a dated end for an open
// rate row. EC-56 (a company close needs a successor) and FR-SET-09 come
// back as errors through the screen's shared row error.
import { useCallback, useEffect, useState } from "react";
import {
  DIALOG_CANCEL,
  RATES_CLOSE_MESSAGE,
  RATES_CLOSE_TITLE,
  RATES_VALID_TO,
  SAVE_SUBMIT,
  SAVE_SUBMITTING,
} from "@sharq/locales";
import { Button, DialogError, Modal, TextField } from "@sharq/ui";
import { cairoTodayIso } from "../../../../lib/cairo-today";
import type { RatesScreen } from "../logic";

export function CloseRateDialog({ screen }: { screen: RatesScreen }) {
  const [validTo, setValidTo] = useState(cairoTodayIso());
  useEffect(() => {
    if (screen.closing) setValidTo(cairoTodayIso());
  }, [screen.closing]);
  const confirm = useCallback(() => {
    if (screen.closing) screen.confirmClose(screen.closing, validTo);
  }, [screen, validTo]);
  if (!screen.closing) return null;
  return (
    <Modal
      open
      title={RATES_CLOSE_TITLE}
      onClose={screen.cancelClose}
      footer={
        <>
          <Button variant="outline" onClick={screen.cancelClose}>
            {DIALOG_CANCEL}
          </Button>
          <Button onClick={confirm} disabled={screen.isMutating}>
            {screen.isMutating ? SAVE_SUBMITTING : SAVE_SUBMIT}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <TextField
          label={RATES_VALID_TO}
          value={validTo}
          onChange={setValidTo}
          type="date"
        />
        <p className="text-xs text-muted-foreground">{RATES_CLOSE_MESSAGE}</p>
        <DialogError message={screen.rowError} />
      </div>
    </Modal>
  );
}
