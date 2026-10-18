import type { Config } from "@react-router/dev/config";

// SPEC §8.1: web is a React Router v7 SPA (framework mode, ssr:false).
// Styles/fonts land with roadmap row 9; view transitions with row 11.
export default {
  ssr: false,
} satisfies Config;
