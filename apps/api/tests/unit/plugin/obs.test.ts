// Row 12 — §10.7 pino request logging: one info line per request carrying
// request id, user id (when a session resolved), method, path, status,
// duration — and nothing else (no PII beyond ids). The sink is injected so
// units assert the structured shape without a real transport.
import { describe, expect, it } from "bun:test";
import { createApp } from "../../../src/app";
import { hashPassword } from "../../../src/modules/auth/password";
import {
  makeAudit,
  makeRepo,
  makeUser,
  type UserWithHash,
} from "../auth/helpers";

type LogLine = Record<string, unknown> & { msg?: string };
const PASSWORD = "Pw#Log-2026";

const build = async () => {
  const lines: LogLine[] = [];
  const logger = {
    info: (obj: Record<string, unknown>, msg: string) =>
      lines.push({ ...obj, msg }),
  };
  const admin: UserWithHash = makeUser({
    username: "sayed",
    role: "admin",
    passwordHash: await hashPassword(PASSWORD),
  });
  const app = createApp({
    repo: makeRepo([admin]).repo,
    audit: makeAudit(),
    isTeamSupervisor: async () => false,
    dbCheck: async () => true,
    logger,
  });
  return { app, lines: () => lines };
};

const call = (app: ReturnType<typeof createApp>, path: string) =>
  app.handle(new Request(`http://localhost${path}`));

/** onAfterResponse runs asynchronously once the response has been handed
 * back (elysia 1.4), so the suite drains the body and polls briefly. */
const drain = async (res: Response) => {
  await res.text();
};

const waitFor = async (fn: () => boolean) => {
  for (let i = 0; i < 100 && !fn(); i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
};

const loginPost = (app: ReturnType<typeof createApp>, body: unknown) =>
  app.handle(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

describe("request logging · §10.7 line shape", () => {
  it("logs exactly one line per request with the six contract fields", async () => {
    const { app, lines } = await build();
    const res = await call(app, "/api/health");
    expect(res.status).toBe(200);
    await drain(res);
    await waitFor(() => lines().some((l) => l.msg === "request"));
    const line = lines().find((l) => l.msg === "request");
    expect(line).toBeDefined();
    expect(String(line!.requestId)).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
    expect(line!.method).toBe("GET");
    expect(line!.path).toBe("/api/health");
    expect(line!.status).toBe(200);
    expect(typeof line!.durationMs).toBe("number");
    expect(line!.durationMs as number).toBeGreaterThanOrEqual(0);
  });

  it("logs userId null when no session resolved (anonymous 401)", async () => {
    const { app, lines } = await build();
    const anon = await call(app, "/api/auth/me");
    expect(anon.status).toBe(401);
    await drain(anon);
    await waitFor(() => lines().some((l) => l.msg === "request"));
    const me401 = lines().find((l) => l.path === "/api/auth/me")!;
    expect(me401.userId).toBeNull();
  });

  it("logs the user id on a successful login line", async () => {
    const { app, lines } = await build();
    const login = await loginPost(app, {
      identifier: "sayed",
      password: PASSWORD,
    });
    expect(login.status).toBe(200);
    await drain(login);
    await waitFor(() => lines().some((l) => l.path === "/api/auth/login"));
    const login200 = lines().find((l) => l.path === "/api/auth/login")!;
    expect(login200.status).toBe(200);
    expect(typeof login200.userId).toBe("string");
  });
});

describe("request logging · §10.7 PII rule", () => {
  it("carries no PII beyond ids — no headers, no query, no body fields", async () => {
    const { app, lines } = await build();
    const res = await app.handle(
      new Request("http://localhost/api/auth/login?who=sayed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: "sayed", password: PASSWORD }),
      }),
    );
    await drain(res);
    await waitFor(() => lines().some((l) => l.msg === "request"));
    const line = lines().find((l) => l.msg === "request")!;
    expect(line.path).toBe("/api/auth/login"); // query stripped
    expect(Object.keys(line).sort()).toEqual(
      [
        "msg",
        "requestId",
        "userId",
        "method",
        "path",
        "status",
        "durationMs",
      ].sort(),
    );
  });
});
