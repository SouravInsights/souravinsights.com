"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useAnimationControls,
  useReducedMotion,
} from "framer-motion";
import { Heart } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { useTheme } from "@/context/ThemeContext";
import { useHaptics } from "@/hooks/useHaptics";
import {
  LikeBurst,
  LOVE_RAMP_DARK,
  LOVE_RAMP_LIGHT,
  useLikeBurst,
} from "@/components/like-burst";

/** Press timing, matching the blog's 3D button: quick squash, easy release. */
const PRESS = 0.14;
const RELEASE = 0.34;

/**
 * Digits roll up like an odometer. Each digit gets its own fixed-width cell
 * (`tabular-nums` + `1ch`) so a value change never reflows the pill — only the
 * glyph moves, the geometry stays put.
 */
function RollingNumber({ value }: { value: number }) {
  const reduceMotion = useReducedMotion();
  const digits = value.toString().split("");

  return (
    <span className="inline-flex items-center tabular-nums">
      {digits.map((digit, index) => (
        <span
          // Keyed from the right so the ones column keeps its identity as the
          // number grows (9 → 10 only adds a cell on the left).
          key={digits.length - index}
          className="relative inline-block h-[1em] w-[1ch] overflow-hidden"
        >
          {reduceMotion ? (
            <span className="absolute inset-0 flex items-center justify-center">
              {digit}
            </span>
          ) : (
            <AnimatePresence initial={false}>
              <motion.span
                key={digit}
                initial={{ y: "100%" }}
                animate={{ y: "0%" }}
                exit={{ y: "-100%" }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {digit}
              </motion.span>
            </AnimatePresence>
          )}
        </span>
      ))}
    </span>
  );
}

/**
 * A compact take on the blog's 3D like button: the heart squashes under the
 * press and springs back, the shared burst arcs out, and the count rolls.
 * Reduced-motion aware.
 */
export function LikeButton({ linkId }: { linkId: string }) {
  const { totalLikes, userLikes, isMaxed, addLike } = useLikes({
    id: linkId,
    endpoint: "/api/insights/likes",
    param: "linkId",
    max: 10,
  });

  const { isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();
  const haptics = useHaptics();
  const controls = useAnimationControls();
  const [pressed, setPressed] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const ramp = isDarkMode ? LOVE_RAMP_DARK : LOVE_RAMP_LIGHT;
  const { burst, particles } = useLikeBurst({ ramp, scale: 0.7 });

  const liked = userLikes > 0;

  const schedule = useCallback((fn: () => void, ms: number) => {
    const timeout = setTimeout(fn, ms);
    timeoutsRef.current.push(timeout);
  }, []);

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const handleClick = () => {
    if (isMaxed) {
      haptics.warning();
      // Bump the pill to signal the cap has been reached.
      if (!reduceMotion) {
        controls.start({
          x: [0, -3, 3, -2, 2, 0],
          transition: { duration: 0.4, ease: "easeOut" },
        });
      }
      return;
    }

    haptics.press();
    setPressed(true);
    schedule(() => setPressed(false), PRESS * 1000);

    if (!reduceMotion) {
      burst();
      controls.start({
        scale: [1, 1.08, 1],
        transition: { duration: 0.3, ease: "easeOut" },
      });
    }

    addLike();
  };

  // Squash-and-stretch only reads as considered when it's subtle.
  const squash = pressed
    ? { scaleX: 1.05, scaleY: 0.95 }
    : { scaleX: 1, scaleY: 1 };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={liked}
      aria-label={liked ? "Liked" : "Like"}
      title={isMaxed ? "You've reached the 10-like limit" : undefined}
      className={`relative inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-none transition-colors after:absolute after:-inset-2 after:content-[''] ${
        liked
          ? "bg-rose-600/10 text-rose-600"
          : "bg-foreground/5 text-faint-foreground hover:bg-rose-600/10 hover:text-rose-600"
      }`}
    >
      <motion.span
        animate={controls}
        className="relative flex transform-gpu items-center"
      >
        <motion.span
          animate={squash}
          transition={{ duration: pressed ? PRESS : RELEASE, ease: "easeOut" }}
          className="relative flex transform-gpu items-center"
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={liked ? "currentColor" : "none"}
          />
          {!reduceMotion && <LikeBurst particles={particles} />}
        </motion.span>
      </motion.span>

      <RollingNumber value={totalLikes} />
    </button>
  );
}