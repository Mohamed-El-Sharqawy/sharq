// SPEC §8.1: fs-routes folder routing — every route is a folder with a
// route.tsx inside (Next.js-style); SPEC §11 defines the route inventory.
import type { RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

export default flatRoutes() satisfies Promise<RouteConfig>;
