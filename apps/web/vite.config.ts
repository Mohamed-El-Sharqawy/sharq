import tailwindcss from "@tailwindcss/vite";
// apps/web — Vite + React Router v7 framework mode (SPEC §8.1). Vitest keeps
// its own config (vitest.config.ts) so the RR plugin never runs in unit tests.
import { reactRouter } from "@react-router/dev/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // Dev + full-stack e2e: /api hits the Elysia service on :3000 — mirrors
  // prod Traefik /api routing on one domain (SPEC §8.4).
  server: {
    proxy: { "/api": "http://localhost:3000" },
  },
});
