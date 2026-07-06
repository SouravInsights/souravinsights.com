import { Metadata } from "next";
import { getMoviesData } from "./actions";
import { MoviesClient } from "./MoviesClient";
import { isAdminAuthenticated, getAdminSecret } from "@/lib/admin-auth";

export const metadata: Metadata = {
  title: "Movies | Sourav Kumar Nanda",
  description: "A personal collection of films that shaped the way I see the world.",
};

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const data = await getMoviesData();

  const expectedSecret = getAdminSecret();
  let isEditing = isAdminAuthenticated();
  let secretToLogin: string | undefined = undefined;

  if (!isEditing && expectedSecret && searchParams.edit === expectedSecret) {
    isEditing = true;
    secretToLogin = expectedSecret;
  }

  return (
    <main>
      <MoviesClient initialData={data} isEditing={isEditing} secretToLogin={secretToLogin} />
    </main>
  );
}
