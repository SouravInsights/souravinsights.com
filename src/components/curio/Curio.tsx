"use client";

/**
 * Curio — the mascot of the Insights agent.
 *
 * A bot caught mid-hop: rounded body, arms up, feet kicked out, two round eyes
 * with a catchlight in each. No antenna — a stalk with a ball on the end is what
 * every robot mascot has, and the pose already says bot.
 *
 * The eyes lean toward the pointer, and while an answer is being fetched they
 * look up instead. Everything else it does (the taps, a blink every few seconds)
 * is CSS: the only JS here is the lean.
 *
 * Three deliberate choices:
 * - The lean is written as a `transform` *attribute*, not a CSS transform. The
 *   blink keyframes own `transform` on these nodes, and one channel per effect
 *   means the two can never fight over the same property.
 * - The frame loop stops the moment the eyes reach their target, so a mascot
 *   nobody is pointing at costs zero frames. The next pointermove restarts it.
 * - Reduced motion keeps the lean and drops the ambient loops. See globals.css.
 */

import { useEffect, useRef } from "react";

/**
 * The drawing's own box: 60 wide by 48 tall, centred on (32, 32).
 *
 * Centred on those exact numbers on purpose — (32, 32) is also the eyes' middle,
 * which is what lets the blink keep squashing them around plain `center`.
 *
 * Tight rather than a square 64: with the antenna gone the bot is wider than
 * tall (52.7 x 44.9), so a square box would letterbox it down to 68% of its
 * height and the mascot would visibly shrink. The element stays square; the
 * drawing scales to fit, which puts the bot at `size` wide and 0.8 x size tall.
 */
const VIEWBOX = "2 8 60 48";

/**
 * The body: one rounded rectangle, corners fatter at the bottom (16) than the
 * top (12) so the bot carries its weight where it lands. A single deliberate
 * outline, because the anatomy carries the character — an earlier pass unioned
 * seven circles and read as random: a cloud of blobs has no anatomy.
 *
 * Rounded rect from (13,10) to (51,48), handles at k = 0.72 per corner: fuller
 * than a circular corner (0.5523), softer than the site's rounded-square
 * language, and it leaves no straight edge longer than 14 units.
 *
 * It used to sit 4 units lower, under the antenna. Everything moved up with it
 * when the antenna went, so the eyes stay on the view-box centre line — the
 * anchor the blink keyframes depend on.
 */
const BODY = [
  "M 25 10",
  "L 39 10",
  "C 47.64 10 51 13.36 51 22",
  "L 51 32",
  "C 51 43.52 46.52 48 35 48",
  "L 29 48",
  "C 17.48 48 13 43.52 13 32",
  "L 13 22",
  "C 13 13.36 16.36 10 25 10",
  "Z",
].join(" ");

/**
 * The body colour is `currentColor`, so it comes from the class below. The
 * site's palette is ink, warm paper and exactly one chromatic identity, green
 * (136 `text-green-700`/`green-500` in this codebase, and no other family used
 * as identity). Amber and pink read off-brand because they are not in there.
 * So Curio wears the accent: green-600 on paper, the site's green-500 on
 * near-black — the same light/dark pair every link already uses. The eyes stay
 * constants instead: the body is always light enough to carry dark eyes, so one
 * ink and one catchlight work in both themes.
 */
const EYE_COLOR = "#21201C";
const CATCHLIGHT = "#FFFDF8";

/** How far (in viewBox units) an eye may drift from the middle of the face. */
const DRIFT = 3.6;

/** Pointer distance, in mascot widths, at which the lean is complete. */
const REACH = 2.5;

/** Lean time constant, ms. Bigger is lazier. */
const EASE_MS = 110;

export interface CurioProps {
  /** Rendered size in px. */
  size?: number;
  /** An answer is being fetched: the eyes look up and the body breathes faster. */
  busy?: boolean;
  /**
   * Hold the taps.
   *
   * The mark in the panel header sits beside a heading you are reading, and two
   * bots tapping at once is one bot too many — both are saying "lively", so the
   * second copy is only noise. The hero above the input is the one place the
   * taps earn their keep: it is the welcome, and it is where the pointer is
   * already heading.
   *
   * This holds the taps only. The busy breath still runs, because that breath is
   * the header mark's whole reason to be there.
   */
  still?: boolean;
}

