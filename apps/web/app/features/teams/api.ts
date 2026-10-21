// apps/web — teams feature API calls (SPEC §10.6 teams rows; §9.1's
// sanctioned fetch context). Types from @sharq/schemas (§10.3 one source).
// NOTE §10.6 gaps (flagged in PROGRESS 2026-10-22): no GET /api/teams/:id
// (detail reads the list payload) and no memberships read endpoint (live
// members arrive via GET /api/users?teamId=…) — end/transfer READBACK is
// deferred accordingly.
import type {
  AddMemberBody,
  CreateTeamBody,
  ListTeamsQuery,
  MembershipResponse,
  TeamResponse,
  TeamsPageBody,
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

function toQueryString(query: ListTeamsQuery): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, value);
  }
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

/** GET /api/teams — paginated teams (FR-ADM-01 surface). */
export function listTeams(query: ListTeamsQuery): Promise<TeamsPageBody> {
  return request<TeamsPageBody>(`/api/teams${toQueryString(query)}`);
}

/** POST /api/teams (FR-ADM-01) — supervisor optional at creation. */
export function createTeam(
  body: CreateTeamBody,
): Promise<{ team: TeamResponse }> {
  return request("/api/teams", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** POST /api/teams/:id/members (FR-ADM-03; FR-ADM-05 transfer when the
 * user lives in another team — the service closes old at D−1 / opens D). */
export function addTeamMember(
  teamId: string,
  body: AddMemberBody,
): Promise<{ membership: MembershipResponse }> {
  return request(`/api/teams/${teamId}/members`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
