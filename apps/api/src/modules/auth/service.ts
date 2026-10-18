// SPEC §10.1 — the auth service surface: a thin factory wiring the ports to
// the feature functions (login.ts, session.ts). Idle minutes default to the
// registry's security.sessionIdleMinutes (240) until the settings plugin
// lands. Plugins (§10.6 rows) consume only this factory; units test the
// functions against mocked ports (TESTING §4.2).
import { defaultSettingValues } from "@sharq/schemas";
import { LOCKOUT_MAX_FAILURES, LOCKOUT_MINUTES } from "./lockout";
import { login, type LoginDeps } from "./login";
import {
  isSessionExpired,
  logout,
  resolveSession,
  sessionExpiry,
} from "./session";
import type { LoginInput } from "./types";

export type AuthServiceDeps = LoginDeps;

export { LOCKOUT_MAX_FAILURES, LOCKOUT_MINUTES };
export { isSessionExpired, sessionExpiry };
export type {
  AuditEntry,
  AuditPort,
  AuthRepo,
  AuthRole,
  AuthSession,
  AuthUser,
  AuthUserWithHash,
  LoginInput,
  LoginResult,
} from "./types";

export function createAuthService(deps: AuthServiceDeps) {
  const idleMinutes = () =>
    deps.idleMinutes ?? defaultSettingValues()["security.sessionIdleMinutes"];
  const sessions = { repo: deps.repo, idleMinutes };
  return {
    login: (input: LoginInput, now: Date) => login(deps, input, now),
    resolveSession: (token: string, now: Date) =>
      resolveSession(sessions, token, now),
    logout: (token: string, now: Date) => logout(sessions, token, now),
  };
}
