"use client";

import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import posthog from "posthog-js";
import Scritto from "@scritto/react";
import { usePostLikes } from "@/hooks/usePostLikes";
import { useTheme } from "@/context/ThemeContext";
import { useFeedback } from "@/hooks/useFeedback";
import {
  LikeBurst,
  LOVE_RAMP_DARK,
  LOVE_RAMP_LIGHT,
  rampColor,
  useLikeBurst,
} from "@/components/like-burst";

/* ─────────────────────────────────────────────────────────────────────────
 * ANIMATION STORYBOARD
 *
 *   Motion here is intentionally quiet: short, eased, and never bouncy.
 *   Springs carry no more than a whisper of overshoot, so the heart settles
 *   instead of wobbling.
 *
 *    0ms       heart compresses slightly under the finger (scaleY 0.95)
 *    140ms     it eases back to rest
 *    0–110ms   a few beads lift, arc, and fall back under gravity
 *    60ms      the liquid surface eases to its new level (interruptible)
 *    90ms      the count steps up and a "+1" drifts away
 * ───────────────────────────────────────────────────────────────────────── */

const TIMING = {
  press: 0.14, // heart compresses under the finger
  release: 0.34, // and eases back to rest
  count: 0.3, // count step
} as const;

const MAX_USER_LIKES = 10;
const VIEWBOX = 60;

/** Classic symmetric heart, drawn once and reused for every layer. */
const HEART_PATH =
  "M30 53.5C30 53.5 5.5 38.5 5.5 21.5C5.5 13.5 12 7 20 7C25.5 7 28.8 10 30 13.5C31.2 10 34.5 7 40 7C48 7 54.5 13.5 54.5 21.5C54.5 38.5 30 53.5 30 53.5Z";

/** Liquid fills from just below the heart (empty) up to the crown (full). */
const LIQUID_EMPTY_Y = 60;
const LIQUID_FULL_Y = 3;

/** Face ink is a deep plum that belongs to the same family as the fill. */
const FACE_INK = { light: "#4c0519", dark: "#ffffff" } as const;

/**
 * A liquid surface: a wavy top edge that runs wider than the heart, closed
 * into a deep body so it can be translated to any fill height.
 */
function buildWavePath(amplitude: number, phase: number): string {
  const left = -30;
  const right = 90;
  const step = 20;
  let d = `M ${left} 0`;
  for (let x = left; x < right; x += step) {
    const dir = Math.sin(phase + (x - left) / step * Math.PI) >= 0 ? 1 : -1;
    d += ` Q ${x + step / 2} ${dir * amplitude} ${x + step} 0`;
  }
  return `${d} L ${right} 80 L ${left} 80 Z`;
}

/* ── the face ──────────────────────────────────────────────────────────── */

function HeartFace({
  stage,
  ink,
  glint,
  uid,
}: {
  stage: number;
  ink: string;
  glint: string;
  uid: string;
}) {
  const closedEyes = stage >= 3;
  const showBlush = stage >= 2;

  return (
    <g>
      {/* eyes — open with a catchlight, or contented arcs once delighted */}
      {closedEyes ? (
        <>
          <path d="M18.9 26.2Q22 22 25.1 26.2" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
          <path d="M34.9 26.2Q38 22 41.1 26.2" fill="none" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="22" cy="25" r="2.25" fill={ink} />
          <circle cx="38" cy="25" r="2.25" fill={ink} />
          <circle cx="21.1" cy="24.1" r="0.8" fill={glint} opacity="0.9" />
          <circle cx="37.1" cy="24.1" r="0.8" fill={glint} opacity="0.9" />
        </>
      )}

      {/* blush — a soft radial wash, not a flat chip */}
      {showBlush && (
        <>
          <ellipse cx="15.5" cy="31.6" rx="3.6" ry="2.1" fill={`url(#blush-${uid})`} />
          <ellipse cx="44.5" cy="31.6" rx="3.6" ry="2.1" fill={`url(#blush-${uid})`} />
        </>
      )}

      {/* mouth — one continuous stroke, growing warmer as it fills */}
      {stage === 0 && (
        <path d="M26.8 34.6Q30 35.4 33.2 34.6" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" />
      )}
      {stage === 1 && (
        <path d="M25.6 33.1Q30 36.6 34.4 33.1" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" />
      )}
      {stage === 2 && (
        <path d="M24.6 32.4Q30 37.8 35.4 32.4" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" />
      )}
      {stage >= 3 && <path d="M24 32Q30 39.6 36 32Q30 34.3 24 32Z" fill={ink} />}

      {/* one quiet sparkle at the crown */}
      {stage >= 4 && (
        <path
          d="M46.5 13.2c.18 1.7 1.32 2.84 3 3-1.68.16-2.82 1.3-3 3-.18-1.7-1.32-2.84-3-3 1.68-.16 2.82-1.3 3-3Z"
          fill="#ffffff"
          opacity="0.85"
        />
      )}
    </g>
  );
}

