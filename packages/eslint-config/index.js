// @sharq/eslint-config — shared ESLint flat config.
// Thresholds per SPEC §9.2/§9.3, import bans per §9.1, dependency zones per §8.2.
import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export const PACKAGE_NAMES = ["schemas", "payroll", "locales", "ui"];

const thresholds = {
  // §9.2: no source file over 150 non-blank, non-comment lines (dual-enforced with tooling/check-line-count.mjs).
  "max-lines": [
    "error",
    { max: 150, skipBlankLines: true, skipComments: true },
  ],
  // §9.3 thresholds — exact values are binding; changes go through SPEC first.
  "max-lines-per-function": [
    "error",
    { max: 60, skipBlankLines: true, skipComments: true },
  ],
  complexity: ["error", 10],
  "max-params": ["error", 4],
  "max-depth": ["error", 3],
};

export const base = tseslint.config(
  { ignores: ["**/dist/**", "**/coverage/**", "**/.turbo/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: { import: importPlugin, "react-hooks": reactHooks },
    settings: { "import/resolver": { typescript: true } },
    rules: {
      ...thresholds,
      "import/order": "warn",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      // §9.1 DRY guards — defaults for packages; apps/api relaxes these in its own config.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "drizzle-orm",
              message: "Drizzle is apps/api-only (SPEC §9.1).",
            },
            { name: "bun", message: "Bun APIs are apps/api-only (SPEC §9.1)." },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        {
          name: "fetch",
          message:
            "fetch is only allowed in feature api.ts files and apps/api (SPEC §9.1, §9.6).",
        },
      ],
    },
  },
);

// §8.2 downward-only edges: bans importing apps and every sibling package not in `allowed`.
// Zone semantics: `target` = importing files the rule applies to, `from` = banned import location.
// Plain directory paths only — glob targets/froms break on Windows path separators (minimatch).
// Paths resolve relative to the consuming package dir — always run lint via `turbo run lint` (per-package cwd).
export function packageZones({ self, allowed = [] }) {
  const banned = PACKAGE_NAMES.filter(
    (p) => p !== self && !allowed.includes(p),
  );
  const zones = [
    {
      target: "./src",
      from: "../../apps",
      message: "Packages never import apps (SPEC §8.2).",
    },
    ...banned.map((p) => ({
      target: "./src",
      from: `../${p}`,
      message: `@sharq/${self} may not import @sharq/${p} — downward-only edges (SPEC §8.2).`,
    })),
  ];
  return {
    files: ["src/**/*.{ts,tsx}"],
    rules: { "import/no-restricted-paths": ["error", { zones }] },
  };
}
