import { Metadata } from "next";
import { getCVData } from "./actions";
import { CVEditor } from "./CVEditor";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title: "CV | Sourav Kumar Nanda",
  description: "Product Engineer with 4+ years of experience in Frontend Engineering.",
};

export default async function CVPage({
  searchParams,
}: {
  searchParams: { edit?: string };
}) {
  const data = await getCVData();
  
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
      <CVEditor initialData={data} isEditing={isEditing} secretToLogin={secretToLogin} />
    </main>
  );
}
