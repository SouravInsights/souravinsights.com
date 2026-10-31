import { Metadata } from "next";
import { getMoviesData } from "./actions";
import { MoviesClient } from "./MoviesClient";
import { isAdminAuthenticated } from "@/lib/admin-auth";

// Reads Redis (a no-store fetch) and the admin cookie, so it can never be
// prerendered. Without this, `next build` attempts it, Redis throws "Dynamic
// server usage", getMoviesData swallows the signal and the build logs an error.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Movies | Sourav Kumar Nanda",
  description: "A personal collection of films that shaped the way I see the world.",
};

export default async function MoviesPage() {
  const data = await getMoviesData();
  const isEditing = isAdminAuthenticated();

  return (
    <main>
      <MoviesClient initialData={data} isEditing={isEditing} />
    </main>
  );
}
