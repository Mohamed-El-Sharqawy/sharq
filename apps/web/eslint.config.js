// apps/web — keeps the §9.1 bans (drizzle/bun/fetch stay web-forbidden);
// only apps/api relaxes them, in its own config.
import { base } from "@sharq/eslint-config";

export default [...base];
