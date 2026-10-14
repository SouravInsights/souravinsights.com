import { ImageResponse } from "next/og";
import { getConversation } from "@/lib/curio/conversations";

/**
 * The preview card for a shared conversation.
 *
 * A shared link's first impression is the card it makes in a chat app, so the
 * card carries the question itself rather than a generic logo: the reason to
 * open the link is what was asked, not who answered it.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A shared conversation with Curio";

export default async function Image({ params }: { params: { id: string } }) {
  const conversation = await getConversation(params.id);
  const question = (conversation?.title || "A question for Curio").trim();
  const trimmed = question.length > 110 ? `${question.slice(0, 109)}…` : question;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "76px",
          backgroundColor: "#0b0b0c",
          backgroundImage: "linear-gradient(135deg, #16241c 0%, #0b0b0c 55%)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "999px",
              backgroundColor: "#4ade80",
            }}
          />
          <div
            style={{
              fontSize: "26px",
              letterSpacing: "7px",
              textTransform: "uppercase",
              color: "#a1a1aa",
            }}
          >
            Curio
          </div>
        </div>

        <div
          style={{
            display: "flex",
            fontSize: trimmed.length > 64 ? "52px" : "64px",
            lineHeight: 1.16,
            fontWeight: 600,
            color: "#fafafa",
            maxWidth: "980px",
          }}
        >
          {trimmed}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "26px",
            color: "#a1a1aa",
          }}
        >
          <span>souravinsights.com/curio</span>
          <span>Answers from my saved links</span>
        </div>
      </div>
    ),
    size
  );
}
