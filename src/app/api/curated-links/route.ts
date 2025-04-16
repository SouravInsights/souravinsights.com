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

    const data = await request.json();
    const { title, url, description, category, notes, creatorTwitter } = data;

    if (!title || !url || !category) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const result = await db
      .insert(curatedLinks)
      .values({
        title,
        url,
        description,
        category,
        notes,
        creatorTwitter,
      })
      .returning({ id: curatedLinks.id });

    return NextResponse.json({ success: true, id: result[0].id });
  } catch (error) {
    console.error("Error saving link:", error);
    return NextResponse.json({ error: "Failed to save link" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { id, notes, creatorTwitter } = data;

    if (!id) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    await db
      .update(curatedLinks)
      .set({
        notes,
        creatorTwitter,
        updatedAt: new Date(),
      })
      .where(eq(curatedLinks.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating link:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}
