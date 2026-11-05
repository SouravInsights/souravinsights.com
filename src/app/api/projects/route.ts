import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Replace the projects list. Admin only.
 *
 * Order, section and the write-up save as one document, because splitting them
 * would let a half-saved list exist — the order without the copy that section
 * needs. Mirrors `/api/gallery/clip`: `requireAdmin`, a zod body, a tag bump.
 *
 * Raw Upstash REST rather than the `@upstash/redis` client, to match the read in
 * `projects/queries.ts`: one path, one storage format, nothing to reverse.
 */
const PROJECTS_REDIS_KEY = "projects:data";

const projectSchema = z.object({
  slug: z.string().min(1).max(80),
  name: z.string().max(120),
  logo: z.string().max(400),
  url: z.string().max(400),
  repo: z.string().max(400).optional(),
  tagline: z.string().max(400),
  note: z.string().max(400),
  what: z.string().max(4000),
  why: z.string().max(4000),
  epitaph: z.string().max(160).optional(),
  section: z.enum(["featured", "other", "graveyard"]),
  position: z.number().int().min(0),
});

const bodySchema = z.object({
  projects: z.array(projectSchema).max(100),
});

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_body",
          message: "Body must be { projects: Project[] }",
        },
      },
      { status: 400 }
    );
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return NextResponse.json(
      {
        error: {
          code: "not_configured",
          message: "Redis is not configured",
        },
      },
      { status: 500 }
    );
  }

  const response = await fetch(`${url}/set/${PROJECTS_REDIS_KEY}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(parsed.data.projects),
    cache: "no-store",
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: { code: "save_failed", message: "Failed to save projects" } },
      { status: 502 }
    );
  }

  // The public pages are cached from `getProjectsData`; this is what makes a
  // reorder visible without waiting for the revalidate window.
  revalidateTag("projects");

  return NextResponse.json({ data: { count: parsed.data.projects.length } });
}
