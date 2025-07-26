import { NextResponse } from "next/server";
import { db } from "@/db";
import { favoriteLinks } from "@/db/schema";

export async function GET() {
  try {
    const favorites = await db
      .select({
        id: favoriteLinks.id,
        title: favoriteLinks.title,
        url: favoriteLinks.url,
        description: favoriteLinks.description,
        category: favoriteLinks.category,
        createdAt: favoriteLinks.createdAt,
      })
      .from(favoriteLinks);

    console.log("Db result:", favorites);

    const response = NextResponse.json({
      success: true,
      favorites: favorites.map((favorite) => ({
        id: favorite.id.toString(),
        title: favorite.title,
        url: favorite.url,
        description: favorite.description,
        category: favorite.category,
        createdAt: favorite.createdAt,
      })),
    });

    // Disable caching to ensure fresh data (not sure if it will work)
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (error) {
    console.error("Error fetching favorite links for homepage:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorite links" },
      { status: 500 }
    );
  }
}