export function Curio({ size = 32, busy = false, still = false }: CurioProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const eyesRef = useRef<SVGGElement | null>(null);
  // Where the eyes are and where they are headed. Refs, not state: this runs at
  // frame rate and must not re-render, and they outlive a `busy` flip so the
  // eyes never snap back to the middle when the effect re-runs.
  const pos = useRef({ x: 0, y: 0 });
  const want = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const svg = svgRef.current;
    const eyes = eyesRef.current;
    if (!svg || !eyes) return;

    // Waiting on the model: up and slightly in, like a thought being chased.
    want.current = busy ? { x: 0, y: -1 } : { x: 0, y: 0 };

    let frame = 0;
    let last = performance.now();

    const step = (now: number) => {
      frame = 0;
      const dt = Math.min(now - last, 64);
      last = now;

      const k = 1 - Math.exp(-dt / EASE_MS);
      pos.current.x += (want.current.x - pos.current.x) * k;
      pos.current.y += (want.current.y - pos.current.y) * k;

      eyes.setAttribute(
        "transform",
        `translate(${(pos.current.x * DRIFT).toFixed(2)} ${(
          pos.current.y * DRIFT
        ).toFixed(2)})`
      );

      // At rest, stop. An idle mascot must not hold a frame loop open.
      if (
        Math.abs(want.current.x - pos.current.x) < 0.002 &&
        Math.abs(want.current.y - pos.current.y) < 0.002
      ) {
        return;
      }

      frame = requestAnimationFrame(step);
    };

    const kick = () => {
      if (frame) return;
      last = performance.now();
      frame = requestAnimationFrame(step);
    };

    const onMove = (event: PointerEvent) => {
      if (busy) return;

      const box = svg.getBoundingClientRect();
      const dx = event.clientX - (box.left + box.width / 2);
      const dy = event.clientY - (box.top + box.height / 2);
      const distance = Math.hypot(dx, dy) || 1;
      // Normalised, so a pointer a couple of mascot-widths away already pulls
      // the eyes all the way. Waiting for the far corner of the window would
      // read as "not following" to anyone sitting right next to the blob.
      const pull = Math.min(1, distance / (box.width * REACH));

      want.current = { x: (dx / distance) * pull, y: (dy / distance) * pull };
      kick();
    };

    kick();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [busy]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={VIEWBOX}
      className="curio text-green-600 dark:text-green-500"
      data-busy={busy ? "true" : "false"}
      data-still={still ? "true" : "false"}
      aria-hidden="true"
      focusable="false"
    >
      <path d={BODY} fill="currentColor" />

      {/* The pose is half of "jumping": arms up, feet kicked out. Each limb is
          rotated about its own centre and overlaps the body by at least 4 units,
          so they merge into the silhouette the way a sleeve merges with a
          shoulder instead of reading as stuck-on shapes. */}
      <rect
        x={7}
        y={18}
        width={10}
        height={8}
        rx={4}
        fill="currentColor"
        transform="rotate(30 12 22)"
      />
      <rect
        x={47}
        y={18}
        width={10}
        height={8}
        rx={4}
        fill="currentColor"
        transform="rotate(-30 52 22)"
      />
      <rect
        x={18.5}
        y={42.5}
        width={11}
        height={11}
        rx={5.5}
        fill="currentColor"
        transform="rotate(-18 24 48)"
      />
      <rect
        x={34.5}
        y={42.5}
        width={11}
        height={11}
        rx={5.5}
        fill="currentColor"
        transform="rotate(18 40 48)"
      />

      {/* The lean lands on this group. The eyes' middle line is y 28 — not the
          view-box centre, which is why globals.css names that value instead of
          using `center`. Change the y values here and that value has to follow. */}
      <g ref={eyesRef}>
        <g className="curio-eye">
          <rect
            x={18.5}
            y={22}
            width={11}
            height={12}
            rx={5.25}
            fill={EYE_COLOR}
          />
          {/* The catchlight is what makes these eyes rather than a pause
              button: a glyph has nothing catching the light. */}
          <circle cx={21.9} cy={25.6} r={1.7} fill={CATCHLIGHT} />
        </g>
        <g className="curio-eye">
          <rect
            x={34.5}
            y={22}
            width={11}
            height={12}
            rx={5.25}
            fill={EYE_COLOR}
          />
          <circle cx={37.9} cy={25.6} r={1.7} fill={CATCHLIGHT} />
        </g>
      </g>
    </svg>
  );
}