/* ── component ─────────────────────────────────────────────────────────── */

interface ThreeDLikeButtonProps {
  slug: string;
  /** Tighter footprint for compact bars (e.g. the mobile article toolbar). */
  compact?: boolean;
}

const ThreeDLikeButton = ({ slug, compact = false }: ThreeDLikeButtonProps) => {
  const { totalLikes, userLikes, addLike, isLoading } = usePostLikes({
    slug,
    initialTotalLikes: 0,
    initialUserLikes: 0,
  });

  const { isDarkMode } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [pressed, setPressed] = useState(false);
  const [plusKey, setPlusKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const countControls = useAnimationControls();

  const waveFront = useMemo(() => buildWavePath(3, 0), []);
  const waveBack = useMemo(() => buildWavePath(2.6, Math.PI), []);

  const ramp = isDarkMode ? LOVE_RAMP_DARK : LOVE_RAMP_LIGHT;
  const { burst, particles } = useLikeBurst({ ramp, scale: compact ? 0.6 : 1 });
  const ink = isDarkMode ? FACE_INK.dark : FACE_INK.light;
  // The eye glint contrasts with the ink, not the page, so it survives a
  // theme flip.
  const glint = isDarkMode ? "#2a0a14" : "#ffffff";

  const fillPercent = Math.min(1, userLikes / MAX_USER_LIKES);
  const liquidY =
    LIQUID_EMPTY_Y - fillPercent * (LIQUID_EMPTY_Y - LIQUID_FULL_Y);
  const liquidColor = rampColor(fillPercent, ramp);
  const stage = userLikes === 0 ? 0 : userLikes >= MAX_USER_LIKES ? 4 : Math.min(3, Math.ceil(fillPercent * 4));

  const isMaxed = userLikes >= MAX_USER_LIKES;

  // Sound rises in pitch with each like but eases off in volume so it never
  // turns harsh as the pitch climbs.
  const feedback = useFeedback();

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }, []);

  // Clear any trailing timers when the button unmounts.
  React.useEffect(
    () => () => timeoutsRef.current.forEach(clearTimeout),
    []
  );

  const handleLike = useCallback(() => {
    if (isMaxed) {
      feedback.warning();
      return;
    }

    setPressed(true);
    // Each like pops a little higher; the last one resolves into a chime.
    if (userLikes === MAX_USER_LIKES - 1) {
      feedback.success();
    } else {
      feedback.like(0.75 + userLikes * 0.08);
    }
    schedule(() => setPressed(false), TIMING.press * 1000);

    posthog.capture("blog_post_liked", {
      slug,
      current_likes: userLikes,
      total_likes: totalLikes,
      max_reached: userLikes === MAX_USER_LIKES - 1,
    });

    addLike();

    if (!prefersReducedMotion) {
      burst();
      countControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: TIMING.count, ease: "easeOut" },
      });
    }

    setPlusKey((k) => k + 1);
    schedule(() => setPlusKey(0), TIMING.count * 1000 + 400);

  }, [
    isMaxed,
    slug,
    userLikes,
    totalLikes,
    addLike,
    burst,
    prefersReducedMotion,
    countControls,
    schedule,
    feedback,
  ]);

  React.useEffect(() => {
    if (userLikes === MAX_USER_LIKES) {
      posthog.capture("blog_post_max_likes_reached", { slug, totalLikes });
    }
  }, [userLikes, totalLikes, slug]);

  // Heart press: a small, quick compression that eases back with almost no
  // overshoot. Squash-and-stretch only reads as considered when it's subtle.
  const squash = pressed
    ? { scaleX: 1.05, scaleY: 0.95 }
    : { scaleX: 1, scaleY: 1 };
  const squashTransition = pressed
    ? { type: "spring" as const, duration: TIMING.press, bounce: 0 }
    : { type: "spring" as const, duration: TIMING.release, bounce: 0.12 };

  return (
    <div className={`flex items-center ${compact ? "gap-2" : "gap-3"}`}>
      <div className="relative">
        {/* Particle stage, anchored to the heart's centre */}
        {!prefersReducedMotion && <LikeBurst particles={particles} />}

        <motion.button
          type="button"
          onClick={handleLike}
          className="group relative block transform-gpu rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          whileHover={prefersReducedMotion ? undefined : { scale: 1.02 }}
          aria-label={
            isMaxed
              ? "You have reached the maximum likes for this post"
              : "Like this post"
          }
          aria-pressed={userLikes > 0}
          aria-disabled={isMaxed || isLoading}
        >
          <motion.div animate={squash} transition={squashTransition} className="relative transform-gpu">
            {/* soft contact shadow that lifts on hover */}
            <div className="pointer-events-none absolute inset-x-1 -bottom-0.5 h-2 rounded-full bg-rose-600/25 opacity-60 blur-md transition-opacity duration-300 group-hover:opacity-100" />

            <svg
              viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
              className={
                compact
                  ? "relative h-8 w-8"
                  : "relative h-12 w-12 md:h-14 md:w-14"
              }
              aria-hidden
            >
              <defs>
                <clipPath id={`heart-${uid}`}>
                  <path d={HEART_PATH} />
                </clipPath>
                <radialGradient id={`gloss-${uid}`} cx="34%" cy="24%" r="62%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
                  <stop offset="55%" stopColor="#fff" stopOpacity="0.08" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <linearGradient id={`rim-${uid}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.65" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
                </linearGradient>
                <radialGradient id={`blush-${uid}`} cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fb7185" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* base well */}
              <path
                d={HEART_PATH}
                className="fill-gray-200/80 transition-colors duration-300 dark:fill-white/[0.07]"
              />

              {/* liquid, clipped to the heart */}
              <g clipPath={`url(#heart-${uid})`}>
                <motion.g
                  initial={false}
                  animate={{ y: liquidY }}
                  transition={
                    prefersReducedMotion
                      ? { duration: 0 }
                      : { type: "spring", duration: 0.7, bounce: 0.15 }
                  }
                >
                  {/* slosh: two out-of-phase waves give the surface depth */}
                  <motion.g
                    animate={prefersReducedMotion ? undefined : { x: [-6, 6] }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      repeatType: "mirror",
                      ease: "easeInOut",
                    }}
                  >
                    <path d={waveBack} fill="#ffffff" opacity="0.32" />
                    <path d={waveFront} fill={liquidColor} />
                  </motion.g>
                </motion.g>

                {/* glassy highlight over the whole heart */}
                <path d={HEART_PATH} fill={`url(#gloss-${uid})`} />
              </g>

              {/* rim: light from above, shade below */}
              <path d={HEART_PATH} fill={`url(#rim-${uid})`} opacity="0.5" />
              <path
                d={HEART_PATH}
                fill="none"
                className="stroke-black/10 dark:stroke-white/15"
                strokeWidth="1.25"
              />

              {/* specular kiss on the shoulder */}
              <path
                d="M17.5 12.5C13.5 14.5 10.5 18 10 22"
                className="stroke-white/70"
                strokeWidth="1.6"
                strokeLinecap="round"
                fill="none"
              />

              <HeartFace stage={stage} ink={ink} glint={glint} uid={uid} />
            </svg>
          </motion.div>
        </motion.button>
      </div>

      {/* Live count + floating "+1" */}
      <div className="relative">
        <motion.div
          animate={countControls}
          className={`font-mono tabular-nums tracking-tight text-gray-700 dark:text-gray-200 ${
            compact ? "text-base" : "text-xl md:text-2xl"
          }`}
          aria-live="polite"
          aria-atomic="true"
        >
          <Scritto value={totalLikes.toLocaleString()} />
          <span className="sr-only"> likes</span>
        </motion.div>

        <AnimatePresence>
          {plusKey > 0 && (
            <motion.span
              key={plusKey}
              className={`pointer-events-none absolute -top-1 text-sm font-semibold text-rose-600 dark:text-rose-300 ${
                // In the compact mobile bar the count is the right-most element,
                // so a right-anchored "+1" stays inside the viewport.
                compact ? "right-0" : "left-full ml-1"
              }`}
              initial={{ opacity: 0, y: 2 }}
              animate={{ opacity: [0, 1, 1, 0], y: -11 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut", times: [0, 0.15, 0.6, 1] }}
              aria-hidden
            >
              +1
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ThreeDLikeButton;