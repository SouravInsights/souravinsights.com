/*
 * The quote cards: three sizes, four designs, drawn on a canvas.
 *
 * Canvas rather than DOM-to-image on purpose. The export has to be exactly the
 * preview, and a canvas is the one surface where those two are the same object —
 * no screenshot library, no foreignObject font bugs, no second renderer to keep
 * in step. The cost is that text is laid out by hand (wrapping, baseline), which
 * is a few small helpers, not a framework.
 *
 * A design is a way of setting a quote; a *variant* is that design in one set of
 * colours. The circular controls are the active design's own variants, so the row
 * under the card changes with the card — a marker gets marker colours, a gradient
 * poster gets gradients. Four designs, not a dozen.
 */

export type Mode = "post" | "story" | "square";
export type FontChoice = "serif" | "sans" | "mono";
export type SizeChoice = "small" | "medium" | "large";
export type AlignChoice = "left" | "center";
export type PositionChoice = "top" | "middle" | "bottom";

export const MODES: {
  id: Mode;
  label: string;
  width: number;
  height: number;
  /** what the size is for — the segmented control's tooltip */
  tip: string;
}[] = [
  {
    id: "post",
    label: "Post",
    width: 1080,
    height: 1350,
    tip: "4:5 · 1080 × 1350 · Feed, Threads, LinkedIn",
  },
  {
    id: "story",
    label: "Story",
    width: 1080,
    height: 1920,
    tip: "9:16 · 1080 × 1920 · Stories, Reels, TikTok",
  },
  {
    id: "square",
    label: "Square",
    width: 1080,
    height: 1080,
    tip: "1:1 · 1080 × 1080 · Feed, X, Bluesky",
  },
];

interface MeshBlob {
  x: number;
  y: number;
  r: number;
  color: string;
}

export type Paint =
  | { kind: "solid"; color: string }
  | { kind: "mesh"; base: string; blobs: MeshBlob[] };

const solid = (color: string): Paint => ({ kind: "solid", color });
const mesh = (base: string, blobs: MeshBlob[]): Paint => ({ kind: "mesh", base, blobs });
/** a gradient's circular control */
const grad = (...colors: string[]) =>
  `linear-gradient(135deg, ${colors.join(", ")})`;
/** a paper control with an ink dot in its middle */
const dot = (accent: string, base: string) =>
  `radial-gradient(circle, ${accent} 0 21%, ${base} 22%)`;

export interface Variant {
  name: string;
  /** CSS fill for the circular control (a colour or a gradient) */
  swatch: string;
  paint: Paint;
  /** the footer's ink, and the quote's ink unless it sits on a marker */
  text: string;
  /** the marker pen behind the words */
  highlight?: string;
  /** the words' colour on the marker */
  highlightText?: string;
}

export interface ShareTheme {
  id: string;
  name: string;
  /** how the design sets the quote */
  style: "marker" | "plain" | "quote" | "bold";
  /** the faded page behind the words */
  faded?: boolean;
  footer: "left" | "center";
  font: FontChoice;
  size: SizeChoice;
  align: AlignChoice;
  position: PositionChoice;
  showTitle: boolean;
  showPublication: boolean;
  uppercaseTitle?: boolean;
  uppercaseQuote?: boolean;
  italicQuote?: boolean;
  quoteMarks?: boolean;
  variants: Variant[];
}

const INK = "#141414";
const PAPER = "#faf8f2";
const NIGHT = "#0b0b0b";
const NIGHT_TEXT = "#f5f0e8";

/** Marker: a pen run behind the words, on paper or on black. */
const markerVariants: Variant[] = [
  {
    name: "Cream",
    swatch: "#f4e58a",
    paint: solid(PAPER),
    text: INK,
    highlight: "#f4e58a",
    highlightText: INK,
  },
  {
    name: "Tangerine",
    swatch: "#f5a35c",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#f5a35c",
    highlightText: INK,
  },
  {
    name: "Sun",
    swatch: "#f2c230",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#f2c230",
    highlightText: INK,
  },
  {
    name: "Mint",
    swatch: "#8fe0b0",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#8fe0b0",
    highlightText: INK,
  },
  {
    name: "Sky",
    swatch: "#8ecdf7",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#8ecdf7",
    highlightText: INK,
  },
  {
    name: "Violet",
    swatch: "#bfa6f5",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#bfa6f5",
    highlightText: INK,
  },
  {
    name: "Rose",
    swatch: "#f5a9cb",
    paint: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#f5a9cb",
    highlightText: INK,
  },
];

