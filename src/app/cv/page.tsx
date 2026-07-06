import { Metadata } from "next";
import { getCVData } from "./actions";
import { CVEditor } from "./CVEditor";
import { isAdminAuthenticated, getAdminSecret } from "@/lib/admin-auth";

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

  const expectedSecret = getAdminSecret();
  let isEditing = isAdminAuthenticated();
  let secretToLogin: string | undefined = undefined;

  if (!isEditing && expectedSecret && searchParams.edit === expectedSecret) {
    isEditing = true;
    secretToLogin = expectedSecret;
  }

  return (
    <main>
      <CVEditor initialData={data} isEditing={isEditing} secretToLogin={secretToLogin} />
    </main>
  );
}
