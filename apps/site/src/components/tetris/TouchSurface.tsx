"use client";

/**
 * The gesture layer over the board — the whole playfield is the controller.
 *
 *   drag sideways   the piece follows your finger column-for-column, with a
 *                   haptic detent for every column it slides
 *   tap             rotate
 *   drag down       soft drop while the finger is down
 *   flick down      hard drop
 *
 * Direct manipulation beats on-screen arrows: your thumb never travels, and
 * the piece is where your finger says it is. `touch-action: none` plus
 * pointer-capture keeps iOS Safari's pull-to-refresh and scroll out of play.
 */
import { useRef, type MutableRefObject, type ReactElement } from "react";
import { useHaptics } from "@/hooks/useHaptics";
import type { EngineEvent, TetrisEngine } from "./engine";
import type { BoardMetrics } from "./BoardCanvas";

interface GestureState {
  pointerId: number | null;
  startX: number;
  startY: number;
  startT: number;
  mode: "undecided" | "horizontal" | "vertical" | "done";
  appliedCols: number;
  lastY: number;
  lastT: number;
  vy: number;
  lastTickT: number;
}

const TAP_MAX_MS = 260;
const FLICK_VELOCITY = 0.85; // px per ms
const COLUMN_TICK_MIN_MS = 24;

export function TouchSurface({
  engine,
  metricsRef,
  onEvents,
  enabled,
}: {
  engine: TetrisEngine;
  metricsRef: MutableRefObject<BoardMetrics>;
  onEvents: (events: EngineEvent[]) => void;
  enabled: boolean;
}): ReactElement {
  const haptics = useHaptics();
  const gesture = useRef<GestureState>({
    pointerId: null,
    startX: 0,
    startY: 0,
    startT: 0,
    mode: "undecided",
    appliedCols: 0,
    lastY: 0,
    lastT: 0,
    vy: 0,
    lastTickT: 0,
  });

  const reset = (softOff = true) => {
    if (softOff) engine.setSoftDrop(false);
    gesture.current.pointerId = null;
    gesture.current.mode = "undecided";
    gesture.current.vy = 0;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!enabled || gesture.current.pointerId !== null) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const g = gesture.current;
    g.pointerId = e.pointerId;
    g.startX = e.clientX;
    g.startY = e.clientY;
    g.startT = e.timeStamp;
    g.mode = "undecided";
    g.appliedCols = 0;
    g.lastY = e.clientY;
    g.lastT = e.timeStamp;
    g.vy = 0;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g.pointerId !== e.pointerId || g.mode === "done") return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    if (g.mode === "undecided") {
      if (ady > 16 && ady > adx * 1.2) {
        g.mode = "vertical";
        engine.setSoftDrop(true);
      } else if (adx > 10 && adx > ady) {
        g.mode = "horizontal";
      } else {
        return;
      }
    }

    // Track vertical velocity for the flick.
    const dt = e.timeStamp - g.lastT;
    if (dt > 0) {
      const instantVy = (e.clientY - g.lastY) / dt;
      g.vy = g.vy * 0.6 + instantVy * 0.4;
      g.lastY = e.clientY;
      g.lastT = e.timeStamp;
    }

    const { cell } = metricsRef.current;

    if (g.mode === "horizontal") {
      const desired = Math.round(dx / Math.max(1, cell));
      let delta = desired - g.appliedCols;
      while (delta !== 0) {
        const step = Math.sign(delta);
        const events = engine.moveActive(step);
        if (events.length === 0) break; // blocked by wall or stack
        onEvents(events);
        g.appliedCols += step;
        delta -= step;
        // One tick per column, rate-limited so a fast sweep still purrs.
        if (e.timeStamp - g.lastTickT > COLUMN_TICK_MIN_MS) {
          haptics.select();
          g.lastTickT = e.timeStamp;
        }
      }
      // A downward flick can still begin out of a horizontal drag.
      if (g.vy > FLICK_VELOCITY && dy > cell * 1.4) {
        g.mode = "done";
        onEvents(engine.hardDrop());
        engine.setSoftDrop(false);
      }
    }

    if (g.mode === "vertical") {
      if (g.vy > FLICK_VELOCITY && dy > cell * 1.4) {
        g.mode = "done";
        engine.setSoftDrop(false);
        onEvents(engine.hardDrop());
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const g = gesture.current;
    if (g.pointerId !== e.pointerId) return;

    if (g.mode === "undecided") {
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const quick = e.timeStamp - g.startT < TAP_MAX_MS;
      const still =
        Math.abs(dx) < metricsRef.current.cell * 0.6 &&
        Math.abs(dy) < metricsRef.current.cell * 0.6;
      if (quick && still) {
        // A tap rotates. No haptic — it fires too often to stay special.
        onEvents(engine.rotateActive(1));
      }
    }

    reset();
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (gesture.current.pointerId !== e.pointerId) return;
    reset();
  };

  return (
    <div
      className="absolute inset-0 z-10 touch-none select-none [-webkit-touch-callout:none] [-webkit-tap-highlight-color:transparent]"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onContextMenu={(e) => e.preventDefault()}
      aria-hidden="true"
    />
  );
}
