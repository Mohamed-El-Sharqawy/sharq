// Row 9 — POST /api/auth/password (FR-AUTH-07): 204 on success with the
// repo update recorded (must_change_password cleared), 422 VALIDATION_FAILED
// naming the field when the current password is wrong.
import { beforeAll, describe, expect, it } from "bun:test";
import {
  PASSWORD,
  buildApp,
  buildAppWithRepo,
  cookieFrom,
  login,
  makeAdmin,
  withCookie,
} from "./helpers";

let admin: Awaited<ReturnType<typeof makeAdmin>>;

beforeAll(async () => {
  admin = await makeAdmin();
});

describe("POST /api/auth/password (FR-AUTH-07)", () => {
  it("given the correct current password, when changed, then 204 and the repo update is recorded", async () => {
    const { app, repo } = buildAppWithRepo(admin);
    const cookie = withCookie(
      cookieFrom(await login(app, { identifier: "sayed", password: PASSWORD })),
    );
    const out = await app.handle(
      cookie("/api/auth/password", "POST", {
        current: PASSWORD,
        next: "N3w-Pass#1",
      }),
    );
    expect(out.status).toBe(204);
    expect(repo.calls.updated).toHaveLength(1);
    const row = await repo.repo.findUserById(admin.id);
    expect(row?.mustChangePassword).toBe(false);
  });

  it("given a wrong current password, when changed, then 422 VALIDATION_FAILED naming the field", async () => {
    const app = buildApp(admin);
    const cookie = withCookie(
      cookieFrom(await login(app, { identifier: "sayed", password: PASSWORD })),
    );
    const out = await app.handle(
      cookie("/api/auth/password", "POST", {
        current: "wrong",
        next: "N3w-Pass#1",
      }),
    );
    expect(out.status).toBe(422);
    const body = (await out.json()) as {
      error: { code: string; details: { field: string } };
    };
    expect(body.error.code).toBe("VALIDATION_FAILED");
    expect(body.error.details.field).toBe("current");
  });
});
