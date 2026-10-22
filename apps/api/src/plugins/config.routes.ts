// Composition of the four §10.6 config plugins (settings, rates,
// catalogs, holidays) into one mount — keeps app.ts's createApp inside the
// §9.3 function budget while every plugin keeps its own guards instance
// (the Phase-2 same-name-instances pattern, proven safe).
import { Elysia } from "elysia";
import type { ConfigService } from "../modules/config/service";
import type { GuardDeps } from "../lib/guard";
import { createCatalogRoutes } from "./catalog.routes";
import { createHolidaysRoutes } from "./holidays.routes";
import { createRatesRoutes } from "./rates.routes";
import { createSettingsRoutes } from "./settings.routes";

export type ConfigRoutesDeps = {
  service: ConfigService;
  resolveSession: GuardDeps["resolveSession"];
};

export function createConfigRoutes(deps: ConfigRoutesDeps) {
  return new Elysia({ name: "config-routes" })
    .use(createSettingsRoutes(deps))
    .use(createRatesRoutes(deps))
    .use(createCatalogRoutes(deps))
    .use(createHolidaysRoutes(deps));
}
