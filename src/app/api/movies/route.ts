import { NextResponse } from "next/server";
import { getMoviesData } from "@/app/movies/actions";

// Upstash reads go out as no-store fetches, so Next cannot prerender this
// route. Its build-time attempt threw "Dynamic server usage", which the catch
// in getMoviesData swallowed and logged — leaving a prerendered empty shelf.
// Render per request and let the CDN hold the response for 300s instead.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await getMoviesData();

    const movies = data.movies
      .filter((movie) => movie.title)
      .map((movie) => ({
        id: movie.id,
        title: movie.title,
        posterData: movie.posterData ?? null,
        tag: movie.tags?.[0] ?? null,
      }));

    return NextResponse.json(
      { movies },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching movies preview:", error);
    return NextResponse.json({ movies: [] }, { status: 500 });
  }
}
