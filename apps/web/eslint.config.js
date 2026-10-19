// apps/web — keeps the §9.1 bans (drizzle/bun/fetch stay web-forbidden);
// only apps/api relaxes them, in its own config.
// Generated/build artifacts are never linted (.react-router types are output
// of `react-router typegen`, same class as dist/).
import { base } from "@sharq/eslint-config";

export default [
  {
    ignores: [
      ".react-router/",
      "build/",
      "playwright-report/",
      "test-results/",
    ],
  },
  ...base,
  // SPEC §9.1/§9.6: feature api.ts files are the ONE sanctioned web fetch
  // context — everything else keeps the ban.
  {
    files: ["app/features/**/api.ts"],
    rules: { "no-restricted-globals": "off" },
  },
];
