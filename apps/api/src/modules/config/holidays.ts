// Holiday business rules (FR-SET-06): add (date unique — 23505 surfaces as
// DUPLICATE) and remove. Holidays feed FR-PAY-08's payday shift; open
// periods see them immediately, locked snapshots never change (§5.5.2).
import type { ConfigDeps } from "./update-setting";
import type {
  CreateHolidayInput,
  CreateHolidayResult,
  DeleteHolidayResult,
} from "./results";

export async function createHoliday(
  deps: ConfigDeps,
  input: CreateHolidayInput,
): Promise<CreateHolidayResult> {
  const holiday = await deps.repo.holidays.insertHoliday({
    date: input.date,
    nameAr: input.nameAr,
    createdBy: input.actorId,
  });
  if (holiday === "DUPLICATE") return { ok: false, code: "DUPLICATE" };
  await deps.audit.record({
    action: "settings.holiday_create",
    entityType: "holiday",
    entityId: holiday.id,
    actorId: input.actorId,
    oldValue: null,
    newValue: holiday,
    note: null,
  });
  return { ok: true, holiday };
}

export async function deleteHoliday(
  deps: ConfigDeps,
  actorId: string,
  holidayId: string,
): Promise<DeleteHolidayResult> {
  const holiday = await deps.repo.holidays.deleteHoliday(holidayId);
  if (!holiday) return { ok: false, code: "NOT_FOUND" };
  await deps.audit.record({
    action: "settings.holiday_delete",
    entityType: "holiday",
    entityId: holiday.id,
    actorId,
    oldValue: holiday,
    newValue: null,
    note: null,
  });
  return { ok: true, holiday };
}
