import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";
import { CATEGORIES } from "@/lib/kb/categories";

extendZodWithOpenApi(z);

const categoryEnum = z.enum(CATEGORIES as unknown as [string, ...string[]]);

export const linksQuerySchema = z.object({
  category: categoryEnum.optional().openapi({
    description: "Filter by category",
    example: "tool",
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
    category: categoryEnum.nullable().openapi({
      description: "What kind of link this is; null until it has been read",
    }),
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

export const categoriesResponseSchema = z.object({
  data: z.array(
    z.object({
      category: z.string(),
      count: z.number().int(),
    })
  ),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2).max(300).openapi({
    description:
      "What to look for, in plain words. Matched against the meaning of the " +
      "pages' contents, not their titles.",
    example: "a tool to check colour contrast",
  }),
  category: z
    .enum(CATEGORIES as unknown as [string, ...string[]])
    .optional()
    .openapi({
      description:
        "Restrict the search to one kind of saved link — useful when the " +
        "question is about a kind (people to follow, tools for a job)",
      example: "tool",
    }),
  limit: z.coerce.number().int().min(1).max(20).default(8).openapi({
    description: "Results to return (max 20)",
    example: 8,
  }),
});

export const searchResultSchema = linkItemSchema
  .extend({
    score: z.number().openapi({
      description: "Cosine similarity between the query and the page. Higher is closer.",
      example: 0.53,
    }),
    passage: z.string().openapi({
      description: "The passage from the page that matched the query",
    }),
  })
  .openapi("SearchResult");

export const searchResponseSchema = z.object({
  data: z.array(searchResultSchema),
  meta: z.object({
    query: z.string(),
    count: z.number().int(),
  }),
});

/**
 * One link (`url`) or a batch (`urls`). The batch form exists so cleaning up a
 * whole filtered view costs one request — and one rate-limit hit — instead of
 * one per link. Left as a plain object (not `.refine`) so `.partial()` and the
 * OpenAPI response schemas built from it keep working.
 */
export const hideRequestSchema = z.object({
  url: z.string().url().optional().openapi({
    description: "Any URL variant of the link; normalized server-side",
  }),
  urls: z
    .array(z.string().url())
    .min(1)
    .max(200)
    .optional()
    .openapi({
      description:
        "Batch form: up to 200 URL variants; each normalized server-side",
    }),
});

export const addLinkRequestSchema = z.object({
  url: z.string().url().openapi({
    description: "The page to add.",
    example: "https://brandur.org/minimalism",
  }),
  category: categoryEnum.openapi({
    description:
      "The category to file it under. The classifier is skipped for this link.",
    example: "article",
  }),
});

export const addLinkResponseSchema = z
  .object({
    data: z.object({
      id: z.string().openapi({
        description: "Stable, source-agnostic id (the normalized URL key)",
        example: "brandur.org/minimalism",
      }),
      url: z.string().url(),
      title: z.string().openapi({
        description: "The page's title, read from its HTML",
      }),
      category: categoryEnum,
    }),
  })
  .openapi("AddedLink");

export const errorSchema = z
  .object({
    error: z.object({
      code: z.string().openapi({ example: "not_found" }),
      message: z.string(),
    }),
  })
  .openapi("Error");
