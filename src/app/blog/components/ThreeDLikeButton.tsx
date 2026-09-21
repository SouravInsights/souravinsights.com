"use client";

import React, { useCallback, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from "framer-motion";
import useSound from "use-sound";
import posthog from "posthog-js";
import { usePostLikes } from "@/hooks/usePostLikes";
import { useTheme } from "@/context/ThemeContext";

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
  burst: 0.9, // particle flight
  burstStagger: 0.022, // per-particle launch offset
  floater: 1.7, // the slow rising heart
  count: 0.3, // count step
  cleanup: 1800, // particle garbage collection
} as const;

const MAX_USER_LIKES = 10;
const VIEWBOX = 60;

/** Classic symmetric heart, drawn once and reused for every layer. */
const HEART_PATH =
  "M30 53.5C30 53.5 5.5 38.5 5.5 21.5C5.5 13.5 12 7 20 7C25.5 7 28.8 10 30 13.5C31.2 10 34.5 7 40 7C48 7 54.5 13.5 54.5 21.5C54.5 38.5 30 53.5 30 53.5Z";

/** Liquid fills from just below the heart (empty) up to the crown (full). */
const LIQUID_EMPTY_Y = 60;
const LIQUID_FULL_Y = 3;

/**
 * Fill ramps. One hue family — rose deepening into a rich red — sampled
 * continuously. Two tunings keep the face legible on either page background:
 * light-mode fills stay pale enough for dark ink, dark-mode fills sit a shade
 * deeper so white ink holds contrast.
 */
const LOVE_RAMP_LIGHT = ["#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48"];
const LOVE_RAMP_DARK = ["#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239"];

/** Face ink is a deep plum that belongs to the same family as the fill. */
const FACE_INK = { light: "#4c0519", dark: "#ffffff" } as const;

/** Payload accents — kept within the rose family so nothing clashes. */
const SPARK_COLORS = ["#ffffff", "#ffe4e6", "#fecdd3"];

/* ── color helpers ─────────────────────────────────────────────────────── */

function hexToRgb(hex: string): [number, number, number] {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

const srgbToLinear = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const linearToSrgb = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.max(0, Math.min(1, v)) * 255);
};

