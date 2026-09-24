"use client";

import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useCallback, useRef, useState } from "react";
import Scritto from "@scritto/react";
import { cn } from "@/lib/utils";

/**
 * The dial's track sweeps 270°, leaving a gap at the bottom so 0% and 100%
 * never meet. The gap runs from the end of the sweep back round to the start.
 */
const START_ANGLE = 135;
const SWEEP = 270;
const GAP_FROM = (START_ANGLE + SWEEP) % 360; // 45°
const GAP_TO = START_ANGLE; // 135°
const GAP_MID = (GAP_FROM + GAP_TO) / 2; // 90°

/** How far a press may travel before it counts as a drag rather than a click. */
const DRAG_THRESHOLD = 6;

function polar(cx: number, cy: number, radius: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians),
  };
}

function arcPath(
  cx: number,
  cy: number,
  radius: number,
  from: number,
  to: number
) {
  const start = polar(cx, cy, radius, from);
  const end = polar(cx, cy, radius, to);
  const largeArc = to - from > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

/** Snap to a grid, rounded so repeated float maths doesn't leak 0.30000000004. */
function quantize(raw: number, step: number) {
  return Number((Math.round(raw / step) * step).toFixed(3));
}

interface CircularSliderProps {
  /** Current value, 0–1. */
  value: number;
  onChange: (value: number) => void;
  /** Fired when the value crosses a detent, for a haptic cue. */
  onDetent?: () => void;
  /** Fired once the gesture ends, for a commit sound rather than a stream. */
  onCommit?: () => void;
  disabled?: boolean;
  /** Detent spacing — what a click lands on, and where the haptics fire. */
  detent?: number;
  /** Drag granularity. Finer than the detent, so drags stay precise. */
  precision?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
}

/**
 * A rotary volume dial.
 *
 * - **A click aims**: it snaps to the nearest detent, so the target is
 *   generous. Point roughly at the top and you get 50%, not 49% or 51%.
 * - **A drag follows the angle of the pointer** all the way around the ring,
 *   so every value is reachable in one continuous gesture — including 100%,
 *   which an up/down mapping can't always offer, since the dial may sit near
 *   the top of the viewport and vertical travel runs out at the screen edge.
 *
 * The centre of the dial is inert on purpose: the percentage is a readout,
 * not a handle, so touching dead centre must never swing the value.
 */
export function CircularSlider({
  value,
  onChange,
  onDetent,
  onCommit,
  disabled = false,
  detent = 0.1,
  precision = 0.01,
  size = 64,
  strokeWidth = 4,
  label,
}: CircularSliderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const passedThreshold = useRef(false);
  const lastDetent = useRef(Math.round(value / detent));
  const [isDragging, setIsDragging] = useState(false);

  const center = size / 2;
  const handleRadius = isDragging
    ? strokeWidth / 2 + 3
    : strokeWidth / 2 + 1.5;
  // Reserve room for the largest the handle gets, so the ring keeps one radius
  // and the handle can never overflow the viewBox (which clips).
  const radius = center - (strokeWidth / 2 + 3) - 0.5;
  const percent = Math.round(value * 100);
  // The centre is inert: a press here never starts a gesture.
  const deadRadius = size * 0.25;

  /**
   * Where on the ring a pointer sits, as a raw 0–1 before any snapping.
   * Returns null for presses that shouldn't touch the value at all.
   */
  const rawFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return null;

      const dx = clientX - (rect.left + rect.width / 2);
      const dy = clientY - (rect.top + rect.height / 2);

      if (Math.hypot(dx, dy) <= deadRadius) return null;

      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;

      // Nothing is drawn across the bottom, so a pointer in the gap belongs to
      // whichever end it is nearer. Without this, dragging just past 0% reads
      // as "past the far end" and wraps around to 100%.
      if (angle >= GAP_FROM && angle <= GAP_TO) {
        return angle < GAP_MID ? 1 : 0;
      }

      const normalised = angle < START_ANGLE ? angle + 360 : angle;
      return (normalised - START_ANGLE) / SWEEP;
    },
    [deadRadius]
  );

  const applyValue = useCallback(
    (candidate: number) => {
      const next = Math.min(1, Math.max(0, candidate));
      const index = Math.round(next / detent);

      if (lastDetent.current !== index) {
        lastDetent.current = index;
        onDetent?.();
      }

      onChange(next);
    },
    [detent, onChange, onDetent]
  );

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    // One gesture at a time: a second finger mid-drag must not take over.
    if (disabled || activePointer.current !== null) return;

    const raw = rawFromPointer(event.clientX, event.clientY);
    if (raw === null) return;

    activePointer.current = event.pointerId;
    startPoint.current = { x: event.clientX, y: event.clientY };
    passedThreshold.current = false;
    lastDetent.current = Math.round(value / detent);
    setIsDragging(true);
    rootRef.current?.setPointerCapture(event.pointerId);

    // A press aims: land on the nearest detent.
    applyValue(quantize(raw, detent));
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointer.current) return;
    const start = startPoint.current;
    if (!start) return;

    if (!passedThreshold.current) {
      const travelled = Math.hypot(
        event.clientX - start.x,
        event.clientY - start.y
      );
      if (travelled > DRAG_THRESHOLD) passedThreshold.current = true;
    }

    const raw = rawFromPointer(event.clientX, event.clientY);
    if (raw === null) return; // Swept through the centre: hold, don't jump.

    // Past the threshold this is a deliberate drag: stop snapping.
    applyValue(quantize(raw, precision));
  };

  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerId !== activePointer.current) return;

    activePointer.current = null;
    startPoint.current = null;
    setIsDragging(false);
    if (rootRef.current?.hasPointerCapture(event.pointerId)) {
      rootRef.current.releasePointerCapture(event.pointerId);
    }
    onCommit?.();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;

    // Shift reaches the fine grid, matching what a drag can do.
    const step = event.shiftKey ? precision : detent;

    let next: number | null = null;
    switch (event.key) {
      case "ArrowUp":
      case "ArrowRight":
        next = value + step;
        break;
      case "ArrowDown":
      case "ArrowLeft":
        next = value - step;
        break;
      case "PageUp":
        next = value + detent * 2;
        break;
      case "PageDown":
        next = value - detent * 2;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = 1;
        break;
    }

    if (next === null) return;
    event.preventDefault();
    applyValue(quantize(next, step));
  };

  const angle = START_ANGLE + SWEEP * value;
  const handle = polar(center, center, radius, angle);

  return (
    <div
      ref={rootRef}
      role="slider"
      tabIndex={disabled ? -1 : 0}
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-disabled={disabled}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onKeyDown={handleKeyDown}
      style={{ width: size, height: size }}
      className={cn(
        "relative shrink-0 touch-none select-none rounded-full outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-move"
      )}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        {/* Decile ticks: the click targets, made visible. */}
        {Array.from({ length: 11 }, (_, index) => {
          const tick = polar(
            center,
            center,
            radius - strokeWidth / 2 - 3,
            START_ANGLE + (SWEEP * index) / 10
          );
          return (
            <circle
              key={index}
              cx={tick.x}
              cy={tick.y}
              r={1}
              className="fill-muted-foreground/40"
            />
          );
        })}

        <path
          d={arcPath(center, center, radius, START_ANGLE, START_ANGLE + SWEEP)}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="stroke-muted-foreground/20"
        />
        {value > 0 && (
          <path
            d={arcPath(center, center, radius, START_ANGLE, angle)}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="stroke-green-500"
          />
        )}
        <circle
          cx={handle.x}
          cy={handle.y}
          r={handleRadius}
          className="fill-foreground"
        />
      </svg>

      <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs font-medium tabular-nums">
        <Scritto value={`${percent}%`} />
      </span>
    </div>
  );
}
