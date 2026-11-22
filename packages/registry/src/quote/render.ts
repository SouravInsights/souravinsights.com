/*
 * Text layout, card drawing and PNG export. One canvas is the preview and the
 * export, so the two cannot drift.
 */

import {
  MODES,
  fontStack,
  sansStack,
  type AlignChoice,
  type FontChoice,
  type Mode,
  type PositionChoice,
  type SizeChoice,
} from "./presets";
import { solid, type Fill, type ShareTheme, type Variant } from "./themes";

function fontString(size: number, family: string, weight = 400, italic = false): string {
  return `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): { text: string; width: number }[] {
  const out: { text: string; width: number }[] = [];
  for (const paragraph of text.split(/\n+/)) {
    const words = paragraph.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
    if (words.length === 0) continue;
    let line = "";
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        out.push({ text: line, width: ctx.measureText(line).width });
        line = word;
      } else {
        line = next;
      }
    }
    if (line) out.push({ text: line, width: ctx.measureText(line).width });
  }
  return out;
}

/* ----------------------------------------------------------------- drawing */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

/**
 * Curio, in the SVG's own coordinates.
 *
 * The viewBox is `2 8 60 48` (`src/components/curio/Curio.tsx`): 60 wide by 48
 * tall, centred on the bot. The body is one rounded rect; the four limbs are
 * rects rotated about their own centres. Kept as data so the canvas mark and
 * the on-page mark cannot drift apart in shape.
 */
const CURIO_VIEW = { x: 2, y: 8, w: 60, h: 48 };
const CURIO_BODY =
  "M 25 10 L 39 10 C 47.64 10 51 13.36 51 22 L 51 32 C 51 43.52 46.52 48 35 48 L 29 48 C 17.48 48 13 43.52 13 32 L 13 22 C 13 13.36 16.36 10 25 10 Z";
const CURIO_LIMBS: [number, number, number, number, number, number, number, number][] = [
  // x, y, w, h, rx, pivotX, pivotY, degrees
  [7, 18, 10, 8, 4, 12, 22, 30],
  [47, 18, 10, 8, 4, 52, 22, -30],
  [18.5, 42.5, 11, 11, 5.5, 24, 48, -18],
  [34.5, 42.5, 11, 11, 5.5, 40, 48, 18],
];
const CURIO_EYES: [number, number, number, number][] = [
  // x, y, catchlightX, catchlightY
  [18.5, 22, 21.9, 25.6],
  [34.5, 22, 37.9, 25.6],
];

function fillBackground(ctx: CanvasRenderingContext2D, fill: Fill, w: number, h: number) {
  ctx.fillStyle = fill.kind === "solid" ? fill.color : fill.base;
  ctx.fillRect(0, 0, w, h);
  if (fill.kind !== "mesh") return;
  for (const blob of fill.blobs) {
    const gradient = ctx.createRadialGradient(
      blob.x * w,
      blob.y * h,
      0,
      blob.x * w,
      blob.y * h,
      blob.r * w,
    );
    gradient.addColorStop(0, blob.color);
    gradient.addColorStop(1, "transparent");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
}

/* ---------------------------------------------------------------- options */

export interface CardOptions {
  quote: string;
  title: string;
  publication: string;
  /** the surrounding article text, for the faded-backdrop design */
  context: string;
  fill: Fill;
  background: string;
  text: string;
  highlight: string;
  highlightText: string;
  font: FontChoice;
  size: SizeChoice;
  align: AlignChoice;
  position: PositionChoice;
  showTitle: boolean;
  showPublication: boolean;
}

export type Overrides = Partial<Omit<CardOptions, "quote" | "title" | "publication" | "context">>;

/** A variant's colours, with the Customize panel's overrides on top. */
export function resolveOptions(
  theme: ShareTheme,
  variant: Variant,
  overrides: Overrides,
  content: Pick<CardOptions, "quote" | "title" | "publication" | "context">,
): CardOptions {
  const base: Omit<CardOptions, "quote" | "title" | "publication" | "context"> = {
    fill: variant.fill,
    background: variant.fill.kind === "solid" ? variant.fill.color : variant.fill.base,
    text: variant.text,
    highlight: variant.highlight ?? "#f4e58a",
    highlightText: variant.highlightText ?? variant.text,
    font: theme.font,
    size: theme.size,
    align: theme.align,
    position: theme.position,
    showTitle: theme.showTitle,
    showPublication: theme.showPublication,
  };
  const merged = { ...base, ...overrides };
  // A hand-picked colour is flat, whatever the variant painted.
  if (overrides.background !== undefined) {
    merged.fill = solid(overrides.background);
  }
  return { ...merged, ...content };
}

/* ------------------------------------------------------------------ card */

/**
 * Draw one card at its export size. Pure: the same call fills the on-screen
 * preview and the PNG that leaves the browser.
 */
export function drawCard(
  ctx: CanvasRenderingContext2D,
  mode: Mode,
  theme: ShareTheme,
  options: CardOptions,
) {
  const dims = MODES.find((m) => m.id === mode) ?? MODES[0];
  const w = dims.width;
  const h = dims.height;
  const family = fontStack(options.font);
  const sans = sansStack();

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  fillBackground(ctx, options.fill, w, h);

  const pad = Math.round(w * 0.085);
  const maxWidth = w - pad * 2;

  /* top label (none today, kept for the paper design's shape) */
  const topSize = Math.round(w * 0.022);
  const topBlock = 0;

  /* footer geometry */
  const titleSize = Math.round(w * 0.026);
  const pubSize = Math.round(w * 0.022);
  // The mark's square box; the bot inside is 0.8 tall, so its real height is
  // smaller than the box and it shares a centreline with the text.
  const markSize = Math.round(w * 0.09);
  const markGap = Math.round(w * 0.032);
  const pubGap = Math.round(titleSize * 0.24);
  const footerWidth =
    theme.footer === "center" || !options.showTitle ? maxWidth : maxWidth - markSize - markGap;

  ctx.font = fontString(titleSize, sans, 600);
  const titleLines = options.showTitle
    ? wrapText(
        ctx,
        theme.uppercaseTitle ? options.title.toUpperCase() : options.title,
        footerWidth,
      ).slice(0, 2)
    : [];
  // The host is set in mono: on a still image it is the only cue that the
  // line is a URL and not a byline. Mono reads as address, not prose.
  const mono = fontStack("mono");
  ctx.font = fontString(pubSize, mono, 400);
  const pubLines =
    options.showPublication && options.publication
      ? wrapText(ctx, options.publication, footerWidth).slice(0, 1)
      : [];

  const titleBlock = titleLines.length * titleSize * 1.35;
  const pubBlock = pubLines.length ? pubGap + pubSize * 1.45 : 0;
  const textBlock = titleBlock + pubBlock;
  const footerHeight =
    theme.footer === "center"
      ? textBlock + (textBlock ? markGap : 0) + markSize
      : Math.max(textBlock, markSize);

  const quoteTop = pad + topBlock;
  const quoteBottom = h - pad - footerHeight - Math.round(w * 0.06);
  const quoteHeight = Math.max(quoteBottom - quoteTop, w * 0.2);

  /* quote size, stepped down until the block fits */
  const base = { small: 0.07, medium: 0.086, large: 0.102 }[options.size];
  const raw = theme.quoteMarks ? `\u201C${options.quote}\u201D` : options.quote;
  const quote = theme.uppercaseQuote ? raw.toUpperCase() : raw;
  const quoteInk = theme.style === "marker" ? options.highlightText : options.text;
  let fontSize = Math.round(w * base);
  let lines: { text: string; width: number }[] = [];
  let lineHeight = fontSize * 1.22;
  for (let guard = 0; guard < 12; guard++) {
    ctx.font = fontString(
      fontSize,
      family,
      theme.style === "bold" || options.font === "sans" ? 700 : 400,
      theme.italicQuote,
    );
    lines = wrapText(ctx, quote, maxWidth - fontSize * 0.3);
    lineHeight = fontSize * 1.24;
    if (lines.length * lineHeight <= quoteHeight || fontSize <= w * 0.045) break;
    fontSize = Math.round(fontSize * 0.92);
  }
  const blockHeight = lines.length * lineHeight;

  let y: number;
  if (options.position === "top") y = quoteTop;
  else if (options.position === "bottom") y = quoteBottom - blockHeight;
  else y = quoteTop + (quoteHeight - blockHeight) / 2;

  /* the faded page behind the words */
  if (theme.faded && options.context) {
    ctx.save();
    ctx.globalAlpha = 0.06;
    const ghostSize = Math.round(w * 0.062);
    ctx.font = fontString(ghostSize, fontStack("serif"), 400);
    const ghost = wrapText(ctx, options.context, maxWidth * 1.05);
    const ghostLine = ghostSize * 1.4;
    ctx.textBaseline = "top";
    ctx.fillStyle = options.text;
    if (ghost.length > 0) {
      let gy = quoteTop;
      let index = 0;
      while (gy <= quoteBottom + ghostLine) {
        const line = ghost[index % ghost.length];
        const gx = options.align === "center" ? (w - line.width) / 2 : pad;
        ctx.fillText(line.text, gx, gy);
        gy += ghostLine;
        index++;
      }
    }
    ctx.restore();
  }

  /* the marker behind the words */
  if (theme.style === "marker") {
    const hpad = fontSize * 0.16;
    const rectHeight = fontSize * 1.08;
    ctx.fillStyle = options.highlight;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineY = y + i * lineHeight + (lineHeight - rectHeight) / 2;
      const x = options.align === "center" ? (w - line.width) / 2 - hpad : pad - hpad;
      roundRect(ctx, x, lineY, line.width + hpad * 2, rectHeight, fontSize * 0.1);
      ctx.fill();
    }
  }

  /* the words */
  ctx.fillStyle = quoteInk;
  ctx.textBaseline = "top";
  ctx.font = fontString(
    fontSize,
    family,
    theme.style === "bold" || options.font === "sans" ? 700 : 400,
    theme.italicQuote,
  );
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const x = options.align === "center" ? (w - line.width) / 2 : pad;
    ctx.fillText(line.text, x, y + i * lineHeight);
  }

  /* footer */
  const footerTop = h - pad - footerHeight;

  /* A hairline between the words and the attribution, the way a masthead
     divides from the body. Left footers only: the centred designs are one
     column, and a rule across them reads as a second baseline. */
  if (theme.footer === "left" && textBlock > 0) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = options.text;
    ctx.fillRect(
      pad,
      footerTop - Math.round(h * 0.03),
      maxWidth,
      Math.max(1, Math.round(h * 0.0012)),
    );
    ctx.restore();
  }

  if (theme.footer === "center") {
    let fy = footerTop;
    ctx.fillStyle = options.text;
    ctx.font = fontString(titleSize, sans, 600);
    for (const line of titleLines) {
      ctx.fillText(line.text, (w - line.width) / 2, fy);
      fy += titleSize * 1.35;
    }
    if (pubLines.length) {
      fy += pubGap;
      ctx.globalAlpha = 0.68;
      ctx.font = fontString(pubSize, mono, 400);
      ctx.fillText(pubLines[0].text, (w - pubLines[0].width) / 2, fy);
      ctx.globalAlpha = 1;
      fy += pubSize * 1.45;
    }
    if (textBlock) fy += markGap;
    drawCurioMark(ctx, (w - markSize) / 2, fy, markSize, options);
  } else {
    // Text and mark sit on one centreline, so a one-line title beside a tall
    // mark never reads as top-aligned by accident.
    let fy = footerTop + (footerHeight - textBlock) / 2;
    ctx.fillStyle = options.text;
    ctx.font = fontString(titleSize, sans, 600);
    for (const line of titleLines) {
      ctx.fillText(line.text, pad, fy);
      fy += titleSize * 1.35;
    }
    if (pubLines.length) {
      fy += pubGap;
      ctx.globalAlpha = 0.68;
      ctx.font = fontString(pubSize, mono, 400);
      ctx.fillText(pubLines[0].text, pad, fy);
      ctx.globalAlpha = 1;
    }
    drawCurioMark(
      ctx,
      w - pad - markSize,
      footerTop + (footerHeight - markSize) / 2,
      markSize,
      options,
    );
  }

  ctx.restore();
}

/**
 * Curio, the collection's mark, in the card's own ink and paper.
 *
 * The body is the card's ink; the eyes are punched out of it in the paper
 * colour, with the catchlight back in ink — the same read as the mark on the
 * site, where dark eyes catch a light on a coloured body.
 */
function drawCurioMark(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  options: CardOptions,
) {
  const s = size / CURIO_VIEW.w;
  const drawnH = CURIO_VIEW.h * s;
  ctx.save();
  ctx.translate(x - CURIO_VIEW.x * s, y + (size - drawnH) / 2 - CURIO_VIEW.y * s);
  ctx.scale(s, s);

  ctx.fillStyle = options.text;
  ctx.fill(new Path2D(CURIO_BODY));

  for (const [lx, ly, lw, lh, lr, px, py, deg] of CURIO_LIMBS) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.translate(-px, -py);
    roundRect(ctx, lx, ly, lw, lh, lr);
    ctx.fill();
    ctx.restore();
  }

  ctx.fillStyle = options.background;
  for (const [ex, ey] of CURIO_EYES) {
    roundRect(ctx, ex, ey, 11, 12, 5.25);
    ctx.fill();
  }

  ctx.fillStyle = options.text;
  for (const [, , cx, cy] of CURIO_EYES) {
    ctx.beginPath();
    ctx.arc(cx, cy, 1.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

/** A PNG of the card, ready to save or hand to the clipboard. */
export function cardToBlob(
  mode: Mode,
  theme: ShareTheme,
  options: CardOptions,
): Promise<Blob | null> {
  const dims = MODES.find((m) => m.id === mode) ?? MODES[0];
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  drawCard(ctx, mode, theme, options);
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}
