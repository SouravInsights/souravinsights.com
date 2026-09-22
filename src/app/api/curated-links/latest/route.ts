import { NextResponse } from "next/server";
import {
  getChannels,
  getMessagesFromChannel,
  extractUrl,
  extractTitle,
  extractDescription,
  type LinkData,
} from "@/app/curated-links/utils/discordApi";

// The homepage section should never be stale, but it also shouldn't hit
// Discord on every visit. Cache the response at the edge and refresh it.
export const revalidate = 300;

// Only these channels feed the homepage, each contributing a set number of
// recent links. Portfolios, newsletters and opportunities are intentionally
// left out so the section stays focused on reading and resources.
const HOME_CHANNELS: { name: string; label: string; count: number }[] = [
  { name: "reading-list", label: "Reading", count: 5 },
  { name: "resources", label: "Resources", count: 3 },
];

function titleFor(url: string, embedTitle: string): string {
  if (embedTitle && embedTitle !== "Untitled") return embedTitle;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Untitled";
  }
}

export async function GET() {
  try {
    const channels = await getChannels();
    const byName = new Map(channels.map((channel) => [channel.name, channel]));

    const groups = await Promise.all(
      HOME_CHANNELS.map(async ({ name, label, count }): Promise<LinkData[]> => {
        const channel = byName.get(name);
        if (!channel) return [];

        // Ask for a few extra so messages without a usable URL don't shrink
        // the group below its target size.
        const messages = await getMessagesFromChannel(channel.id, count + 5);

        return messages
          .map((message): LinkData => {
            const url = extractUrl(message.content, message.embeds);
            const description = extractDescription(message.embeds);

            return {
              id: message.id,
              url,
              title: titleFor(url, extractTitle(message.embeds)),
              description:
                description === "No description available" ? "" : description,
              visible: true,
              category: label,
            };
          })
          .filter((link) => link.url)
          .slice(0, count);
      })
    );

    const links = groups
      .flat()
      .sort((a, b) =>
        BigInt(b.id) > BigInt(a.id) ? 1 : BigInt(b.id) < BigInt(a.id) ? -1 : 0
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