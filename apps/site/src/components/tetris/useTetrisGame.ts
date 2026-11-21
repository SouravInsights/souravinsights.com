"use client";

/**
 * The glue between Shipstack's engine and the senses.
 *
 * The engine emits bare events; this hook decides what each one means out
 * loud — the thud of a lock, the shimmer of a clear, the success chord of a
 * tetris — and mirrors the small slice of state the HUD shows into React.
 * The 60fps loop never touches setState; only these event boundaries do.
 *
 * It also owns the ambient promises a phone game has to keep: the screen
 * stays awake mid-run, a tab switch pauses instead of killing you, and no
 * focused button gets a chance to re-fire Space mid-game.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import posthog from "posthog-js";
import { useWebHaptics } from "web-haptics/react";
import { useUISound } from "@/hooks/useUISound";
import {
  COLS,
  HIDDEN_ROWS,
  ROWS,
  TetrisEngine,
  type EngineEvent,
  type QueuedPiece,
} from "./engine";
import { EffectsPool } from "./effects";
import { KeyboardInput } from "./input";
import { blockColor } from "./pieces";

export type GameStatus = "ready" | "play" | "paused" | "over";

export interface HudState {
  status: GameStatus;
  score: number;
  level: number;
  lines: number;
  /** Consecutive line-clearing drops; 0 when idle. */
  streak: number;
  held: QueuedPiece | null;
  canHold: boolean;
  queue: QueuedPiece[];
  best: number;
  isNewBest: boolean;
  pieces: number;
  maxStreak: number;
}

const BEST_KEY = "shipstack:best";

function loadBest(): number {
  if (typeof window === "undefined") return 0;
  const raw = window.localStorage.getItem(BEST_KEY);
  const value = raw ? Number.parseInt(raw, 10) : 0;
  return Number.isFinite(value) ? value : 0;
}

/** Leave no focus behind — a focused "Start" button eats the next Space. */
function blurActiveElement() {
  const el = document.activeElement;
  if (el instanceof HTMLElement) el.blur();
}

