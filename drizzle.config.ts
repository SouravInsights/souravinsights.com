import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

/**
 * Read the same files Next reads, in the same order. `import "dotenv/config"`
 * loads only `.env`, so a `DATABASE_URL` kept in `.env.local` — where secrets
 * usually live — was invisible here, and `drizzle-kit migrate` failed with
 * "url: undefined" despite the app working fine.
 *
 * dotenv does not overwrite a variable that is already set, so `.env.local`
 * wins, matching Next.
 */
config({ path: ".env.local" });
config({ path: ".env" });

export default defineConfig({
  out: "./drizzle",
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
