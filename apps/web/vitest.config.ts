// apps/web — Vitest + jsdom + Testing Library per TESTING §2.1.
// globals stay off: specs import describe/it/expect explicitly.
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  test: {
    environment: "jsdom",
    setupFiles: ["./app/test/setup.ts"],
    include: ["app/**/*.test.{ts,tsx}"],
  },
});
