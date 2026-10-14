import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { highlights, links } from "@/db/schema";

/**
 * Owner highlights on reader articles (docs/spec/insights-rebuild.md).
 * Only the owner writes; everyone reads them server-side on the reader page.
 */
const bodySchema = z.object({
  urlKey: z.string().min(1),
  quote: z.string().min(3).max(2000),
  prefix: z.string().max(200).default(""),
  suffix: z.string().max(200).default(""),
  occurrence: z.number().int().min(0).default(0),
  hue: z.number().int().min(0).max(7).default(3),
});

const auth = (request: NextRequest) =>
  request.headers.get("authorization") === `Bearer ${process.env.ADMIN_SECRET}`;

const unauthorized = () =>
  NextResponse.json(
    { error: { code: "unauthorized", message: "Missing or invalid admin key" } },
    { status: 401 }
  );

export async function POST(request: NextRequest) {
  if (!auth(request)) return unauthorized();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Body must be { urlKey, quote, [...] }" } },
      { status: 400 }
    );
  }
  const { urlKey, quote, prefix, suffix, occurrence, hue } = parsed.data;

  const [link] = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.urlKey, urlKey), isNull(links.hiddenAt)))
    .limit(1);
  if (!link) {
    return NextResponse.json(
      { error: { code: "not_found", message: "No link matches this urlKey" } },
      { status: 404 }
    );
  }

  const [row] = await db
    .insert(highlights)
    .values({ linkId: link.id, quote, prefix, suffix, occurrence, hue })
    .returning({ id: highlights.id });

  return NextResponse.json({ data: { id: row.id } });
}

/** Recolor an existing mark (palette pick on an edit). */
export async function PATCH(request: NextRequest) {
  if (!auth(request)) return unauthorized();

  const parsed = z
    .object({ id: z.number(), hue: z.number().int().min(0).max(7) })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "invalid_body", message: "Body must be { id, hue }" } },
      { status: 400 }
    );
  }

  await db
    .update(highlights)
    .set({ hue: parsed.data.hue })
    .where(eq(highlights.id, parsed.data.id));
  return NextResponse.json({ data: { ok: true } });
}

/** Erase a mark. */
export async function DELETE(request: NextRequest) {
  if (!auth(request)) return unauthorized();

  const id = Number(request.nextUrl.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { error: { code: "missing_param", message: "id is required" } },
      { status: 400 }
    );
  }

  await db.delete(highlights).where(eq(highlights.id, id));
  return NextResponse.json({ data: { ok: true } });
}