/** Ember: a dark gradient poster, one light for each mood. */
const emberVariants: Variant[] = [
  {
    name: "Wine",
    swatch: grad("#9c1f1f", "#6b1f4a", "#2a0a10"),
    paint: mesh("#2a0a10", [
      { x: 0.85, y: 0.05, r: 0.85, color: "#9c1f1f" },
      { x: 0.1, y: 0.9, r: 0.9, color: "#5e1440" },
    ]),
    text: "#f3ece0",
  },
  {
    name: "Amber",
    swatch: grad("#d9822b", "#7a3a12", "#1a0f05"),
    paint: mesh("#1a0f05", [
      { x: 0.8, y: 0.1, r: 0.85, color: "#d9822b" },
      { x: 0.15, y: 0.85, r: 0.9, color: "#7a3a12" },
    ]),
    text: "#f7efe2",
  },
  {
    name: "Forest",
    swatch: grad("#2f8a55", "#0f5a45", "#04140e"),
    paint: mesh("#04140e", [
      { x: 0.8, y: 0.1, r: 0.85, color: "#2f8a55" },
      { x: 0.15, y: 0.9, r: 0.9, color: "#0f5a45" },
    ]),
    text: "#eaf5ee",
  },
  {
    name: "Ocean",
    swatch: grad("#2a8fb8", "#1f3f7a", "#050f1c"),
    paint: mesh("#050f1c", [
      { x: 0.85, y: 0.1, r: 0.85, color: "#2a8fb8" },
      { x: 0.1, y: 0.9, r: 0.9, color: "#1f3f7a" },
    ]),
    text: "#e6f2f7",
  },
  {
    name: "Indigo",
    swatch: grad("#6a5ae0", "#2f2478", "#0a0818"),
    paint: mesh("#0a0818", [
      { x: 0.8, y: 0.12, r: 0.85, color: "#6a5ae0" },
      { x: 0.15, y: 0.88, r: 0.9, color: "#2f2478" },
    ]),
    text: "#eceaf7",
  },
  {
    name: "Noir",
    swatch: grad("#3a3a3a", "#151515", "#050505"),
    paint: mesh("#050505", [
      { x: 0.8, y: 0.15, r: 0.8, color: "#343434" },
      { x: 0.2, y: 0.9, r: 0.9, color: "#1a1a1a" },
    ]),
    text: "#efece6",
  },
];

/** Mesh: a bright wash across the card. */
const meshVariants: Variant[] = [
  {
    name: "Grove",
    swatch: grad("#7ed957", "#2fa8c9", "#0a1a12"),
    paint: mesh("#07120d", [
      { x: 0.85, y: 0.08, r: 0.9, color: "#7ed957" },
      { x: 0.12, y: 0.92, r: 0.95, color: "#2fa8c9" },
    ]),
    text: "#f2f7f4",
  },
  {
    name: "Blush",
    swatch: grad("#ff7a9c", "#c9407a", "#1a0810"),
    paint: mesh("#160610", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#ff7a9c" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#c9407a" },
    ]),
    text: "#fdeef4",
  },
  {
    name: "Cobalt",
    swatch: grad("#4a8cf7", "#2b3ea8", "#050a1a"),
    paint: mesh("#050a1a", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#4a8cf7" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#2b3ea8" },
    ]),
    text: "#eaf1fd",
  },
  {
    name: "Orchid",
    swatch: grad("#c86bf0", "#6a2bb0", "#0c0618"),
    paint: mesh("#0c0618", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#c86bf0" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#6a2bb0" },
    ]),
    text: "#f4ecfb",
  },
  {
    name: "Sunset",
    swatch: grad("#ff9a4a", "#e0432f", "#1a0a06"),
    paint: mesh("#1a0a06", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#ff9a4a" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#e0432f" },
    ]),
    text: "#fdf0e8",
  },
];

/** Bold: a shout, in one ink on paper. */
const CREAM = "#f0ece2";
const boldVariants: Variant[] = [
  { name: "Ink", swatch: dot("#2b3ea8", CREAM), paint: solid(CREAM), text: "#2b3ea8" },
  { name: "Crimson", swatch: dot("#c0392b", CREAM), paint: solid(CREAM), text: "#c0392b" },
  { name: "Plain", swatch: dot(INK, CREAM), paint: solid(CREAM), text: INK },
  { name: "Forest", swatch: dot("#1f7a4d", CREAM), paint: solid(CREAM), text: "#1f7a4d" },
  {
    name: "Cobalt",
    swatch: dot("#ffffff", "#2b5cf6"),
    paint: solid("#2b5cf6"),
    text: "#ffffff",
  },
];

