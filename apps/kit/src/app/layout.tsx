import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UI Kit — Sourav Insights",
  description:
    "A shadcn-style copy-paste kit for text highlights and shareable quote cards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
