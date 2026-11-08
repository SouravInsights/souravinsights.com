/**
 * The single source of the sticker set. Every view — the row, the shuffle, the
 * deck variants — reads from here, so adding a sticker is one line and the
 * views can never drift apart.
 *
 * `tilt` is the resting angle, in degrees, used by the fanned layouts. Keep it
 * within ±8 — past that a row reads as broken layout instead of stickers.
 */
export interface Sticker {
  src: string;
  alt: string;
  tilt: number;
}

export const STICKERS: Sticker[] = [
  { src: "/avatars/peace.png", alt: "Me throwing a peace sign", tilt: -7 },
  { src: "/avatars/thinking.png", alt: "Me with a finger to my temple", tilt: 5 },
  {
    src: "/avatars/messy-hair.png",
    alt: "Me with messy hair and clear glasses",
    tilt: -4,
  },
  {
    src: "/avatars/hat-sunglasses.png",
    alt: "Me in a bucket hat and sunglasses",
    tilt: 6,
  },
  { src: "/avatars/glasses-side.png", alt: "Me in glasses, side profile", tilt: -5 },
  { src: "/avatars/close-up.png", alt: "Me in black glasses, close up", tilt: 3 },
];
