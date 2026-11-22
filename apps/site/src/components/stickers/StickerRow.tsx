import Image from "next/image";
import type { CSSProperties } from "react";
import { STICKERS } from "@/components/stickers/stickers";

/**
 * A small, tilted row of every sticker. Sized to sit inline with text so it can
 * live in the about copy without becoming its own block. Hovering a sticker
 * lifts and straightens it — the one bit of play, and the only interaction.
 *
 * Not currently mounted; kept as an alternative to `StickerDeck`.
 */
export function StickerRow() {
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