export function useTetrisGame() {
  // Stable game objects — state lives inside them, not in React.
  const engine = useMemo(() => new TetrisEngine(), []);
  const effects = useMemo(() => new EffectsPool(), []);
  const input = useMemo(() => new KeyboardInput(engine), [engine]);

  const haptics = useWebHaptics();
  const sound = useUISound();

  const [hud, setHud] = useState<HudState>({
    status: "ready",
    score: 0,
    level: 1,
    lines: 0,
    streak: 0,
    held: null,
    canHold: true,
    queue: [],
    best: 0,
    isNewBest: false,
    pieces: 0,
    maxStreak: 0,
  });

  // Mirrors engine.phase for handlers that run outside the loop.
  const statusRef = useRef<GameStatus>("ready");

  // Hydrate best score + honour reduced motion for the effects budget.
  useEffect(() => {
    const best = loadBest();
    setHud((prev) => ({ ...prev, best }));

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    effects.reducedMotion = motionQuery.matches;
    const onMotion = (event: MediaQueryListEvent) => {
      effects.reducedMotion = event.matches;
    };
    motionQuery.addEventListener("change", onMotion);
    return () => motionQuery.removeEventListener("change", onMotion);
  }, [effects]);

  // Keep the screen awake while a run is live; re-acquire on tab return.
  useEffect(() => {
    if (hud.status !== "play" || !("wakeLock" in navigator)) return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as unknown as {
      wakeLock: { request: (type: "screen") => Promise<{ release: () => Promise<void> }> };
    };
    const acquire = () => {
      nav.wakeLock.request("screen").then((sentinel) => {
        lock = sentinel;
      }).catch(() => {
        // The promise rejects when the page is hidden — fine, we re-acquire.
      });
    };
    acquire();
    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      lock?.release().catch(() => {});
    };
  }, [hud.status]);

  const syncHud = useCallback(() => {
    setHud((prev) => {
      const nextPhase: GameStatus =
        engine.phase === "over"
          ? "over"
          : engine.paused
            ? "paused"
            : engine.phase === "play" || engine.phase === "clearing"
              ? "play"
              : "ready";

      const next: HudState = {
        status: nextPhase,
        score: engine.score,
        level: engine.level,
        lines: engine.lines,
        streak: engine.streak + 1,
        held: engine.held,
        canHold: engine.canHold,
        queue: engine.queue.slice(0, 3),
        best: prev.best,
        isNewBest: prev.isNewBest,
        pieces: engine.piecesLocked,
        maxStreak: engine.maxStreak + 1,
      };
      statusRef.current = nextPhase;
      const changed = (Object.keys(next) as (keyof HudState)[]).some((key) => {
        if (key === "queue") {
          return next.queue.some(
            (piece, i) => piece !== (prev.queue as QueuedPiece[])[i]
          );
        }
        return next[key] !== prev[key];
      });
      return changed ? next : prev;
    });
  }, [engine]);

  const handleEvents = useCallback(
    (events: EngineEvent[]) => {
      for (const event of events) {
        switch (event.type) {
          case "rotate": {
            effects.kickRotate();
            sound.playSwitch(0.25);
            break;
          }
          case "lock": {
            if (event.hardDropped && event.distance > 0) {
              sound.playThud(1);
              haptics.trigger("rigid");
              effects.beginSlam(event.cells, event.distance);
              effects.dust(event.cells, "rgba(148, 163, 184, 0.5)");
              effects.kick(0.3);
            } else {
              sound.playThud(0.45);
            }
            if (event.tspin && event.twistPoints > 0) {
              // A twist that cleared nothing still earns its moment.
              const midY = Math.min(...event.cells.map((c) => c.y));
              sound.playSuccess(0.45);
              haptics.trigger("nudge");
              effects.float(
                `${event.tspin === "mini" ? "t-spin mini" : "t-spin"} +${event.twistPoints}`,
                COLS / 2,
                Math.max(midY - 1.5, 5.5),
                { tone: "accent" }
              );
              posthog.capture("shipstack_tspin", { kind: event.tspin, lines: 0 });
            }
            break;
          }
          case "clear": {
            const topRow = Math.min(...event.rows);
            const labelY = Math.max(topRow - 2, 5.5);
            sound.playSweep();

            if (event.tetris) {
              sound.playSuccess(0.8);
              haptics.trigger("success");
              effects.float("TETRIS", COLS / 2, labelY - 1.6, {
                tone: "accent",
                big: true,
                ttl: 1300,
              });
              posthog.capture("shipstack_tetris", {
                back_to_back: event.backToBack,
              });
            } else if (event.tspin) {
              sound.playSuccess(0.65);
              haptics.trigger("success");
              const name = event.count === 1 ? "single" : event.count === 2 ? "double" : "triple";
              effects.float(
                `${event.tspin === "mini" ? "t-spin mini" : "t-spin"} ${name}`,
                COLS / 2,
                labelY - 1.6,
                { tone: "accent", big: true, ttl: 1300 }
              );
              posthog.capture("shipstack_tspin", {
                kind: event.tspin,
                lines: event.count,
              });
            } else {
              sound.playPop(0.9, 1 + 0.14 * (event.count - 1));
              if (event.count === 2) {
                effects.float("double", COLS / 2, labelY - 1.5, { tone: "dev" });
              } else if (event.count === 3) {
                effects.float("triple", COLS / 2, labelY - 1.5, { tone: "dev" });
              }
            }
            if (event.backToBack) {
              effects.float("back-to-back", COLS / 2, labelY - 3, {
                tone: "dev",
                ttl: 900,
              });
            }

            effects.float(`+${event.points}`, COLS / 2, labelY + 0.2, {
              tone: event.tetris ? "accent" : "score",
              big: event.tetris,
            });

            break;
          }
          case "collapse": {
            effects.burstCells(event.cells, (kind) => kindToColor(kind));
            // Everything above the vanished rows eases down to its new home.
            effects.beginFall(computeFallMoves(engine, event.rows));
            effects.kickSettle();
            effects.kick(0.14);
            break;
          }
          case "level": {
            sound.playSuccess(0.5);
            haptics.trigger("success");
            effects.float(`level ${event.level}`, COLS / 2, 8, {
              tone: "accent",
              big: true,
              ttl: 1400,
            });
            posthog.capture("shipstack_level_up", { level: event.level });
            break;
          }
          case "hold": {
            sound.playSwitch(0.5);
            haptics.trigger("selection");
            break;
          }
          case "gameover": {
            sound.playGameOver();
            haptics.trigger("error");
            input.enabled = false;

            const best = loadBest();
            const isNewBest = engine.score > best && engine.score > 0;
            if (isNewBest) {
              window.localStorage.setItem(BEST_KEY, String(engine.score));
            }
            const duration = (Date.now() - engine.startTime) / 1000;
            posthog.capture("shipstack_game_over", {
              score: engine.score,
              lines: engine.lines,
              level: engine.level,
              max_streak: engine.maxStreak + 1,
              pieces_locked: engine.piecesLocked,
              duration,
              new_best: isNewBest,
            });

            setHud((prev) => ({
              ...prev,
              status: "over",
              best: Math.max(best, engine.score),
              isNewBest,
              score: engine.score,
              level: engine.level,
              lines: engine.lines,
              pieces: engine.piecesLocked,
              maxStreak: engine.maxStreak + 1,
              streak: 0,
              canHold: false,
            }));
            statusRef.current = "over";
            return; // game over supersedes the generic hud sync
          }
        }
      }
      syncHud();
    },
    [effects, engine, haptics, sound, syncHud, input]
  );

  const start = useCallback(() => {
    blurActiveElement();
    // Start is a tap — the moment to unlock the AudioContext so iOS Safari
    // doesn't leave game sounds suspended until the next lucky gesture.
    sound.initAudio().catch(() => {});
    input.enabled = true;
    const events = engine.start();
    posthog.capture("shipstack_started", { best: loadBest() });
    statusRef.current = "play";
    handleEvents(events);
    syncHud();
  }, [engine, input, handleEvents, syncHud, sound]);

  const togglePause = useCallback(() => {
    if (engine.phase === "over" || engine.phase === "ready") return;
    blurActiveElement();
    engine.paused = !engine.paused;
    input.enabled = !engine.paused;
    syncHud();
  }, [engine, input, syncHud]);

  useEffect(() => {
    input.onPauseRequest = togglePause;
    return () => {
      input.onPauseRequest = null;
    };
  }, [input, togglePause]);

  // Walking away mid-run shouldn't cost a game: pause on tab switch.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && engine.phase === "play" && !engine.paused) {
        engine.paused = true;
        input.enabled = false;
        syncHud();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [engine, input, syncHud]);

  return {
    engine,
    effects,
    input,
    hud,
    start,
    togglePause,
    handleEvents,
  };
}

function kindToColor(kind: number): string {
  if (kind < 1) return "#94a3b8";
  const dark = document.documentElement.classList.contains("dark");
  return blockColor(kind - 1, dark);
}

/**
 * Where did each surviving cell come from? For every settled cell in the
 * fresh grid, count how many cleared rows sat below its pre-collapse
 * position — that many rows is how far it fell.
 */
function computeFallMoves(
  engine: TetrisEngine,
  clearedRows: number[]
): { x: number; y: number; fromY: number }[] {
  // Kept rows preserve order and pack to the bottom: keptRows[i] is the
  // original index of the row now sitting at (offset + i).
  const cleared = new Set(clearedRows);
  const keptRows: number[] = [];
  for (let y = 0; y < ROWS; y++) if (!cleared.has(y)) keptRows.push(y);
  const offset = ROWS - keptRows.length;

  const moves: { x: number; y: number; fromY: number }[] = [];
  for (let y = Math.max(HIDDEN_ROWS, offset); y < ROWS; y++) {
    const fromY = keptRows[y - offset];
    if (fromY === y) continue;
    for (let x = 0; x < COLS; x++) {
      if (engine.grid[y * COLS + x] === 0) continue;
      moves.push({ x, y, fromY });
    }
  }
  return moves;
}
