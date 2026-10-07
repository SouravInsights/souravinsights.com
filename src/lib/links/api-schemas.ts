import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { CHANNEL_ORDER } from "@/app/curated-links/utils/channels";

extendZodWithOpenApi(z);

const channelEnum = z.enum(CHANNEL_ORDER as [string, ...string[]]);

export const linksQuerySchema = z.object({
  channel: channelEnum.optional().openapi({
    description: "Filter by channel",
    example: "tools",
  }),
  limit: z.coerce.number().int().min(1).max(100).default(50).openapi({
    description: "Items per page (max 100)",
    example: 50,
  }),
  cursor: z.string().optional().openapi({
    description: "Opaque cursor from a previous response's meta.next_cursor",
  }),
  url: z.string().url().optional().openapi({
    description:
      "Exact lookup by any URL variant — returns the single matching item when present",
    example: "https://brandur.org/minimalism",
  }),
});

export const linkItemSchema = z
  .object({
    id: z.string().openapi({
      description: "Stable, source-agnostic id (the normalized URL key)",
      example: "brandur.org/minimalism",
    }),
    like_key: z.string().nullable().openapi({
      description:
        "Discord snowflake used as the like key on the site; null for non-Discord sources",
    }),
    url: z.string().url(),
    title: z.string(),
    description: z.string(),
    channel: channelEnum,
    added_at: z.string().openapi({ description: "ISO 8601 timestamp" }),
  })
  .openapi("LinkItem");

export const linksResponseSchema = z.object({
  data: z.array(linkItemSchema),
  meta: z.object({
    next_cursor: z
      .string()
      .nullable()
      .openapi({ description: "Pass as ?cursor= for the next page" }),
  }),
});

export const channelsResponseSchema = z.object({
  data: z.array(
    z.object({
      channel: z.string(),
      count: z.number().int(),
    })
  ),
});

export const hideRequestSchema = z.object({
  url: z.string().url().openapi({
    description: "Any URL variant of the link; normalized server-side",
  }),
});

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "not_found" }),
      message: z.string(),
    }),
  })
  .openapi("Error");
