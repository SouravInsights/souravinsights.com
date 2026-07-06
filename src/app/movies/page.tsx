import { Metadata } from "next";
import { getMoviesData } from "./actions";
import { MoviesClient } from "./MoviesClient";
import { cookies } from "next/headers";

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

  const expectedSecret = process.env.CV_EDIT_SECRET || process.env.ADMIN_API_KEY;
  const sessionCookie = cookies().get("admin_session");

  let isEditing = false;
  let secretToLogin = undefined;

  if (expectedSecret) {
    if (sessionCookie?.value === expectedSecret) {
      isEditing = true;
    } else if (searchParams.edit === expectedSecret) {
      isEditing = true;
      secretToLogin = expectedSecret;
    }
  }

  return (
    <main>
      <MoviesClient initialData={data} isEditing={isEditing} secretToLogin={secretToLogin} />
    </main>
  );
}
