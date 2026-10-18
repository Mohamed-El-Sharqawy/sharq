// apps/api — the one workspace where Bun/Drizzle imports and server-side fetch
// are sanctioned (SPEC §9.1); everything else keeps the shared base rules.
import { base } from "@sharq/eslint-config";

export default [
  ...base,
  {
    files: ["**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
      "no-restricted-globals": "off",
    },
  },
];
