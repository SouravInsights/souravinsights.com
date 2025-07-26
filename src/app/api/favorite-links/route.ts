import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { favoriteLinks } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await db.select().from(favoriteLinks);

    return NextResponse.json({
      success: true,
      favorites: favorites.map((favorite) => ({
        id: favorite.id,
        title: favorite.title,
        url: favorite.url,
        description: favorite.description,
        category: favorite.category,
        createdAt: favorite.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching favorite links:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorite links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { id, title, url, description, category, notes, creatorTwitter } =
      data;

    if (!id || !title || !url || !category) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: id, title, url, and category are required",
        },
        { status: 400 }
      );
    }

    console.log("Inserting favorite link:", { id, title, url, category });

    const result = await db.insert(favoriteLinks).values({
      id: BigInt(id),
      title,
      url,
      description,
      category,
    });

    console.log("Insert result:", result);

    // Verify the insert by querying back
    // const inserted = await db
    //   .select()
    //   .from(favoriteLinks)
    //   .where(eq(favoriteLinks.id, BigInt(id)));
    // console.log("Verification query result:", inserted);

    return NextResponse.json({
      success: true,
      id,
      message: "Link added to favorites",
    });
  } catch (error) {
    console.error("Error adding favorite link:", error);
    return NextResponse.json(
      { error: "Failed to add favorite link" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    await db.delete(favoriteLinks).where(eq(favoriteLinks.id, BigInt(id)));

    return NextResponse.json({
      success: true,
      message: "Link removed from favorites",
    });
  } catch (error) {
    console.error("Error removing favorite link:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite link" },
      { status: 500 }
    );
  }
}
