"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * The shared "like" burst: beads that arc up and fall under gravity, a couple
 * of sparks, and one small heart that drifts away. Extracted from the blog's
 * 3D like button so every like on the site celebrates the same way.
 */

/* ── palette ──────────────────────────────────────────────────────────── */

export const LOVE_RAMP_LIGHT = ["#fecdd3", "#fda4af", "#fb7185", "#f43f5e", "#e11d48"];
export const LOVE_RAMP_DARK = ["#fb7185", "#f43f5e", "#e11d48", "#be123c", "#9f1239"];

const SPARK_COLORS = ["#ffffff", "#ffe4e6", "#fecdd3"];

/** Classic symmetric heart, drawn once and reused for every layer. */
const HEART_PATH =
  "M30 53.5C30 53.5 5.5 38.5 5.5 21.5C5.5 13.5 12 7 20 7C25.5 7 28.8 10 30 13.5C31.2 10 34.5 7 40 7C48 7 54.5 13.5 54.5 21.5C54.5 38.5 30 53.5 30 53.5Z";

export const BURST_TIMING = {
  burst: 0.9,
  burstStagger: 0.022,
  floater: 1.7,
  cleanup: 1800,
} as const;

/* ── color helpers ────────────────────────────────────────────────────── */

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
export function rampColor(t: number, ramp: readonly string[]): string {
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (ramp.length - 1);
  const i = Math.min(Math.floor(scaled), ramp.length - 2);
  return mixOklab(ramp[i], ramp[i + 1], scaled - i);
}

/* ── particles ────────────────────────────────────────────────────────── */

type ParticleKind = "bead" | "heart" | "spark";

export interface BurstParticle {
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

function Bead({ p }: { p: BurstParticle }) {
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

function Spark({ p }: { p: BurstParticle }) {
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

function MiniHeart({ p }: { p: BurstParticle }) {
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

function Payload({ p }: { p: BurstParticle }) {
  if (p.kind === "spark") return <Spark p={p} />;
  if (p.kind === "heart") return <MiniHeart p={p} />;
  return <Bead p={p} />;
}

/* ── the hook + stage ─────────────────────────────────────────────────── */

export function useLikeBurst({
  ramp,
  scale = 1,
}: {
  ramp: readonly string[];
  /** Scale the burst for smaller buttons. */
  scale?: number;
}) {
  const [particles, setParticles] = useState<BurstParticle[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Clear any trailing timers when the caller unmounts.
  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  const burst = useCallback(() => {
    const now = Date.now();
    const next: BurstParticle[] = [];

    // A small constellation of beads — enough to read as a burst, few enough
    // to feel deliberate. Each one arcs up, then falls with gravity.
    for (let i = 0; i < 6; i++) {
      const angle = rand(Math.PI * 0.22, Math.PI * 0.78); // biased upward
      const speed = rand(28, 54) * scale;
      next.push({
        id: `bead-${now}-${i}`,
        kind: "bead",
        dx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1) * 0.5,
        dy: -Math.sin(angle) * speed,
        fall: rand(38, 74) * scale,
        size: rand(4, 9) * scale,
        rotate: 0,
        color: rampColor(rand(0.15, 1), ramp),
        duration: BURST_TIMING.burst + rand(-0.08, 0.12),
        delay: i * BURST_TIMING.burstStagger,
        drift: 0,
      });
    }

    // Two quiet sparks — a hint of light, not a firework.
    for (let i = 0; i < 2; i++) {
      next.push({
        id: `spark-${now}-${i}`,
        kind: "spark",
        dx: rand(-34, 34) * scale,
        dy: rand(-46, -24) * scale,
        fall: rand(24, 42) * scale,
        size: rand(6, 10) * scale,
        rotate: rand(20, 70),
        color: pick(SPARK_COLORS),
        duration: BURST_TIMING.burst + rand(0, 0.15),
        delay: rand(0, 0.05),
        drift: 0,
      });
    }

    // One small heart that drifts up and fades.
    next.push({
      id: `float-${now}-0`,
      kind: "heart",
      dx: rand(-14, 14) * scale,
      dy: rand(-40, -30) * scale,
      fall: 0,
      size: rand(10, 14) * scale,
      rotate: rand(-10, 10),
      color: rampColor(rand(0.4, 1), ramp),
      duration: BURST_TIMING.floater,
      delay: 0.06,
      drift: rand(-10, 10) * scale,
    });

    const spawned = next.map((p) => p.id);
    setParticles((prev) => [...prev, ...next]);

    const timeout = setTimeout(() => {
      setParticles((prev) => prev.filter((p) => !spawned.includes(p.id)));
    }, BURST_TIMING.cleanup);
    timeoutsRef.current.push(timeout);
  }, [ramp, scale]);

  return { burst, particles };
}

export function LikeBurst({ particles }: { particles: BurstParticle[] }) {
  return (
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
  );
}