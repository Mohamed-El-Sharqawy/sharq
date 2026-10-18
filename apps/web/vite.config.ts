// apps/web — Vite + React Router v7 framework mode (SPEC §8.1). Vitest keeps
// its own config (vitest.config.ts) so the RR plugin never runs in unit tests.
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [reactRouter()],
});
