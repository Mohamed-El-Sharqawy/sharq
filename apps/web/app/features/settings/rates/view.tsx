// apps/web — /settings/rates view (SPEC §11 rates row: the effective-dated
// rate table by scope + timeline; «مفيش أسعار» is the §11-verbatim empty
// state). Rows render their validity window; open rows close via a dated
// dialog, closed rows reopen — errors (EC-56 successor, FR-SET-09 period
// guard, CONFLICT_VERSION) surface through the shared row error.
import type { RateResponse } from "@sharq/schemas";
import {
  RATES_ADD,
  RATES_CLOSE_ACTION,
  RATES_EMPTY,
  RATES_OPEN_ENDED,
  RATES_REOPEN,
  RATES_REOPEN_MESSAGE,
  RATES_VALID_FROM,
  RATES_VALID_TO,
  SETTINGS_NAV_RATES,
} from "@sharq/locales";
import { Button, ConfirmDialog, DialogError } from "@sharq/ui";
import { SettingsScreen, SettingsBody } from "../components/settings-screen";
import { formatDateLabel, formatMoney } from "../format";
import { AddRateDialog } from "./components/add-rate-dialog";
import { CloseRateDialog } from "./components/close-rate-dialog";
import type { RateGroup, RatesScreen } from "./logic";

export function RatesView({ screen }: { screen: RatesScreen }) {
  return (
    <SettingsScreen title={SETTINGS_NAV_RATES}>
      <SettingsBody
        isPending={screen.isPending}
        errorMessage={screen.loadError}
        emptyMessage={screen.hasRows ? null : RATES_EMPTY}
        onRetry={screen.retry}
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <DialogError message={screen.rowError} />
            <Button onClick={screen.openAdd}>{RATES_ADD}</Button>
          </div>
          {screen.groups.map((group) => (
            <RateGroupSection key={group.key} group={group} screen={screen} />
          ))}
        </div>
      </SettingsBody>
      <AddRateDialog open={screen.addOpen} onClose={screen.closeAdd} />
      <CloseRateDialog screen={screen} />
      <ConfirmDialog
        open={screen.reopening !== null}
        title={RATES_REOPEN}
        message={RATES_REOPEN_MESSAGE}
        confirmLabel={RATES_REOPEN}
        submitting={screen.isMutating}
        onConfirm={() => {
          if (screen.reopening) screen.confirmReopen(screen.reopening);
        }}
        onClose={screen.cancelReopen}
      />
    </SettingsScreen>
  );
}

function RateGroupSection({
  group,
  screen,
}: {
  group: RateGroup;
  screen: RatesScreen;
}) {
  return (
    <section className="space-y-2 rounded-md border border-border p-3">
      <h2 className="text-sm font-semibold">{group.label}</h2>
      <ul className="space-y-1">
        {group.rows.map((rate) => (
          <RateRow key={rate.id} rate={rate} screen={screen} />
        ))}
      </ul>
    </section>
  );
}

function RateRow({
  rate,
  screen,
}: {
  rate: RateResponse;
  screen: RatesScreen;
}) {
  const style = screen.digitStyle;
  return (
    <li className="flex items-center justify-between gap-2 rounded border border-border px-3 py-2">
      <div className="text-sm">
        <span className="font-medium">
          {formatMoney(rate.amountMinor, screen.scale, style)}
        </span>
        <span className="ms-2 text-muted-foreground">
          {RATES_VALID_FROM} {formatDateLabel(rate.validFrom, style)}
          {rate.validTo
            ? ` — ${RATES_VALID_TO} ${formatDateLabel(rate.validTo, style)}`
            : ` — ${RATES_OPEN_ENDED}`}
        </span>
        {rate.note ? (
          <span className="ms-2 text-xs text-muted-foreground">
            ({rate.note})
          </span>
        ) : null}
      </div>
      {rate.validTo ? (
        <Button
          variant="outline"
          disabled={screen.isMutating}
          onClick={() => screen.requestReopen(rate)}
        >
          {RATES_REOPEN}
        </Button>
      ) : (
        <Button
          variant="outline"
          disabled={screen.isMutating}
          onClick={() => screen.requestClose(rate)}
        >
          {RATES_CLOSE_ACTION}
        </Button>
      )}
    </li>
  );
}
