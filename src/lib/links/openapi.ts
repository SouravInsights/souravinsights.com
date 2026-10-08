import { z } from "zod";
import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
} from "@asteasolutions/zod-to-openapi";
import {
  channelsResponseSchema,
  errorSchema,
  hideRequestSchema,
  linkItemSchema,
  linksQuerySchema,
  linksResponseSchema,
  searchQuerySchema,
  searchResponseSchema,
  searchResultSchema,
} from "./api-schemas";

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://www.souravinsights.com";

/**
 * The OpenAPI document is generated from the same zod schemas that validate
 * requests at runtime — docs cannot drift from behavior.
 */
const registry = new OpenAPIRegistry();

registry.register("LinkItem", linkItemSchema);
registry.register("SearchResult", searchResultSchema);
registry.register("Error", errorSchema);
registry.registerComponent("securitySchemes", "bearerAuth", {
  type: "http",
  scheme: "bearer",
  description: "Admin key (ADMIN_SECRET)",
});

const jsonOf = <T extends z.ZodTypeAny>(schema: T, description: string) => ({
  description,
  content: { "application/json": { schema } },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/links",
  tags: ["links"],
  summary: "List links",
  description:
    "Paginated collection of curated links. Hidden and dead links are excluded. " +
    "With ?url=, performs an exact lookup instead of listing.",
  request: { query: linksQuerySchema },
  responses: {
    200: jsonOf(linksResponseSchema, "A page of links"),
    400: jsonOf(errorSchema, "Invalid query parameters"),
    404: jsonOf(errorSchema, "No link matches the given ?url="),
    429: jsonOf(errorSchema, "Rate limit exceeded"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/channels",
  tags: ["links"],
  summary: "List channels with visible link counts",
  responses: {
    200: jsonOf(channelsResponseSchema, "Channels and counts"),
    429: jsonOf(errorSchema, "Rate limit exceeded"),
  },
});

registry.registerPath({
  method: "get",
  path: "/api/v1/search",
  tags: ["search"],
  summary: "Search the saved pages' contents by meaning",
  description:
    "Retrieval over the full text of every saved link, not their titles — so " +
    "you can find a page you'd forgotten the name of. No model runs, so the " +
    "same query always returns the same ranked list.",
  request: { query: searchQuerySchema },
  responses: {
    200: jsonOf(searchResponseSchema, "Ranked matches, closest first"),
    400: jsonOf(errorSchema, "Invalid query parameters"),
    429: jsonOf(errorSchema, "Rate limit exceeded"),
    502: jsonOf(errorSchema, "Embedding provider or database unavailable"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/links/hide",
  tags: ["admin"],
  summary: "Hide a link from every surface",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: hideRequestSchema } } },
  },
  responses: {
    200: jsonOf(hideRequestSchema.partial(), "Hidden"),
    401: jsonOf(errorSchema, "Missing or invalid admin key"),
    404: jsonOf(errorSchema, "Unknown URL"),
    429: jsonOf(errorSchema, "Rate limit exceeded"),
  },
});

registry.registerPath({
  method: "post",
  path: "/api/v1/links/unhide",
  tags: ["admin"],
  summary: "Restore a hidden link",
  security: [{ bearerAuth: [] }],
  request: {
    body: { content: { "application/json": { schema: hideRequestSchema } } },
  },
  responses: {
    200: jsonOf(hideRequestSchema.partial(), "Restored"),
    401: jsonOf(errorSchema, "Missing or invalid admin key"),
    404: jsonOf(errorSchema, "Unknown URL"),
    429: jsonOf(errorSchema, "Rate limit exceeded"),
  },
});

export function getOpenApiDocument() {
  return new OpenApiGeneratorV3(registry.definitions).generateDocument({
    openapi: "3.0.0",
    info: {
      title: "Insights Links API",
      version: "0.1.0",
      description:
        "Read-only access to the curated links collection at souravinsights.com/insights. " +
        "Admin endpoints require an Authorization: Bearer key.",
    },
    servers: [{ url: BASE_URL }],
  });
}
