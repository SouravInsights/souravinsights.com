import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { galleryVideos } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-auth";

/**
 * Edit a clip's title, notes or tags. Admin only, and only those three columns:
 * the R2 keys, dimensions and duration are facts about the uploaded file, not
 * something a browser may rewrite.
 *
 * Mirrors the highlights route — `requireAdmin`, a zod body, `revalidatePath` —
 * so there is one way an admin write works on this site.
 */
const bodySchema = z.object({
  id: z.string().min(1),
  title: z.string().max(200).optional(),
  notes: z.string().max(8000).optional(),
  tags: z.array(z.string().max(40)).max(12).optional(),
});

export async function PATCH(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "invalid_body",
          message: "Body must be { id, title?, notes?, tags? }",
        },
      },
      { status: 400 }
    );
  }

  const { id, title, notes, tags } = parsed.data;
  const update: Record<string, unknown> = { updatedAt: new Date() };
  if (title !== undefined) update.title = title.trim();
  if (notes !== undefined) update.notes = notes.trim();
  if (tags !== undefined) {
    update.tags = tags.map((tag) => tag.trim()).filter(Boolean);
  }

  await db.update(galleryVideos).set(update).where(eq(galleryVideos.id, id));
  revalidatePath("/gallery");

  return NextResponse.json({ data: { id } });
}
