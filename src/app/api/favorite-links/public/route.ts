import { NextResponse } from "next/server";
import { db } from "@/db";
import { favoriteLinks } from "@/db/schema";

// Force dynamic rendering
export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    // Enhanced cache control headers
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("Surrogate-Control", "no-store");

    return response;
  } catch (error) {
    console.error("Error fetching favorite links for homepage:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorite links" },
      { status: 500 }
    );
  }
}