export const THEMES: ShareTheme[] = [
  {
    id: "marker",
    name: "Marker",
    style: "marker",
    footer: "left",
    font: "serif",
    size: "large",
    align: "left",
    position: "middle",
    showTitle: true,
    showPublication: true,
    variants: markerVariants,
  },
  {
    id: "ember",
    name: "Ember",
    style: "plain",
    footer: "left",
    font: "serif",
    size: "large",
    align: "left",
    position: "middle",
    showTitle: true,
    showPublication: true,
    variants: emberVariants,
  },
  {
    id: "mesh",
    name: "Mesh",
    style: "plain",
    footer: "center",
    font: "serif",
    size: "large",
    align: "center",
    position: "middle",
    showTitle: true,
    showPublication: true,
    variants: meshVariants,
  },
  {
    id: "bold",
    name: "Bold",
    style: "bold",
    footer: "left",
    font: "sans",
    size: "large",
    align: "left",
    position: "middle",
    showTitle: true,
    showPublication: true,
    uppercaseQuote: true,
    uppercaseTitle: true,
    variants: boldVariants,
  },
];

export const themeById = (id: string): ShareTheme =>
  THEMES.find((theme) => theme.id === id) ?? THEMES[0];

/* ------------------------------------------------------------------ text */

/** The site's own sans stack, read off the body so canvas matches the page. */
function sansStack(): string {
  if (typeof document === "undefined") return "system-ui, sans-serif";
  const family = getComputedStyle(document.body).fontFamily;
  return family || "system-ui, sans-serif";
}

export function fontStack(choice: FontChoice): string {
  if (choice === "sans") return sansStack();
  if (choice === "mono")
    return "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
  // The excerpt face.
  return "'New York', ui-serif, Georgia, 'Times New Roman', serif";
}

function fontString(
  size: number,
  family: string,
  weight = 400,
  italic = false
): string {
  return `${italic ? "italic " : ""}${weight} ${size}px ${family}`;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
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

/* --------------------------------------------------------------- painting */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
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

function paintBackground(
  ctx: CanvasRenderingContext2D,
  paint: Paint,
  w: number,
  h: number
) {
  ctx.fillStyle = paint.kind === "solid" ? paint.color : paint.base;
  ctx.fillRect(0, 0, w, h);
  if (paint.kind !== "mesh") return;
  for (const blob of paint.blobs) {
    const gradient = ctx.createRadialGradient(
      blob.x * w,
      blob.y * h,
      0,
      blob.x * w,
      blob.y * h,
      blob.r * w
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
  paint: Paint;
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

export type Overrides = Partial<
  Omit<CardOptions, "quote" | "title" | "publication" | "context">
>;

/** A variant's colours, with the Customize panel's overrides on top. */
export function resolveOptions(
  theme: ShareTheme,
  variant: Variant,
  overrides: Overrides,
  content: Pick<CardOptions, "quote" | "title" | "publication" | "context">
): CardOptions {
  const base: Omit<CardOptions, "quote" | "title" | "publication" | "context"> = {
    paint: variant.paint,
    background: variant.paint.kind === "solid" ? variant.paint.color : variant.paint.base,
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
    merged.paint = solid(overrides.background);
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
  options: CardOptions
) {
  const dims = MODES.find((m) => m.id === mode) ?? MODES[0];
  const w = dims.width;
  const h = dims.height;
  const family = fontStack(options.font);
  const sans = sansStack();

  ctx.save();
  ctx.clearRect(0, 0, w, h);
  paintBackground(ctx, options.paint, w, h);

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
    theme.footer === "center" || !options.showTitle
      ? maxWidth
      : maxWidth - markSize - markGap;

  ctx.font = fontString(titleSize, sans, 600);
  const titleLines = options.showTitle
    ? wrapText(
        ctx,
        theme.uppercaseTitle ? options.title.toUpperCase() : options.title,
        footerWidth
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
  const quoteInk =
    theme.style === "marker" ? options.highlightText : options.text;
  let fontSize = Math.round(w * base);
  let lines: { text: string; width: number }[] = [];
  let lineHeight = fontSize * 1.22;
  for (let guard = 0; guard < 12; guard++) {
    ctx.font = fontString(
      fontSize,
      family,
      theme.style === "bold" || options.font === "sans" ? 700 : 400,
      theme.italicQuote
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
      const x =
        options.align === "center" ? (w - line.width) / 2 - hpad : pad - hpad;
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
    theme.italicQuote
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
      Math.max(1, Math.round(h * 0.0012))
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
      options
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
  options: CardOptions
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
  options: CardOptions
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
