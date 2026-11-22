import { ImageResponse } from "next/og";
import { HUES } from "@/lib/highlight-palette";

/**
 * Rendered at 2×, the way a retina asset is: the layout is authored in the
 * 1200×630 the platforms expect and every number goes through `px()`, so the
 * file that ships is 2400×1260 and stays sharp wherever it is scaled. Satori
 * draws text as outlines, so this is real resolution, not an upscale.
 */
const SCALE = 2;
const px = (value: number) => value * SCALE;

export const size = { width: px(1200), height: px(630) };
export const contentType = "image/png";
export const alt = "Highlight & Quote — a shadcn kit for marking a line and keeping it as a card";

/**
 * The landing's preview card, drawn as the landing.
 *
 * The hero's own stack, in its own order: the palette pill the page opens on,
 * then the title in Inter Tight, then the lede. Same near-black background and
 * the same card tones as the dark theme (#0a0a0a, #171717, #fafafa, #a1a1a1),
 * read off globals.css rather than picked by eye, because a card that is nearly
 * the page reads as a different product.
 */

const BACKGROUND = "#0a0a0a";
const CARD = "#171717";
const BORDER = "rgba(255, 255, 255, 0.1)";
const INK = "#fafafa";
const MUTED = "#a1a1a1";
// hue 2, painted as the dark theme paints it: the swatch at 34% under the
// lifted ink the palette hands the reader.
const MARK_WASH = "rgba(242, 194, 48, 0.34)";
const MARK_INK = "#f9e4a2";

type LoadedFont = { name: string; data: ArrayBuffer; weight: 400 | 600 };

async function loadFonts(): Promise<LoadedFont[]> {
  try {
    const [regular, semibold, tight] = await Promise.all([
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-400-normal.woff",
      ).then((response) => response.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter/files/inter-latin-600-normal.woff",
      ).then((response) => response.arrayBuffer()),
      fetch(
        "https://cdn.jsdelivr.net/npm/@fontsource/inter-tight/files/inter-tight-latin-600-normal.woff",
      ).then((response) => response.arrayBuffer()),
    ]);
    return [
      { name: "Inter", data: regular, weight: 400 },
      { name: "Inter", data: semibold, weight: 600 },
      { name: "Inter Tight", data: tight, weight: 600 },
    ];
  } catch {
    // A plain card beats no card.
    return [];
  }
}

export default async function Image() {
  const fonts = await loadFonts();

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        padding: `0 ${px(88)}px`,
        backgroundColor: BACKGROUND,
        // one soft halo, centred on the marked word, so the mark reads as lit
        // rather than pasted on. Radial, and warm, off hue 2.
        backgroundImage:
          "radial-gradient(42% 34% at 40% 42%, rgba(242, 194, 48, 0.10), rgba(10, 10, 10, 0) 72%)",
        fontFamily: "Inter",
      }}
    >
      {/* the palette pill, exactly as the hero opens */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: px(10),
          padding: `${px(13)}px ${px(19)}px`,
          borderRadius: 999,
          border: `${px(1)}px solid ${BORDER}`,
          background: CARD,
        }}
      >
        {HUES.map((hue) => (
          <div
            key={hue.name}
            style={{
              display: "flex",
              width: px(22),
              height: px(22),
              borderRadius: 999,
              background: hue.swatch,
              boxShadow: `inset 0 0 0 ${px(1)}px rgba(0, 0, 0, 0.14)`,
            }}
          />
        ))}
      </div>

      <div
        style={{
          display: "flex",
          marginTop: px(44),
          fontFamily: "Inter Tight",
          fontSize: px(84),
          fontWeight: 600,
          letterSpacing: `${px(-2.5)}px`,
          lineHeight: 1,
          color: INK,
        }}
      >
        <span
          style={{
            background: MARK_WASH,
            color: MARK_INK,
            // render.ts draws the marker at 1.08em tall, 0.16em of side pad and
            // a 0.10em radius. Same numbers here, so the OG mark is the card mark.
            padding: `${px(3)}px ${px(13)}px`,
            borderRadius: px(8),
          }}
        >
          Highlight
        </span>
        <span style={{ marginLeft: px(20) }}>&amp; Quote</span>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          marginTop: px(30),
          fontSize: px(30),
          lineHeight: 1.5,
          color: MUTED,
        }}
      >
        <div style={{ display: "flex" }}>A shadcn kit for highlighting text.</div>
        <div style={{ display: "flex" }}>Save locally. Share as posts.</div>
      </div>

      {/* the footer's rule, closing the card the way it closes the page */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: px(8),
        }}
      >
        {HUES.map((hue) => (
          <div key={hue.name} style={{ display: "flex", flexGrow: 1, background: hue.swatch }} />
        ))}
      </div>
    </div>,
    { ...size, fonts: fonts.length ? fonts : undefined },
  );
}
