import { config } from "dotenv";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Load the env files relative to the repo root, wherever the process was started.
 *
 * **Import this before anything that touches the database.** `src/db` calls
 * `neon()` the moment the module is evaluated, and ES imports all run before any
 * top-level statement in the importing file — so a `config()` call placed after
 * an `import { search }` is already too late, and the failure is a confusing
 * "No database connection string was provided".
 *
 * Anchoring to this file rather than to `process.cwd()` matters because the
 * callers we don't control pick the cwd: an MCP client spawns a server from
 * wherever it likes.
 */
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

config({ path: join(ROOT, ".env.local") });
config({ path: join(ROOT, ".env") });
