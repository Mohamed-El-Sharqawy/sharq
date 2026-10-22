// apps/web — the policies screen's three field groups (SPEC §11 policies
// row): edit window, lock/pay flags, deduction limits. Presentational —
// the screen hook owns the draft.
import {
  POLICIES_ADMIN_UNLOCK,
  POLICIES_AUTO_LOCK,
  POLICIES_AUTO_LOCK_OFF,
  POLICIES_BLOCK_FUTURE,
  POLICIES_DAYS_BACK,
  POLICIES_EXCEED_DAY,
  POLICIES_EXCEED_WEEK,
  POLICIES_FLOOR_ZERO,
  POLICIES_MAX_PER_ENTRY,
  POLICIES_MAX_PER_ENTRY_HINT,
  POLICIES_SUPERVISOR_LOCK,
  POLICIES_SUPERVISOR_PAID,
} from "@sharq/locales";
import {
  POLICIES_DEDUCTION_TITLE,
  POLICIES_FLAGS_TITLE,
  POLICIES_WINDOW_TITLE,
} from "@sharq/locales";
import { TextField } from "@sharq/ui";
import { CheckField, FieldGroup, MoneyField } from "../../components/fields";
import type { PoliciesScreen } from "../logic";

export function EditWindowGroup({ screen }: { screen: PoliciesScreen }) {
  const draft = screen.draft;
  if (!draft) return null;
  return (
    <FieldGroup title={POLICIES_WINDOW_TITLE}>
      <TextField
        label={POLICIES_DAYS_BACK}
        value={draft.daysBack}
        onChange={(value) => screen.set("daysBack", value)}
        inputMode="numeric"
      />
      <CheckField
        label={POLICIES_BLOCK_FUTURE}
        checked={draft.blockFutureDays}
        onChange={(checked) => screen.set("blockFutureDays", checked)}
      />
      <TextField
        label={`${POLICIES_AUTO_LOCK} (${POLICIES_AUTO_LOCK_OFF})`}
        value={draft.autoLockDays}
        onChange={(value) => screen.set("autoLockDays", value)}
        inputMode="numeric"
      />
    </FieldGroup>
  );
}

export function LocksGroup({ screen }: { screen: PoliciesScreen }) {
  const draft = screen.draft;
  if (!draft) return null;
  return (
    <FieldGroup title={POLICIES_FLAGS_TITLE}>
      <CheckField
        label={POLICIES_SUPERVISOR_LOCK}
        checked={draft.canSupervisorLock}
        onChange={(checked) => screen.set("canSupervisorLock", checked)}
      />
      <CheckField
        label={POLICIES_SUPERVISOR_PAID}
        checked={draft.canSupervisorMarkPaid}
        onChange={(checked) => screen.set("canSupervisorMarkPaid", checked)}
      />
      <CheckField
        label={POLICIES_ADMIN_UNLOCK}
        checked={draft.canAdminUnlockPaid}
        onChange={(checked) => screen.set("canAdminUnlockPaid", checked)}
      />
    </FieldGroup>
  );
}

export function DeductionsGroup({ screen }: { screen: PoliciesScreen }) {
  const draft = screen.draft;
  if (!draft) return null;
  return (
    <FieldGroup title={POLICIES_DEDUCTION_TITLE}>
      <CheckField
        label={POLICIES_EXCEED_DAY}
        checked={draft.allowExceedDayPay}
        onChange={(checked) => screen.set("allowExceedDayPay", checked)}
      />
      <CheckField
        label={POLICIES_EXCEED_WEEK}
        checked={draft.allowExceedWeeklyTotal}
        onChange={(checked) => screen.set("allowExceedWeeklyTotal", checked)}
      />
      <CheckField
        label={POLICIES_FLOOR_ZERO}
        checked={draft.floorAtZero}
        onChange={(checked) => screen.set("floorAtZero", checked)}
      />
      <MoneyField
        label={POLICIES_MAX_PER_ENTRY}
        value={draft.maxPerEntry}
        onChange={(value) => screen.set("maxPerEntry", value)}
        hint={POLICIES_MAX_PER_ENTRY_HINT}
      />
    </FieldGroup>
  );
}
