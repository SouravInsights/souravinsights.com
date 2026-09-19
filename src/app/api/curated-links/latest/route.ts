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

const CHANNEL_LABELS: Record<string, string> = {
  "fav-portfolios": "Portfolios",
  "design-inspo": "Design",
  tools: "Tools",
  "product-hunt": "Products",
  "reading-list": "Reading",
  newsletters: "Newsletters",
  opportunities: "Opportunities",
  resources: "Resources",
};

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

    const latestPerChannel = await Promise.all(
      channels.map(async (channel): Promise<LinkData | null> => {
        const messages = await getMessagesFromChannel(channel.id, 10);
        // Discord returns the newest message first.
        const message = messages[0];
        if (!message) return null;

        const url = extractUrl(message.content, message.embeds);
        if (!url) return null;

        const description = extractDescription(message.embeds);

        return {
          id: message.id,
          url,
          title: titleFor(url, extractTitle(message.embeds)),
          description:
            description === "No description available" ? "" : description,
          visible: true,
          category: CHANNEL_LABELS[channel.name] ?? channel.name,
        };
      })
    );

    const links = latestPerChannel
      .filter((link): link is LinkData => link !== null)
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