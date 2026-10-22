// SPEC §10.6 — the catalogs plugin: reason_catalog (FR-SET-04) +
// attendance_statuses (FR-SET-05). Deactivation rides PATCH — there is no
// delete route (EC-46); system status rows are protected service-side.
import { Elysia } from "elysia";
import {
  CreateReasonBody,
  CreateStatusBody,
  UpdateReasonBody,
  UpdateStatusBody,
} from "@sharq/schemas";
import { apiErrorStatus } from "../lib/errors";
import { createGuards, type GuardDeps } from "../lib/guard";
import type { ConfigService } from "../modules/config/service";
import { catalogError, createReasonError } from "./config.errors";

export type CatalogRoutesDeps = {
  service: ConfigService;
  resolveSession: GuardDeps["resolveSession"];
};

type Caller = { id: string };

const createCreateReasonHandler =
  (deps: CatalogRoutesDeps) =>
  async ({ body, user }: { body: CreateReasonBody; user: Caller }) => {
    const result = await deps.service.createReason({
      actorId: user.id,
      kind: body.kind,
      nameAr: body.nameAr,
      defaultAmountMinor: body.defaultAmountMinor,
    });
    return result.ok ? { reason: result.reason } : createReasonError(result);
  };

const createUpdateReasonHandler =
  (deps: CatalogRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UpdateReasonBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateReason({
      actorId: user.id,
      reasonId: params.id,
      patch: {
        nameAr: body.nameAr,
        defaultAmountMinor: body.defaultAmountMinor,
        isActive: body.isActive,
      },
      version: body.version,
    });
    return result.ok ? { reason: result.reason } : catalogError(result);
  };

const createCreateStatusHandler =
  (deps: CatalogRoutesDeps) =>
  async ({ body, user }: { body: CreateStatusBody; user: Caller }) => {
    const result = await deps.service.createStatus({
      actorId: user.id,
      code: body.code,
      nameAr: body.nameAr,
      carriesPay: body.carriesPay,
    });
    // Duplicate code is the only failure — §10.4's bare 409 (Phase-2 style).
    return result.ok ? { status: result.status } : apiErrorStatus("DUPLICATE");
  };

const createUpdateStatusHandler =
  (deps: CatalogRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UpdateStatusBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateStatus({
      actorId: user.id,
      statusId: params.id,
      patch: {
        nameAr: body.nameAr,
        carriesPay: body.carriesPay,
        isActive: body.isActive,
      },
      version: body.version,
    });
    return result.ok ? { status: result.status } : catalogError(result);
  };

export function createCatalogRoutes(deps: CatalogRoutesDeps) {
  const guards = createGuards({ resolveSession: deps.resolveSession });
  const reasons = new Elysia({
    name: "reason-routes",
    prefix: "/api/reason-catalog",
    tags: ["settings"],
  })
    .use(guards)
    .get(
      "",
      () => deps.service.listReasons().then((reasons) => ({ reasons })),
      {
        auth: true,
        role: "admin",
      },
    )
    .post("", createCreateReasonHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateReasonBody,
    })
    .patch("/:id", createUpdateReasonHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateReasonBody,
    });
  const statuses = new Elysia({
    name: "status-routes",
    prefix: "/api/attendance-statuses",
    tags: ["settings"],
  })
    .use(guards)
    .get(
      "",
      () => deps.service.listStatuses().then((statuses) => ({ statuses })),
      { auth: true, role: "admin" },
    )
    .post("", createCreateStatusHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateStatusBody,
    })
    .patch("/:id", createUpdateStatusHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateStatusBody,
    });
  return new Elysia({ name: "catalog-routes" }).use(reasons).use(statuses);
}
