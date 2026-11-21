import { ApiReference } from "@scalar/nextjs-api-reference";

// Docs are generated from the live OpenAPI document, which itself is generated
// from the zod schemas that validate requests. One source of truth.
const handler = ApiReference(
  { url: "/api/v1/openapi.json" },
  { headers: { "Cache-Control": "public, s-maxage=3600" } }
);

export const GET = handler;
