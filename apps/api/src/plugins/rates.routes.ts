// SPEC §10.6 — the pay-rates plugin (FR-SET-03): the effective-dated rate
// timeline. Overlap → 409 DUPLICATE (inclusive pre-check service-side, the
// §7 exclusion as backstop), backdating into locked/paid → 409 per the
// guard, EC-56's successor rule blocks a bare company-rate close.
import { Elysia } from "elysia";
import { CreateRateBody, UpdateRateBody } from "@sharq/schemas";
import { createGuards, type GuardDeps } from "../lib/guard";
import type { ConfigService } from "../modules/config/service";
import { rateError } from "./config.errors";

export type RatesRoutesDeps = {
  service: ConfigService;
  resolveSession: GuardDeps["resolveSession"];
};

type Caller = { id: string };

const createCreateHandler =
  (deps: RatesRoutesDeps) =>
  async ({ body, user }: { body: CreateRateBody; user: Caller }) => {
    const result = await deps.service.createRate({
      actorId: user.id,
      scopeType: body.scopeType,
      scopeKey: body.scopeKey,
      amountMinor: body.amountMinor,
      validFrom: body.validFrom,
      note: body.note,
    });
    return result.ok ? { rate: result.rate } : rateError(result);
  };

const createUpdateHandler =
  (deps: RatesRoutesDeps) =>
  async ({
    params,
    body,
    user,
  }: {
    params: { id: string };
    body: UpdateRateBody;
    user: Caller;
  }) => {
    const result = await deps.service.updateRate(
      {
        actorId: user.id,
        rateId: params.id,
        validTo: body.validTo,
        amountMinor: body.amountMinor,
        version: body.version,
      },
      new Date(),
    );
    return result.ok ? { rate: result.rate } : rateError(result);
  };

export function createRatesRoutes(deps: RatesRoutesDeps) {
  const guards = createGuards({ resolveSession: deps.resolveSession });
  return new Elysia({
    name: "rates-routes",
    prefix: "/api/rates",
    tags: ["rates"],
  })
    .use(guards)
    .get("", () => deps.service.listRates().then((rates) => ({ rates })), {
      auth: true,
      role: "admin",
    })
    .post("", createCreateHandler(deps), {
      auth: true,
      role: "admin",
      body: CreateRateBody,
    })
    .patch("/:id", createUpdateHandler(deps), {
      auth: true,
      role: "admin",
      body: UpdateRateBody,
    });
}
