import { Metadata } from "next";
import { getCVData } from "./actions";
import { CVEditor } from "./CVEditor";
import { isAdminAuthenticated, getAdminSecret } from "@/lib/admin-auth";

const CV_TITLE = "CV | Sourav Kumar Nanda";
const CV_DESCRIPTION =
  "Product Engineer with 4+ years of experience building and shipping products end-to-end.";

export const metadata: Metadata = {
  title: CV_TITLE,
  description: CV_DESCRIPTION,
  alternates: { canonical: "/cv" },
  openGraph: {
    type: "profile",
    title: CV_TITLE,
    description: CV_DESCRIPTION,
    url: "/cv",
    siteName: "Sourav Kumar Nanda",
    images: [
      {
        url: "/cv-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sourav Kumar Nanda, Product Engineer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: CV_TITLE,
    description: CV_DESCRIPTION,
    images: ["/cv-og-image.jpg"],
  },
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
