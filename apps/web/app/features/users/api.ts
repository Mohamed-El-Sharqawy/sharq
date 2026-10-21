// apps/web — users feature API calls (SPEC §10.6 users rows; §9.1's
// sanctioned fetch context). Types come from @sharq/schemas (§10.3 one
// source — no hand DTOs). Eden treaty swap = follow-up CHORE (flagged in
// PROGRESS 2026-10-22); the envelope mapping is §10.4 either way.
import type {
  CreateUserBody,
  ListUsersQuery,
  TempPasswordBody,
  UserResponse,
  UsersPageBody,
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

function toQueryString(query: ListUsersQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/** GET /api/users — paginated admin search (FR-ADM-06). */
export function listUsers(query: ListUsersQuery): Promise<UsersPageBody> {
  return request<UsersPageBody>(`/api/users${toQueryString(query)}`);
}

/** POST /api/users — returns the minted temp password once (FR-AUTH-04). */
export function createUser(
  body: CreateUserBody,
): Promise<{ user: UserResponse; tempPassword: string }> {
  return request("/api/users", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/users/:id/reset-password — revokes sessions (FR-AUTH-05). */
export function resetUserPassword(id: string): Promise<TempPasswordBody> {
  return request(`/api/users/${id}/reset-password`, { method: "POST" });
}

/** POST /api/users/:id/deactivate | /reactivate (FR-AUTH-06) — the
 * version rides the body for optimistic concurrency. */
export function setUserActive(
  id: string,
  active: boolean,
  version: number,
): Promise<{ user: UserResponse }> {
  return request(`/api/users/${id}/${active ? "reactivate" : "deactivate"}`, {
    method: "POST",
    body: JSON.stringify({ version }),
  });
}
