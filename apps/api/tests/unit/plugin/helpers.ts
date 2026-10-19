// Shared scaffolding for the plugin suites: every app is built over a
// CLONED user set (the mock repo mutates its rows), so specs never leak
// state into each other. Mocked ports per TESTING §4.2 — no Docker here.
import { createApp } from "../../../src/app";
import { hashPassword } from "../../../src/modules/auth/password";
import {
  makeAudit,
  makeRepo,
  makeUser,
  type UserWithHash,
} from "../auth/helpers";

export const PASSWORD = "Pw#Route-2026";
export const audit = makeAudit();
export const isTeamSupervisor = async () => false;

export async function makeAdmin(): Promise<UserWithHash> {
  return makeUser({
    username: "sayed",
    displayNameAr: "سيد",
    role: "admin",
    passwordHash: await hashPassword(PASSWORD),
  });
}

export function buildApp(admin: UserWithHash, secureCookies = false) {
  return createApp({
    repo: makeRepo([{ ...admin }]).repo,
    audit,
    isTeamSupervisor,
    dbCheck: async () => true,
    secureCookies,
  });
}

/** App + its repo handle, for specs asserting repo-level effects. */
export function buildAppWithRepo(admin: UserWithHash) {
  const repo = makeRepo([{ ...admin }]);
  const app = createApp({
    repo: repo.repo,
    audit,
    isTeamSupervisor,
    dbCheck: async () => true,
  });
  return { app, repo };
}

export const login = async (app: ReturnType<typeof createApp>, body: object) =>
  app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const cookieFrom = (res: Response) =>
  res.headers.get("set-cookie")!.split(";")[0]!.split("=")[1]!;

/** Typed Response.json() — bun-types returns unknown. */
export const json = <T>(res: Response): Promise<T> => res.json() as Promise<T>;

export type UserBody = {
  user: { id: string; username: string; displayNameAr: string };
};
export type ErrBody = {
  error: {
    code: string;
    message: string;
    details?: { field?: string };
    meta?: { retryAfterSeconds?: number };
  };
};

export const withCookie =
  (cookieValue: string) =>
  (url: string, method = "GET", body?: object) =>
    new Request(`http://localhost${url}`, {
      method,
      headers: {
        cookie: `sharq_session=${cookieValue}`,
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
