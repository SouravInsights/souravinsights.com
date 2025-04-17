import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { curatedLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { linkId, notes, creatorTwitter } = await request.json();

    if (!linkId) {
      return NextResponse.json({ error: "Link ID required" }, { status: 400 });
    }

    await db
      .update(curatedLinks)
      .set({
        notes: notes,
        creatorTwitter: creatorTwitter,
        updatedAt: new Date(),
      })
      .where(eq(curatedLinks.id, linkId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving notes:", error);
    return NextResponse.json(
      { error: "Failed to save notes" },
      { status: 500 }
    );
  }
}
