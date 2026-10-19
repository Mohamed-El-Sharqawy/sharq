// drizzle-kit config (root scripts db:generate / db:migrate / db:studio).
// The URL fallback matches the dev compose defaults (root compose.yaml) —
// generate never connects; migrate/studio do.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema",
  out: "./drizzle",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://sharq:sharq@localhost:5432/sharq",
  },
});
