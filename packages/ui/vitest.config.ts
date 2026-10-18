// @sharq/ui — Vitest + jsdom + Testing Library per TESTING §2.1 (component
// runner decision, PROGRESS 2026-10-18: same stack and catalog versions as
// apps/web). globals stay off: specs import describe/it/expect explicitly.
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
