// SPEC §10.1 — the configuration service surface (§5 settings + rates +
// catalogs + holidays). Route plugins consume only this factory; the
// logic files carry the §5.5 change-safety rules, this file stays wiring.
import type { SettingValues } from "@sharq/schemas";
import { createHoliday, deleteHoliday } from "./holidays";
import { previewSetting } from "./impact";
import { createRate } from "./rates.create";
import { updateRate } from "./rates.update";
import { createReason, updateReason } from "./reasons";
import { resolvedSettings } from "./resolved-settings";
import { createStatus, updateStatus } from "./statuses";
import { updateSetting, type ConfigDeps } from "./update-setting";
import type {
  CreateHolidayInput,
  CreateHolidayResult,
  CreateReasonInput,
  CreateReasonResult,
  CreateRateInput,
  CreateRateResult,
  CreateStatusInput,
  CreateStatusResult,
  DeleteHolidayResult,
  ImpactInput,
  ImpactResult,
  UpdateReasonInput,
  UpdateReasonResult,
  UpdateRateInput,
  UpdateRateResult,
  UpdateSettingInput,
  UpdateSettingResult,
  UpdateStatusInput,
  UpdateStatusResult,
} from "./results";
import type {
  HolidayRecord,
  RateRecord,
  ReasonRecord,
  StatusRecord,
} from "./types";

export type ConfigServiceDeps = ConfigDeps;

/** The GET wire body: values + versions only — latestRow is service-
 * internal (write-target metadata), never serialized. */
export type ResolvedSettingsPublic = {
  values: SettingValues;
  versions: Record<string, number>;
};

export function createConfigService(deps: ConfigServiceDeps) {
  return {
    resolvedSettings: (): Promise<ResolvedSettingsPublic> =>
      resolvedSettings(deps.repo.settings).then(({ values, versions }) => ({
        values,
        versions,
      })),
    updateSetting: (
      input: UpdateSettingInput,
      now: Date,
    ): Promise<UpdateSettingResult> => updateSetting(deps, input, now),
    previewSetting: (input: ImpactInput, now: Date): Promise<ImpactResult> =>
      previewSetting(deps, input, now),

    listRates: (): Promise<RateRecord[]> => deps.repo.rates.listRates(),
    createRate: (input: CreateRateInput): Promise<CreateRateResult> =>
      createRate(deps, input),
    updateRate: (
      input: UpdateRateInput,
      now: Date,
    ): Promise<UpdateRateResult> => updateRate(deps, input, now),

    listReasons: (): Promise<ReasonRecord[]> =>
      deps.repo.catalogs.listReasons(),
    createReason: (input: CreateReasonInput): Promise<CreateReasonResult> =>
      createReason(deps, input),
    updateReason: (input: UpdateReasonInput): Promise<UpdateReasonResult> =>
      updateReason(deps, input),

    listStatuses: (): Promise<StatusRecord[]> =>
      deps.repo.catalogs.listStatuses(),
    createStatus: (input: CreateStatusInput): Promise<CreateStatusResult> =>
      createStatus(deps, input),
    updateStatus: (input: UpdateStatusInput): Promise<UpdateStatusResult> =>
      updateStatus(deps, input),

    listHolidays: (): Promise<HolidayRecord[]> =>
      deps.repo.holidays.listHolidays(),
    createHoliday: (input: CreateHolidayInput): Promise<CreateHolidayResult> =>
      createHoliday(deps, input),
    deleteHoliday: (
      actorId: string,
      id: string,
    ): Promise<DeleteHolidayResult> => deleteHoliday(deps, actorId, id),
  };
}

export type ConfigService = ReturnType<typeof createConfigService>;

export type {
  ConfigRepo,
  HolidayRecord,
  RateRecord,
  ReasonRecord,
  SettingRecord,
  StatusRecord,
} from "./types";
export type {
  CreateHolidayInput,
  CreateHolidayResult,
  CreateReasonInput,
  CreateReasonResult,
  CreateRateInput,
  CreateRateResult,
  CreateStatusInput,
  CreateStatusResult,
  DeleteHolidayResult,
  ImpactInput,
  ImpactResult,
  ResolvedSettings,
  UpdateReasonInput,
  UpdateReasonResult,
  UpdateRateInput,
  UpdateRateResult,
  UpdateSettingInput,
  UpdateSettingResult,
  UpdateStatusInput,
  UpdateStatusResult,
} from "./results";
