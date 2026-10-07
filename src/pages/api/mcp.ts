import type { NextApiRequest, NextApiResponse } from "next";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createCollectionServer } from "@/lib/kb/mcp";
import { apiLimiter, clientIp } from "@/lib/links/ratelimit";

/**
 * The collection over HTTP, so anyone can point their own MCP client at it —
 * Cursor, Claude Desktop, Claude's web connectors.
 *
 * **Why a Pages route and not `src/app/api`.** The MCP SDK's transport takes
 * Node's `IncomingMessage` + `ServerResponse`. App Router handlers only get a web
 * `Request` and return a `Response`, so serving MCP there would mean hand-rolling
 * an adapter for streams, headers and session ids — the kind of code that fails
 * mysteriously. Pages routes still hand out Node objects, so the SDK works as
 * documented. One file is a smaller price than one fragile adapter.
 *
 * **Stateless on purpose.** There is one read-only tool and nothing to remember
 * between calls, so every request builds its own server and transport and throws
 * them away. No session ids, no server-side state, nothing to leak between
 * callers.
 *
 * Rate limited per minute, not per day: one search costs one embedding call,
 * which is a different order of money from the chat panel's model call. See
 * `src/lib/links/ratelimit.ts` for both.
 */

// The transport reads the request body itself; Next's parser would consume it.
export const config = { api: { bodyParser: false } };

/** `clientIp` speaks web `Headers`; a Pages route hands us a plain object. */
function headersOf(req: NextApiRequest): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      headers.set(key, Array.isArray(value) ? value.join(", ") : value);
    }
  }
  return headers;
}

const rpcError = (code: number, message: string) => ({
  jsonrpc: "2.0" as const,
  error: { code, message },
  id: null,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const rate = await apiLimiter.limit(clientIp(headersOf(req)));
  if (!rate.success) {
    res.setHeader("Retry-After", String(Math.max(1, rate.reset - Date.now())));
    res.status(429).json(rpcError(-32000, "Rate limit exceeded"));
    return;
  }

  const server = createCollectionServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  // Abandoning a request mid-flight should take the server with it, or a slow
  // client leaves an object graph behind on every retry.
  res.on("close", () => {
    void transport.close();
    void server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (error) {
    console.error("mcp request failed", error);
    if (!res.headersSent) {
      res.status(500).json(rpcError(-32603, "Internal error"));
    }
  }
}
