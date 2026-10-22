// SPEC §10.6 — the holidays plugin (FR-SET-06): add/remove only (§7 has no
// version column). History references holidays by value, so DELETE is the
// one physical delete in the config domain (catalogs never delete, EC-46).
import { Elysia } from "elysia";
import { CreateHolidayBody } from "@sharq/schemas";
import { apiErrorStatus } from "../lib/errors";
import { createGuards, type GuardDeps } from "../lib/guard";
import type { ConfigService } from "../modules/config/service";

export type HolidaysRoutesDeps = {
  service: ConfigService;
  resolveSession: GuardDeps["resolveSession"];
};

const createCreateHandler =
  (deps: HolidaysRoutesDeps) =>
  async ({ body, user }: { body: CreateHolidayBody; user: { id: string } }) => {
    const result = await deps.service.createHoliday({
      actorId: user.id,
      date: body.date,
      nameAr: body.nameAr,
    });
    // Duplicate date is the only failure — §10.4's bare 409.
    return result.ok
      ? { holiday: result.holiday }
      : apiErrorStatus("DUPLICATE");
  };

const createDeleteHandler =
  (deps: HolidaysRoutesDeps) =>
  async ({
    params,
    user,
  }: {
    params: { id: string };
    user: { id: string };
  }) => {
    const result = await deps.service.deleteHoliday(user.id, params.id);
    return result.ok
      ? { holiday: result.holiday }
      : apiErrorStatus("NOT_FOUND");
  };

export function createHolidaysRoutes(deps: HolidaysRoutesDeps) {
  const guards = createGuards({ resolveSession: deps.resolveSession });
  return new Elysia({
    name: "holidays-routes",
    prefix: "/api/holidays",
    tags: ["settings"],
  })
    .use(guards)
    .get(
      "",
      () => deps.service.listHolidays().then((holidays) => ({ holidays })),
      { auth: true, role: "admin" },
    )
    .post("", createCreateHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateHolidayBody,
    })
    .delete("/:id", createDeleteHandler(deps), {
      auth: true,
      role: "admin",
    });
}
