import { ImageResponse } from "next/og";
import { getConversation } from "@/lib/curio/conversations";
import { dateLabel, turnsOf } from "@/lib/curio/turns";

/**
 * The preview card for a shared conversation.
 *
 * Built to belong to the card the site already ships for Curio: flat near-black,
 * the mascot in the site's one chromatic identity, plain Inter, and a centred
 * stack. The only things that change are the words: the question, since that is
 * the reason to open the link, one line of the answer as proof that something
 * was answered, and the two facts a reader might want before clicking (when, and
 * how many pages it came from).
 *
 * Colours are the dark theme's own values, copied from globals.css rather than
 * invented, because a card that is nearly the site's background reads as a
 * different site.
 */

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "A shared conversation with Curio";

const FONT = "Inter";
const BACKGROUND = "#0c0f12"; // --background, dark
const INK = "#f0f2f5"; // --foreground, dark
const MUTED = "#a2adb9"; // --muted-foreground, dark
const FAINT = "#818e9c"; // --faint-foreground, dark
const RULE = "#2d3239"; // --border, dark
const GREEN = "#22c55e"; // green-500, what the mascot wears on near-black

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 600 };

async function loadFonts(): Promise<LoadedFont[]> {
  try {
    const [regular, semibold] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff"
      ).then((response) => response.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-600-normal.woff"
      ).then((response) => response.arrayBuffer()),
    ]);
    return [
      { name: FONT, data: regular, weight: 400 },
      { name: FONT, data: semibold, weight: 600 },
    ];
  } catch {
    // A plain card beats no card.
    return [];
  }
}

/**
 * The mascot, drawn from the same paths the site uses (components/curio/Curio.tsx)
 * with the animation taken out. Kept as a literal SVG so the card cannot drift
 * from the mark: change the drawing there and this string is the one thing that
 * has to follow.
 */
const BODY =
  "M 25 10 L 39 10 C 47.64 10 51 13.36 51 22 L 51 32 C 51 43.52 46.52 48 35 48 " +
  "L 29 48 C 17.48 48 13 43.52 13 32 L 13 22 C 13 13.36 16.36 10 25 10 Z";

const limb = (x: number, y: number, w: number, h: number, r: number, angle: number, cx: number, cy: number) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${GREEN}" transform="rotate(${angle} ${cx} ${cy})"/>`;

const eye = (x: number) =>
  `<rect x="${x}" y="22" width="11" height="12" rx="5.25" fill="#21201C"/>` +
  `<circle cx="${x + 3.4}" cy="25.6" r="1.7" fill="#FFFDF8"/>`;

const MASCOT =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="2 8 60 48" width="150" height="120">` +
  `<path d="${BODY}" fill="${GREEN}"/>` +
  limb(7, 18, 10, 8, 4, 30, 12, 22) +
  limb(47, 18, 10, 8, 4, -30, 52, 22) +
  limb(18.5, 42.5, 11, 11, 5.5, -18, 24, 48) +
  limb(34.5, 42.5, 11, 11, 5.5, 18, 40, 48) +
  eye(18.5) +
  eye(34.5) +
  `</svg>`;

const MASCOT_SRC = `data:image/svg+xml;base64,${Buffer.from(MASCOT).toString("base64")}`;

/** Cut to a length, at a word boundary, with an ellipsis when it was cut. */
const clamp = (text: string, limit: number): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

/**
 * A question can be one word or a whole sentence, and the card is a fixed size.
 * Three sizes rather than a fitted one: at this length the difference between
 * tiers is invisible, and the worst case (a long question, a two-line preview)
 * still fits inside the 630px of height with nothing clipped.
 */
const questionSize = (length: number): string => {
  if (length > 86) return "38px";
  if (length > 54) return "46px";
  return "54px";
};

export default async function Image({ params }: { params: { id: string } }) {
  const conversation = await getConversation(params.id);
  const turns = conversation ? turnsOf(conversation.messages) : [];

  const question = clamp(
    conversation?.title || turns[0]?.question || "A question for Curio",
    120
  );
  // Two lines at most, cut at a word: enough of the answer to show what kind of
  // thing is inside, without turning the card into a paragraph. A stub would be
  // worse than nothing, so this leans generous.
  const answer = clamp(turns.find((turn) => turn.answer)?.answer ?? "", 150);
  const sources = turns.reduce((total, turn) => total + turn.sources.length, 0);
  const shared = conversation ? dateLabel(conversation.createdAt) : "";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "64px 96px",
          backgroundColor: BACKGROUND,
          fontFamily: FONT,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MASCOT_SRC} width={150} height={120} alt="" />

        <div
          style={{
            display: "flex",
            marginTop: "44px",
            fontSize: questionSize(question.length),
            lineHeight: 1.16,
            fontWeight: 600,
            letterSpacing: "-0.015em",
            color: INK,
            textAlign: "center",
            maxWidth: "940px",
          }}
        >
          {question}
        </div>

        {answer ? (
          <div
            style={{
              display: "flex",
              marginTop: "26px",
              fontSize: "26px",
              lineHeight: 1.4,
              color: MUTED,
              textAlign: "center",
              maxWidth: "900px",
            }}
          >
            {answer}
          </div>
        ) : null}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            marginTop: "48px",
            fontSize: "23px",
            color: FAINT,
          }}
        >
          {shared ? <span>{shared}</span> : null}
          {shared && sources ? (
            <span style={{ width: "1px", height: "18px", backgroundColor: RULE }} />
          ) : null}
          {sources ? (
            <span>
              {sources} {sources === 1 ? "source" : "sources"}
            </span>
          ) : null}
        </div>
      </div>
    ),
    { ...size, fonts: await loadFonts() }
  );
}
