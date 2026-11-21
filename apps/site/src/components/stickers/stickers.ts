/**
 * The single source of the sticker set. Every view — the deck, the row, the
 * shuffle — reads from here, so adding a sticker is one line and the views can
 * never drift apart.
 *
 * `tilt` is the resting angle, in degrees, used by the fanned layouts. Keep it
 * within ±8 — past that a row reads as broken layout instead of stickers.
 *
 * `aspect` is content width / content height, measured after the transparent
 * margin is trimmed off the PNG (the served files are already trimmed). The
 * deck needs it to give each sticker a box that matches its artwork, so the row
 * can be laid out by content instead of by file. Regenerate it if a sticker is
 * re-exported — it is the alpha bounding box of the trimmed image.
 */
export interface Sticker {
  src: string;
  alt: string;
  tilt: number;
  aspect: number;
}

export const STICKERS: Sticker[] = [
  { src: "/avatars/peace.png", alt: "Me throwing a peace sign", tilt: -7, aspect: 0.9738 },
  { src: "/avatars/thinking.png", alt: "Me with a finger to my temple", tilt: 5, aspect: 0.7148 },
  {
    src: "/avatars/messy-hair.png",
    alt: "Me with messy hair and clear glasses",
    tilt: -4,
    aspect: 0.7854,
  },
  {
    src: "/avatars/hat-sunglasses.png",
    alt: "Me in a bucket hat and sunglasses",
    tilt: 6,
    aspect: 0.8731,
  },
  { src: "/avatars/glasses-side.png", alt: "Me in glasses, side profile", tilt: -5, aspect: 0.7698 },
  { src: "/avatars/close-up.png", alt: "Me in black glasses, close up", tilt: 3, aspect: 0.6687 },
];
