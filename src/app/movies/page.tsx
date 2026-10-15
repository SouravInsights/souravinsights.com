import { Metadata } from "next";
import { getMoviesData } from "./actions";
import { MoviesClient } from "./MoviesClient";
import { isAdminAuthenticated } from "@/lib/admin-auth";

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
