import { NextResponse } from "next/server";
import { getLinks } from "@/lib/links/queries";

// The homepage section should never be stale, but it also shouldn't hit the
// database on every visit. Cache the response at the edge and refresh it.
export const revalidate = 300;

// Only these channels feed the homepage, each contributing a set number of
// recent links. Portfolios and newsletters are intentionally left out so the
// section stays focused on reading and resources.
const HOME_CHANNELS: { name: string; label: string; count: number }[] = [
  { name: "reading-list", label: "Articles", count: 5 },
  { name: "resources", label: "Resources", count: 3 },
];

function titleFor(url: string, title: string): string {
  if (title) return title;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Untitled";
  }
}

export async function GET() {
  try {
    const groups = await Promise.all(
      HOME_CHANNELS.map(async ({ name, label, count }) => {
        const rows = await getLinks({ channel: name });
        return rows.slice(0, count).map((row) => ({
          id: row.discordId ?? row.urlKey,
          url: row.url,
          title: titleFor(row.url, row.title),
          description: row.description,
          visible: true,
          category: label,
          addedAt: row.addedAt.toISOString(),
        }));
      })
    );

    const links = groups
      .flat()
      .sort(
        (a, b) =>
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
      );

    const response = NextResponse.json({ success: true, links });
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=600"
    );
    return response;
  } catch (error) {
    console.error("Error fetching latest curated links:", error);
    return NextResponse.json(
      { error: "Failed to fetch latest links" },
      { status: 500 }
    );
  }
}
