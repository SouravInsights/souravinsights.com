import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * The cut-out stickers of me, used once, in the hero.
 *
 * A plain array rather than a wall of JSX: dropping a new sticker is one line
 * here and nothing else. `src` points at the exported PNG in `/public/avatars`
 * and `tilt` is the resting angle, in degrees. Keep the angle within ±8 — past
 * that the row reads as broken layout instead of stickers.
 */
const STICKERS = [
  { src: "/avatars/peace.png", alt: "Me throwing a peace sign", tilt: -7 },
  { src: "/avatars/thinking.png", alt: "Me with a finger to my temple", tilt: 5 },
  { src: "/avatars/messy-hair.png", alt: "Me with messy hair and clear glasses", tilt: -4 },
  { src: "/avatars/hat-sunglasses.png", alt: "Me in a bucket hat and sunglasses", tilt: 6 },
  { src: "/avatars/glasses-side.png", alt: "Me in glasses, side profile", tilt: -5 },
  { src: "/avatars/close-up.png", alt: "Me in black glasses, close up", tilt: 3 },
  { src: "/avatars/plaid-sunglasses.png", alt: "Me in round sunglasses and a plaid shirt", tilt: -6 },
];

/**
 * A small, tilted row of stickers. Sized to sit inline with text so it can live
 * in the about copy without becoming its own block. Hovering a sticker lifts
 * and straightens it — the one bit of play, and the only interaction.
 */
export function AvatarStickers() {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {STICKERS.map((sticker) => (
        <div
          key={sticker.src}
          style={{ "--tilt": `${sticker.tilt}deg` } as CSSProperties}
          className="rotate-[var(--tilt)] transition-transform duration-200 ease-out hover:z-10 hover:-translate-y-1 hover:rotate-0 hover:scale-110"
        >
          <Image
            src={sticker.src}
            alt={sticker.alt}
            width={64}
            height={64}
            className="h-12 w-12 object-contain sm:h-14 sm:w-14"
          />
        </div>
      ))}
    </div>
  );
}
