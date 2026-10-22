// apps/web — settings feature API calls (SPEC §10.6 config rows; §9.1's
// sanctioned fetch context, the Phase-2 per-feature pattern). Types come
// from @sharq/schemas (§10.3 one source — no hand DTOs); money is integer
// minor on the wire (EC-31 — the normalizer runs client-side BEFORE these
// calls), and the holidays read feeds the periods screen's boundary preview
// only (the holidays UI itself is v1.1, FR-SET-06).
import type {
  CreateRateBody,
  CreateReasonBody,
  CreateStatusBody,
  HolidaysResponseBody,
  RateResponse,
  RatesResponseBody,
  ReasonsResponseBody,
  SettingImpactBody,
  SettingImpactResponse,
  SettingRowResponse,
  SettingsResponseBody,
  StatusesResponseBody,
  UpdateRateBody,
  UpdateReasonBody,
  UpdateStatusBody,
} from "@sharq/schemas";
import {
  isSharqError,
  sharqErrorFromResponse,
  transportError,
} from "../../lib/sharq-error";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(path, {
      credentials: "include",
      ...init,
      headers: { "content-type": "application/json", ...init?.headers },
    });
    if (!response.ok) throw await sharqErrorFromResponse(response);
    return (await response.json()) as T;
  } catch (error) {
    if (isSharqError(error)) throw error;
    throw transportError();
  }
}

// §10.6 SET-01/SET-02 — resolved settings + the FR-SET-02 impact preview.
export function getSettings(): Promise<SettingsResponseBody> {
  return request("/api/settings");
}

export function previewSettingImpact(
  body: SettingImpactBody,
): Promise<SettingImpactResponse> {
  return request("/api/settings/impact", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function patchSetting(
  key: string,
  body: {
    value: unknown;
    note?: string;
    version: number;
  },
): Promise<{ setting: SettingRowResponse }> {
  return request(`/api/settings/${encodeURIComponent(key)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// §10.6 rates rows (FR-SET-03).
export function listRates(): Promise<RatesResponseBody> {
  return request("/api/rates");
}

export function createRate(
  body: CreateRateBody,
): Promise<{ rate: RateResponse }> {
  return request("/api/rates", { method: "POST", body: JSON.stringify(body) });
}

export function updateRate(
  id: string,
  body: UpdateRateBody,
): Promise<{ rate: RateResponse }> {
  return request(`/api/rates/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// §10.6 catalog rows (FR-SET-04/05).
export function listReasons(): Promise<ReasonsResponseBody> {
  return request("/api/reason-catalog");
}

export function createReason(
  body: CreateReasonBody,
): Promise<{ reason: ReasonsResponseBody["reasons"][number] }> {
  return request("/api/reason-catalog", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateReason(
  id: string,
  body: UpdateReasonBody,
): Promise<{ reason: ReasonsResponseBody["reasons"][number] }> {
  return request(`/api/reason-catalog/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function listStatuses(): Promise<StatusesResponseBody> {
  return request("/api/attendance-statuses");
}

export function createStatus(
  body: CreateStatusBody,
): Promise<{ status: StatusesResponseBody["statuses"][number] }> {
  return request("/api/attendance-statuses", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updateStatus(
  id: string,
  body: UpdateStatusBody,
): Promise<{ status: StatusesResponseBody["statuses"][number] }> {
  return request(`/api/attendance-statuses/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// §10.6 holidays read (the periods screen's payday-shift preview).
export function listHolidays(): Promise<HolidaysResponseBody> {
  return request("/api/holidays");
}
