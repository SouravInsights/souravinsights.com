import { RootProvider } from "fumadocs-ui/provider/next";
import "./global.css";
import { Inter, Inter_Tight } from "next/font/google";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

/**
 * The site's display cut, same as the wordmark there: Inter Tight is the same
 * superfamily, narrower and denser, so big type reads as a cut of the body
 * rather than a second typeface.
 */
const interTight = Inter_Tight({ subsets: ["latin"], variable: "--font-tight" });

export default function Layout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={cn(inter.variable, interTight.variable)} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