/** Convert an sRGB hex into OKLab, a perceptually uniform space. */
function hexToOklab(hex: string) {
  const [r, g, b] = hexToRgb(hex).map(srgbToLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

function oklabToRgb({ L, a, b }: { L: number; a: number; b: number }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return `rgb(${linearToSrgb(r)} ${linearToSrgb(g)} ${linearToSrgb(bl)})`;
}

/** Interpolate in OKLab so mid-tones stay clean and never turn muddy. */
function mixOklab(a: string, b: string, t: number): string {
  const from = hexToOklab(a);
  const to = hexToOklab(b);
  return oklabToRgb({
    L: from.L + (to.L - from.L) * t,
    a: from.a + (to.a - from.a) * t,
    b: from.b + (to.b - from.b) * t,
  });
}

/** Smoothly sample a ramp at t ∈ [0,1]. No hard color jumps. */
function rampColor(t: number, ramp: readonly string[]): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (ramp.length - 1);
  const i = Math.min(Math.floor(scaled), ramp.length - 2);
  return mixOklab(ramp[i], ramp[i + 1], scaled - i);
}

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

/* ── particles ─────────────────────────────────────────────────────────── */

type ParticleKind = "bead" | "heart" | "spark";

interface Particle {
  id: string;
  kind: ParticleKind;
  dx: number;
  dy: number;
  fall: number;
  size: number;
  rotate: number;
  color: string;
  duration: number;
  delay: number;
  drift: number;
}

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

/** A glossy bead reads as dimensional, unlike a flat colour chip. */
function beadSurface(color: string): string {
  return `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.95) 0%, ${color} 46%, rgba(0,0,0,0.18) 100%)`;
}

function Bead({ p }: { p: Particle }) {
  return (
    <div
      className="h-full w-full rounded-full"
      style={{
        background: beadSurface(p.color),
        boxShadow: `0 0 ${p.size / 2}px ${p.color}55, inset 0 -1px 2px rgba(0,0,0,0.15)`,
      }}
    />
  );
}

function Spark({ p }: { p: Particle }) {
  return (
    <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
      <path
        d="M12 0c.6 6.3 5.1 10.8 12 12-6.9 1.2-11.4 5.7-12 12-.6-6.3-5.1-10.8-12-12C6.9 10.8 11.4 6.3 12 0Z"
        fill={p.color}
        style={{ filter: `drop-shadow(0 0 3px ${p.color})` }}
      />
    </svg>
  );
}

function MiniHeart({ p }: { p: Particle }) {
  const id = `mh-${p.id}`;
  return (
    <svg viewBox="0 0 60 60" className="h-full w-full" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="38%" stopColor={p.color} />
          <stop offset="100%" stopColor={p.color} />
        </linearGradient>
      </defs>
      <path
        d={HEART_PATH}
        fill={`url(#${id})`}
        style={{ filter: `drop-shadow(0 1px 1.5px ${p.color}66)` }}
      />
    </svg>
  );
}

function Payload({ p }: { p: Particle }) {
  if (p.kind === "spark") return <Spark p={p} />;
  if (p.kind === "heart") return <MiniHeart p={p} />;
  return <Bead p={p} />;
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
}

const ThreeDLikeButton = ({ slug }: ThreeDLikeButtonProps) => {
  const { totalLikes, userLikes, addLike, isLoading } = usePostLikes({
    slug,
    initialTotalLikes: 0,
    initialUserLikes: 0,
  });

  const { isDarkMode } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const [particles, setParticles] = useState<Particle[]>([]);
  const [pressed, setPressed] = useState(false);
  const [plusKey, setPlusKey] = useState(0);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const countControls = useAnimationControls();

  const waveFront = useMemo(() => buildWavePath(3, 0), []);
  const waveBack = useMemo(() => buildWavePath(2.6, Math.PI), []);

  const ramp = isDarkMode ? LOVE_RAMP_DARK : LOVE_RAMP_LIGHT;
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
  const [playbackRate, setPlaybackRate] = useState(0.75);
  const [play] = useSound("/sounds/pop.mp3", { playbackRate, volume: 0.5 });

  const schedule = useCallback((fn: () => void, ms: number) => {
    const t = setTimeout(fn, ms);
    timeoutsRef.current.push(t);
  }, []);

  // Clear any trailing timers when the button unmounts.
  React.useEffect(
    () => () => timeoutsRef.current.forEach(clearTimeout),
    []
  );

  const spawnParticles = useCallback(() => {
    const now = Date.now();
    const next: Particle[] = [];
    const spawnedIds: string[] = [];

    // A small constellation of beads — enough to read as a burst, few enough
    // to feel deliberate. Each one arcs up, then falls with gravity.
    for (let i = 0; i < 6; i++) {
      const angle = rand(Math.PI * 0.22, Math.PI * 0.78); // biased upward
      const speed = rand(28, 54);
      next.push({
        id: `bead-${now}-${i}`,
        kind: "bead",
        dx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1) * 0.5,
        dy: -Math.sin(angle) * speed,
        fall: rand(38, 74),
        size: rand(4, 9),
        rotate: 0,
        color: rampColor(rand(0.15, 1), ramp),
        duration: TIMING.burst + rand(-0.08, 0.12),
        delay: i * TIMING.burstStagger,
        drift: 0,
      });
    }

    // Two quiet sparks — a hint of light, not a firework.
    for (let i = 0; i < 2; i++) {
      next.push({
        id: `spark-${now}-${i}`,
        kind: "spark",
        dx: rand(-34, 34),
        dy: rand(-46, -24),
        fall: rand(24, 42),
        size: rand(6, 10),
        rotate: rand(20, 70),
        color: pick(SPARK_COLORS),
        duration: TIMING.burst + rand(0, 0.15),
        delay: rand(0, 0.05),
        drift: 0,
      });
    }

    // One small heart that drifts up and fades.
    next.push({
      id: `float-${now}-0`,
      kind: "heart",
      dx: rand(-14, 14),
      dy: rand(-40, -30),
      fall: 0,
      size: rand(10, 14),
      rotate: rand(-10, 10),
      color: rampColor(rand(0.4, 1), ramp),
      duration: TIMING.floater,
      delay: 0.06,
      drift: rand(-10, 10),
    });

    next.forEach((p) => spawnedIds.push(p.id));
    setParticles((prev) => [...prev, ...next]);

    schedule(() => {
      setParticles((prev) => prev.filter((p) => !spawnedIds.includes(p.id)));
    }, TIMING.cleanup);
  }, [schedule, ramp]);

  const handleLike = useCallback(() => {
    if (isMaxed) return;

    setPressed(true);
    schedule(() => setPressed(false), TIMING.press * 1000);

    posthog.capture("blog_post_liked", {
      slug,
      current_likes: userLikes,
      total_likes: totalLikes,
      max_reached: userLikes === MAX_USER_LIKES - 1,
    });

    addLike();

    if (!prefersReducedMotion) {
      spawnParticles();
      countControls.start({
        scale: [1, 1.08, 1],
        transition: { duration: TIMING.count, ease: "easeOut" },
      });
    }

    setPlusKey((k) => k + 1);
    schedule(() => setPlusKey(0), TIMING.count * 1000 + 400);

    setPlaybackRate((prev) => Math.min(prev + 0.08, 1.45));
    play();

    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(8);
    }
  }, [
    isMaxed,
    slug,
    userLikes,
    totalLikes,
    addLike,
    spawnParticles,
    prefersReducedMotion,
    countControls,
    play,
    schedule,
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
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* Particle stage, anchored to the heart's centre */}
        {!prefersReducedMotion && (
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 z-20"
            style={{ width: 0, height: 0 }}
            aria-hidden
          >
            <AnimatePresence initial={false}>
              {particles.map((p) => {
                const isFloater = p.kind === "heart";
                return (
                  <motion.div
                    key={p.id}
                    className="absolute left-0 top-0"
                    style={{
                      width: p.size,
                      height: p.size,
                      marginLeft: -p.size / 2,
                      marginTop: -p.size / 2,
                    }}
                    initial={{ x: 0, y: 0, scale: 0, opacity: 0, rotate: 0 }}
                    animate={
                      isFloater
                        ? {
                            x: [0, p.drift],
                            y: [0, p.dy],
                            scale: [0.5, 1, 0.85],
                            opacity: [0, 0.85, 0],
                            rotate: [0, p.rotate],
                          }
                        : {
                            x: [0, p.dx * 0.8, p.dx],
                            y: [0, p.dy, p.dy + p.fall],
                            scale: [0.5, 1, 0.8],
                            opacity: [0, 1, 0],
                            rotate: [0, p.rotate],
                          }
                    }
                    transition={{
                      duration: p.duration,
                      delay: p.delay,
                      times: isFloater ? [0, 0.2, 1] : [0, 0.34, 1],
                      ease: isFloater ? "easeOut" : ["easeOut", "easeIn"],
                    }}
                  >
                    <Payload p={p} />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

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
            <div className="pointer-events-none absolute inset-x-1 -bottom-0.5 h-2 rounded-full bg-rose-500/25 opacity-60 blur-md transition-opacity duration-300 group-hover:opacity-100" />

            <svg
              viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
              className="relative h-12 w-12 md:h-14 md:w-14"
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
          className="font-mono text-xl tabular-nums tracking-tight text-gray-700 dark:text-gray-200 md:text-2xl"
          aria-live="polite"
          aria-atomic="true"
        >
          {totalLikes.toLocaleString()}
          <span className="sr-only"> likes</span>
        </motion.div>

        <AnimatePresence>
          {plusKey > 0 && (
            <motion.span
              key={plusKey}
              className="pointer-events-none absolute -top-1 left-full ml-1 text-sm font-semibold text-rose-500 dark:text-rose-300"
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