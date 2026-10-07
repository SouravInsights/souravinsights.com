import "./load-env";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createCollectionServer } from "../src/lib/kb/mcp";

/**
 * The collection on stdio, for Cursor and Claude Desktop on this machine.
 *
 * The tool itself lives in `src/lib/kb/mcp.ts`, mounted here and at `/api/mcp`;
 * this file is only the transport.
 *
 *   npx tsx scripts/kb-mcp.ts
 *
 * Two traps, both recorded here because both cost real time:
 * - stdio *is* the protocol channel. One stray print corrupts the handshake and
 *   the client reports only "server disconnected", so console.log goes to stderr.
 * - The env has to load before the database module is evaluated, hence
 *   `./load-env` first — see that file for why an import order matters at all.
 */
console.log = (...args: unknown[]) => console.error(...args);

async function main() {
  const server = createCollectionServer();
  const transport = new StdioServerTransport();

  // When the client closes the pipe we are done. Without this the process
  // lingers, because the Postgres pool still holds a socket open.
  transport.onclose = () => process.exit(0);

  await server.connect(transport);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
