// SPEC §10.6 — the settings plugin (FR-SET-01/02, §5.5.6): GET /api/settings
// is "admin (edit) / all (read resolved)" — every authenticated role reads
// the resolved map (§3); PATCH and the impact preview are admin-only.
// Business rules live in modules/config; this file never touches drizzle.
import { Elysia } from "elysia";
import { PatchSettingBody, SettingImpactBody } from "@sharq/schemas";
import { createGuards, type GuardDeps } from "../lib/guard";
import type { ConfigService } from "../modules/config/service";
import { impactError, settingError } from "./config.errors";

export type SettingsRoutesDeps = {
  service: ConfigService;
  resolveSession: GuardDeps["resolveSession"];
};

type Caller = { id: string };
type KeyParams = { key: string };

/** §10.6 SET-01 response shape: {key, value, validFrom, version} — the
 * row's write-target metadata (id/updatedBy) stays internal. */
const toSettingWire = (s: {
  key: string;
  value: unknown;
  validFrom: string;
  version: number;
}) => ({
  key: s.key,
  value: s.value,
  validFrom: s.validFrom,
  version: s.version,
});

const createPatchHandler =
  (deps: SettingsRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: KeyParams;
    body: PatchSettingBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateSetting(
      {
        actorId: user.id,
        key: params.key,
        value: body.value,
        validFrom: body.validFrom,
        note: body.note,
        version: body.version,
      },
      new Date(),
    );
    return result.ok
      ? { setting: toSettingWire(result.setting) }
      : settingError(result);
  };

const createImpactHandler =
  (deps: SettingsRoutesDeps) =>
  async ({ body }: { body: SettingImpactBody }) => {
    const result = await deps.service.previewSetting(
      { key: body.key, value: body.value, validFrom: body.validFrom },
      new Date(),
    );
    return result.ok ? result.impact : impactError(result);
  };

export function createSettingsRoutes(deps: SettingsRoutesDeps) {
  const guards = createGuards({ resolveSession: deps.resolveSession });
  return (
    new Elysia({
      name: "settings-routes",
      prefix: "/api/settings",
      tags: ["settings"],
    })
      .use(guards)
      // Root routes register with path "" — prefix+"/" documents a trailing-
      // slash path in OpenAPI (the Phase-2 parity lesson).
      .get("", () => deps.service.resolvedSettings(), { auth: true })
      .patch("/:key", createPatchHandler(deps), {
        auth: true,
        role: "admin",
        body: PatchSettingBody,
      })
      .post("/impact", createImpactHandler(deps), {
        auth: true,
        role: "admin",
        body: SettingImpactBody,
      })
  );
}
