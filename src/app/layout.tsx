import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/navbar/NavBar";
import ClientFooterWrapper from "@/components/footer/ClientFooterWrapper";

const inter = Inter({ subsets: ["latin"] });

const DESCRIPTION = `And this is my tiny home on the internet, a place to tell my own stories, share what 
    I’m excited about, what I’m thinking and what I’m currently upto.  I believe, a personal 
    website has endless possibilities, our identities, ideas, and dreams are created and 
    expanded by them, so it’s instrumental that our websites progress along with us.`;

export const metadata: Metadata = {
  title: "Hello world! I’m Sourav 👋",
  description: DESCRIPTION,
  openGraph: {
    title: "Hello world! I’m Sourav 👋",
    description: DESCRIPTION,
    url: "https://souravinsights.com",
    type: "website",
    images: [
      {
        url: "/home-page-og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hello world! I’m Sourav 👋",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hello world! I’m Sourav 👋",
    description: DESCRIPTION,
    images: ["/home-page-og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <div className="flex flex-col min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
            <Navbar />
            <main className="flex-grow">{children}</main>
            <ClientFooterWrapper />
          </div>
          <SpeedInsights />
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}
