import { NextResponse } from "next/server";
import { getMoviesData } from "@/app/movies/actions";

// The homepage shelf only needs a lightweight slice of the collection. It is
// cached at the edge so Redis (and the full movie payload) isn't hit per view.
export const revalidate = 300;

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

    return NextResponse.json({ movies });
  } catch (error) {
    console.error("Error fetching movies preview:", error);
    return NextResponse.json({ movies: [] }, { status: 500 });
  }
}
