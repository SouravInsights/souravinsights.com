/*
 * The four quote designs and their colour variants.
 */

import type { AlignChoice, FontChoice, PositionChoice, SizeChoice } from "./presets";

export interface MeshBlob {
  x: number;
  y: number;
  r: number;
  color: string;
}

export type Fill =
  | { kind: "solid"; color: string }
  | { kind: "mesh"; base: string; blobs: MeshBlob[] };

export const solid = (color: string): Fill => ({ kind: "solid", color });
export const mesh = (base: string, blobs: MeshBlob[]): Fill => ({ kind: "mesh", base, blobs });
/** a gradient's circular control */
export const grad = (...colors: string[]) => `linear-gradient(135deg, ${colors.join(", ")})`;
/** a paper control with an ink dot in its middle */
export const dot = (accent: string, base: string) =>
  `radial-gradient(circle, ${accent} 0 21%, ${base} 22%)`;

export interface Variant {
  name: string;
  /** CSS fill for the circular control (a colour or a gradient) */
  swatch: string;
  fill: Fill;
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
    fill: solid(PAPER),
    text: INK,
    highlight: "#f4e58a",
    highlightText: INK,
  },
  {
    name: "Tangerine",
    swatch: "#f5a35c",
    fill: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#f5a35c",
    highlightText: INK,
  },
  {
    name: "Sun",
    swatch: "#f2c230",
    fill: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#f2c230",
    highlightText: INK,
  },
  {
    name: "Mint",
    swatch: "#8fe0b0",
    fill: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#8fe0b0",
    highlightText: INK,
  },
  {
    name: "Sky",
    swatch: "#8ecdf7",
    fill: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#8ecdf7",
    highlightText: INK,
  },
  {
    name: "Violet",
    swatch: "#bfa6f5",
    fill: solid(NIGHT),
    text: NIGHT_TEXT,
    highlight: "#bfa6f5",
    highlightText: INK,
  },
  {
    name: "Rose",
    swatch: "#f5a9cb",
    fill: solid(NIGHT),
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
    fill: mesh("#2a0a10", [
      { x: 0.85, y: 0.05, r: 0.85, color: "#9c1f1f" },
      { x: 0.1, y: 0.9, r: 0.9, color: "#5e1440" },
    ]),
    text: "#f3ece0",
  },
  {
    name: "Amber",
    swatch: grad("#d9822b", "#7a3a12", "#1a0f05"),
    fill: mesh("#1a0f05", [
      { x: 0.8, y: 0.1, r: 0.85, color: "#d9822b" },
      { x: 0.15, y: 0.85, r: 0.9, color: "#7a3a12" },
    ]),
    text: "#f7efe2",
  },
  {
    name: "Forest",
    swatch: grad("#2f8a55", "#0f5a45", "#04140e"),
    fill: mesh("#04140e", [
      { x: 0.8, y: 0.1, r: 0.85, color: "#2f8a55" },
      { x: 0.15, y: 0.9, r: 0.9, color: "#0f5a45" },
    ]),
    text: "#eaf5ee",
  },
  {
    name: "Ocean",
    swatch: grad("#2a8fb8", "#1f3f7a", "#050f1c"),
    fill: mesh("#050f1c", [
      { x: 0.85, y: 0.1, r: 0.85, color: "#2a8fb8" },
      { x: 0.1, y: 0.9, r: 0.9, color: "#1f3f7a" },
    ]),
    text: "#e6f2f7",
  },
  {
    name: "Indigo",
    swatch: grad("#6a5ae0", "#2f2478", "#0a0818"),
    fill: mesh("#0a0818", [
      { x: 0.8, y: 0.12, r: 0.85, color: "#6a5ae0" },
      { x: 0.15, y: 0.88, r: 0.9, color: "#2f2478" },
    ]),
    text: "#eceaf7",
  },
  {
    name: "Noir",
    swatch: grad("#3a3a3a", "#151515", "#050505"),
    fill: mesh("#050505", [
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
    fill: mesh("#07120d", [
      { x: 0.85, y: 0.08, r: 0.9, color: "#7ed957" },
      { x: 0.12, y: 0.92, r: 0.95, color: "#2fa8c9" },
    ]),
    text: "#f2f7f4",
  },
  {
    name: "Blush",
    swatch: grad("#ff7a9c", "#c9407a", "#1a0810"),
    fill: mesh("#160610", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#ff7a9c" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#c9407a" },
    ]),
    text: "#fdeef4",
  },
  {
    name: "Cobalt",
    swatch: grad("#4a8cf7", "#2b3ea8", "#050a1a"),
    fill: mesh("#050a1a", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#4a8cf7" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#2b3ea8" },
    ]),
    text: "#eaf1fd",
  },
  {
    name: "Orchid",
    swatch: grad("#c86bf0", "#6a2bb0", "#0c0618"),
    fill: mesh("#0c0618", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#c86bf0" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#6a2bb0" },
    ]),
    text: "#f4ecfb",
  },
  {
    name: "Sunset",
    swatch: grad("#ff9a4a", "#e0432f", "#1a0a06"),
    fill: mesh("#1a0a06", [
      { x: 0.85, y: 0.1, r: 0.9, color: "#ff9a4a" },
      { x: 0.12, y: 0.9, r: 0.95, color: "#e0432f" },
    ]),
    text: "#fdf0e8",
  },
];

/** Bold: a shout, in one ink on paper. */
const CREAM = "#f0ece2";
const boldVariants: Variant[] = [
  { name: "Ink", swatch: dot("#2b3ea8", CREAM), fill: solid(CREAM), text: "#2b3ea8" },
  { name: "Crimson", swatch: dot("#c0392b", CREAM), fill: solid(CREAM), text: "#c0392b" },
  { name: "Plain", swatch: dot(INK, CREAM), fill: solid(CREAM), text: INK },
  { name: "Forest", swatch: dot("#1f7a4d", CREAM), fill: solid(CREAM), text: "#1f7a4d" },
  {
    name: "Cobalt",
    swatch: dot("#ffffff", "#2b5cf6"),
    fill: solid("#2b5cf6"),
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
