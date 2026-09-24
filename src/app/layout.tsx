import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/context/ThemeContext";
import { SoundProvider } from "@/context/SoundContext";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import Navbar from "@/components/navbar/NavBar";
import ClientFooterWrapper from "@/components/footer/ClientFooterWrapper";
import { PHProvider } from "@/context/PostHogProvider";
import dynamic from "next/dynamic";

const PostHogPageView = dynamic(() => import("@/components/PostHogPageView"), {
  ssr: false,
});

const inter = Inter({ subsets: ["latin"] });

const DESCRIPTION = `And this is my tiny home on the internet, a place to tell my own stories, share what 
    I’m excited about, what I’m thinking and what I’m currently upto.  I believe, a personal 
    website has endless possibilities, our identities, ideas, and dreams are created and 
    expanded by them, so it’s instrumental that our websites progress along with us.`;

export const metadata: Metadata = {
  // Resolves relative Open Graph image URLs to the production domain, so shared
  // links unfurl with the right absolute image instead of the deploy URL.
  metadataBase: new URL("https://souravinsights.com"),
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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
          Runs before the first paint so the stored theme is applied with no
          flash of the wrong background. Kept tiny and inline on purpose.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('darkMode');var d=s===null?true:s==='true';var r=document.documentElement;r.classList.toggle('dark',d);r.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} antialiased`}>
        <PHProvider>
          <PostHogPageView />
          <ThemeProvider>
            <SoundProvider>
              <div className="flex flex-col min-h-screen bg-background text-foreground transition-colors duration-200">
                <Navbar />
                <main className="flex-grow">{children}</main>
                <ClientFooterWrapper />
              </div>
            </SoundProvider>
            <SpeedInsights />
            <Analytics />
          </ThemeProvider>
        </PHProvider>
      </body>
    </html>
  );
}
