"use client";

/**
 * Shipstack. Just Tetris.
 *
 * The board is one canvas; this file is the room around it. No card grid,
 * no colored chrome: the site's own grammar carries the UI, meaning mono
 * label type, hairline rules, quiet surfaces, and one primary button style
 * shared with the rest of the site. On a phone the board gets almost
 * everything; on desktop it stands alone at full height between two
 * reading rails — score, hold and next on the left, keys and scoring on
 * the right. Overlays aren't modals: the well itself is the screen, so
 * ready, pause and game-over are bare type on a quiet veil inside it.
 */
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Scritto from "@scritto/react";
import {
  ArrowDownToLine,
  Flame,
  Package,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BoardCanvas, type BoardMetrics } from "./BoardCanvas";
import { TouchSurface } from "./TouchSurface";
import { useTetrisGame, type GameStatus, type HudState } from "./useTetrisGame";
import { blockColor, ROTATIONS } from "./pieces";
import type { QueuedPiece } from "./engine";
import { cn } from "@/lib/utils";

/** The spring every card here enters and exits on. Punchy, never bouncy. */
const cardSpring = { type: "spring", duration: 0.35, bounce: 0 } as const;

/** Press feedback shared by every tap target in the game. */
const pressScale =
  "transition-transform duration-100 active:scale-[0.97] touch-manipulation select-none [-webkit-tap-highlight-color:transparent]";

const keyChip =
  "inline-flex min-w-6 items-center justify-center rounded border border-border/70 bg-secondary px-1.5 py-0.5 font-mono text-[10px] leading-none text-secondary-foreground";

export default function TetrisGame() {
  const { engine, effects, input, hud, start, togglePause, handleEvents } =
    useTetrisGame();
  const dark = useIsDark();
  const metricsRef = useRef<BoardMetrics>({ cell: 20, ox: 0, oy: 0 });

  // The board's box is measured, not declared: its slot sits in a grid
  // `auto` track, and a CSS-only `aspect-ratio` + percentage height inside
  // one is a sizing cycle the browser resolves to zero. So we read the
  // free area ourselves and hand the box exact pixels. The HUD and thumb
  // controls borrow the same width, keeping every column edge aligned.
  const boardAreaRef = useRef<HTMLDivElement | null>(null);
  const [boardSize, setBoardSize] = useState<{ w: number; h: number } | null>(
    null
  );
  const colStyle = boardSize ? { width: boardSize.w } : undefined;
  useLayoutEffect(() => {
    const el = boardAreaRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      // Width must come from height alone. The desktop slot sits in a grid
      // `auto` track sized by this very box, so trusting the slot's width
      // is a cycle that resolves to zero — the row height, though, is
      // definite on every breakpoint.
      const h = Math.floor(Math.min(rect.height, 780));
      const w = Math.floor(Math.min(h / 2, window.innerWidth - 24));
      setBoardSize((prev) =>
        prev && prev.w === w && prev.h === h ? prev : { w, h }
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    // The first frames can report a transient near-empty slot (fonts, grid
    // settling); if nothing resizes afterwards, that wrong size sticks.
    // So re-measure per frame until two consecutive reads agree (capped),
    // and never commit a height too small to be real.
    let raf = 0;
    let lastId = "";
    let stable = 0;
    let frames = 0;
    const pump = () => {
      const rect = el.getBoundingClientRect();
      if (rect.height > 24) measure();
      const id = `${Math.round(rect.width)}x${Math.round(rect.height)}`;
      stable = id === lastId ? stable + 1 : 0;
      lastId = id;
      if (stable < 2 && frames < 240) {
        frames += 1;
        raf = requestAnimationFrame(pump);
      }
    };
    raf = requestAnimationFrame(pump);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // The game owns the screen: no page scroll, no pull-to-refresh bounce.
  // On a phone the layout wrapper is `min-h-screen` (100vh, url-bar hidden)
  // while the game measures itself in svh (bar shown) — taller document
  // than viewport means stray touches drag the whole page mid-game.
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    html.style.overscrollBehavior = "none";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflow = prev.htmlOverflow;
      body.style.overflow = prev.bodyOverflow;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      body.style.overscrollBehavior = prev.bodyOverscroll;
    };
  }, []);

  const playing = hud.status === "play";
  const overlay = hud.status === "play" ? null : hud.status;

  return (
    <div className="flex h-[calc(100svh-4.5rem)] min-h-0 flex-col overscroll-none pt-2 md:h-auto md:flex-1 md:pt-0">
      {/* Rails pinned to the page header's outer edges (justify-between,
          not center): the page reads on two verticals, and the well lands
          dead-center between them. Extra width becomes gap, not margin. */}
      <div className="flex min-h-0 flex-1 flex-col md:grid md:h-full md:grid-rows-1 md:grid-cols-[minmax(0,200px)_auto_minmax(0,200px)] md:justify-between md:gap-8">
        {/* Left rail: score, hold, queue (desktop). Content sits on the same
            left edge as the page header above it. */}
        <motion.aside {...enter(0.08)} className="hidden md:block">
          <RailSection label="Score">
            <div className="flex items-center justify-between gap-3">
              <div className="text-[32px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                <Scritto value={hud.score.toLocaleString()} />
              </div>
              <PauseToggle status={hud.status} onToggle={togglePause} />
            </div>
            <MetaLine hud={hud} dark={dark} className="mt-3" />
          </RailSection>
          <Rule />
          <RailSection label="Hold">
            <div className="flex h-12 items-center">
              <PiecePreview piece={hud.held} dark={dark} dim={!hud.canHold} cell={11} />
            </div>
            <p className="type-caption mt-2">Stash a piece, one per drop.</p>
          </RailSection>
          <Rule />
          <RailSection label="Next">
            <div className="flex flex-col gap-3">
              {hud.queue.map((piece, i) => (
                <div
                  key={`${piece.type}-${piece.color}-${i}`}
                  className={cn("flex h-10 items-center", i === 1 && "opacity-60", i === 2 && "opacity-40")}
                >
                  <PiecePreview piece={piece} dark={dark} cell={i === 0 ? 11 : 9} />
                </div>
              ))}
            </div>
          </RailSection>
        </motion.aside>

        {/* Center column: score header on phones, just the board on desktop */}
        <motion.div {...enter(0.12)} className="flex min-h-0 flex-1 flex-col items-center md:items-stretch">
          <div className="w-full max-w-full md:hidden" style={colStyle}>
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="type-label">Score</span>
              <div className="mt-1 text-[26px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
                <Scritto value={hud.score.toLocaleString()} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="type-label">Next</span>
                <div className="mt-1 flex h-5 items-center justify-end gap-2">
                  {hud.queue.slice(0, 2).map((piece, i) => (
                    <PiecePreview key={`${piece.type}-${piece.color}-${i}`} piece={piece} dark={dark} cell={7} />
                  ))}
                </div>
              </div>
              <PauseToggle status={hud.status} onToggle={togglePause} />
            </div>
          </div>

          {/* Meta line. Always rendered, so its height never shifts. */}
          <MetaLine hud={hud} dark={dark} className="mt-2" />
          </div>

          {/* The board declares its own geometry: height comes from the
              layout, width is always exactly half of it. The frame you see
              is the frame there is, no canvas gutters, no floating outline. */}
          <div
            ref={boardAreaRef}
            className="relative mt-3 w-full min-h-0 flex-1 md:mt-0 md:flex md:items-center md:justify-center"
          >
            <div
              className="relative mx-auto"
              style={
                boardSize
                  ? { width: boardSize.w, height: boardSize.h }
                  : { width: 1, height: 2 } // placeholder until the first real read
              }
            >
            <BoardCanvas
              engine={engine}
              effects={effects}
              input={input}
              onEvents={handleEvents}
              metricsRef={metricsRef}
            />
            <TouchSurface
              engine={engine}
              metricsRef={metricsRef}
              onEvents={handleEvents}
              enabled={playing}
            />

            {/* One overlay, the well itself: a quiet veil with bare type,
                no card chrome — an attract screen, not a modal. On desktop
                the rails stay sharp behind it, still teaching the keys. */}
            <AnimatePresence initial={false}>
              {overlay !== null && (
                <motion.div
                  key={overlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-background/70 p-4 backdrop-blur-sm"
                >
                  <OverlayCard
                    kind={overlay}
                    hud={hud}
                    onStart={start}
                    onResume={togglePause}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            </div>
          </div>

        {/* Thumb controls, phones only */}
        <div className="mt-2 grid w-full max-w-full grid-cols-3 gap-1.5 pb-[max(env(safe-area-inset-bottom),4px)] md:hidden" style={colStyle}>
          <ControlButton
            label="Hold"
            disabled={!playing || !hud.canHold}
            onPress={() => handleEvents(engine.swapHold())}
          >
            {hud.held ? (
              <PiecePreview piece={hud.held} dark={dark} cell={7} />
            ) : (
              <Package className="h-[18px] w-[18px]" strokeWidth={1.75} />
            )}
          </ControlButton>
          <ControlButton
            label="Rotate"
            disabled={!playing}
            onPress={() => handleEvents(engine.rotateActive(1))}
          >
            <RotateCw className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </ControlButton>
          <ControlButton
            label="Drop"
            disabled={!playing}
            onPress={() => handleEvents(engine.hardDrop())}
          >
            <ArrowDownToLine className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </ControlButton>
        </div>
        </motion.div>

        {/* Right rail: keys + scoring (desktop) */}
        <motion.aside {...enter(0.16)} className="hidden md:block">
          <RailSection label="Keys">
            <ul className="space-y-2.5 text-[13px] text-muted-foreground">
              <KeyRow keys={["←", "→"]} action="move" />
              <KeyRow keys={["↑", "X"]} action="rotate" />
              <KeyRow keys={["Z"]} action="rotate back" />
              <KeyRow keys={["↓"]} action="soft drop" />
              <KeyRow keys={["space"]} action="hard drop" />
              <KeyRow keys={["C"]} action="hold" />
              <KeyRow keys={["P"]} action="pause" />
            </ul>
          </RailSection>
          <Rule />
          <RailSection label="Scoring">
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              Single 100, double 300, triple 500, tetris 800. T-spins score 400
              to 1,600. Combos add 50 each. Back-to-back pays 1.5x.
            </p>
          </RailSection>
        </motion.aside>

      </div>

    </div>
  );
}

/** The site's shared entrance curve (see FadeIn): starts fast, settles. */
const enterEase: [number, number, number, number] = [0.23, 1, 0.32, 1];

/** The play area rises once on arrival, rails and well a breath staggered. */
function enter(delay: number) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4, delay, ease: enterEase },
  };
}

/* ------------------------------------------------------------------ */
/*  Chrome bits                                                        */
/* ------------------------------------------------------------------ */

/** Run vitals as quiet label–value pairs. No separator glyphs: those can
    strand at a line's edge when the rail pinches, so instead each pair
    holds itself apart by spacing and contrast alone. */
function MetaLine({
  hud,
  dark,
  className,
}: {
  hud: HudState;
  dark: boolean;
  className?: string;
}) {
  const beatingBest = hud.best > 0 && hud.score > hud.best;
  return (
    <p className={cn("type-label flex flex-wrap items-baseline gap-x-4 gap-y-1.5 tabular-nums", className)}>
      {beatingBest ? (
        // Past your record, the meta line says so the moment it happens.
        <span className="text-green-700 dark:text-green-500">new best</span>
      ) : (
        <Meta label="best" value={Math.max(hud.best, hud.score).toLocaleString()} />
      )}
      <span className="inline-flex items-baseline gap-1.5">
        <span className="text-faint-foreground">lvl</span>
        <LevelValue level={hud.level} dark={dark} />
      </span>
      <Meta label="lines" value={String(hud.lines)} />
      {hud.streak >= 2 && (
        <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
          <Flame className="h-3 w-3" strokeWidth={2.25} />
          x{hud.streak}
        </span>
      )}
    </p>
  );
}

/** A label and its value, held together as one unbreakable pair. */
function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-faint-foreground">{label}</span>
      <span>{value}</span>
    </span>
  );
}

/** A level-up earns a breath of the site's green, decaying back to ink.
    Keyed by level: each new level mounts fresh, running the fade once. */
function LevelValue({ level, dark }: { level: number; dark: boolean }) {
  return (
    <motion.span
      key={level}
      initial={level > 1 ? { color: dark ? "#4ade80" : "#15803d" } : false}
      animate={{ color: dark ? "#A7B2BE" : "#5C5751" }} // = --muted-foreground
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {level}
    </motion.span>
  );
}

function PauseToggle({
  status,
  onToggle,
}: {
  status: GameStatus;
  onToggle: () => void;
}) {
  if (status !== "play" && status !== "paused") return null;
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      aria-label={status === "paused" ? "Resume game" : "Pause game"}
      className={cn("h-9 w-9 text-muted-foreground hover:text-foreground", pressScale)}
    >
      {status === "paused" ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
    </Button>
  );
}

function Rule() {
  return <div className="rule my-5" aria-hidden="true" />;
}

function RailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="type-label mb-3">{label}</h3>
      {children}
    </section>
  );
}

function ControlButton({
  children,
  label,
  onPress,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPress}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-14 flex-col items-center justify-center gap-1.5 rounded-lg border border-border/80 bg-secondary/60 text-secondary-foreground",
        "hover:bg-secondary active:bg-accent",
        "disabled:pointer-events-none disabled:opacity-40",
        pressScale
      )}
    >
      <span className="flex h-5 items-center text-foreground/80">{children}</span>
      <span className="type-label">{label}</span>
    </button>
  );
}

function KeyRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex gap-1">
        {keys.map((key) => (
          <kbd key={key} className={keyChip}>
            {key}
          </kbd>
        ))}
      </span>
      <span>{action}</span>
    </li>
  );
}

/** A mini tetromino for the hold/next slots, drawn in its rolled color. */
function PiecePreview({
  piece,
  dark,
  dim = false,
  cell = 10,
}: {
  piece: QueuedPiece | null;
  dark: boolean;
  dim?: boolean;
  cell?: number;
}) {
  if (!piece) {
    return (
      <div
        className="rounded-[4px] border border-dashed border-border"
        style={{ width: cell * 4 + 3, height: cell * 2 + 3 }}
        aria-hidden="true"
      />
    );
  }
  const cells = ROTATIONS[piece.type][0];
  const xs = cells.map(([x]) => x);
  const ys = cells.map(([, y]) => y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const w = Math.max(...xs) - minX + 1;
  const h = Math.max(...ys) - minY + 1;
  const occupied = new Set(cells.map(([x, y]) => `${x - minX},${y - minY}`));
  const color = blockColor(piece.color, dark);

  return (
    <div
      className={cn("grid transition-opacity", dim && "opacity-40")}
      style={{
        gridTemplateColumns: `repeat(${w}, ${cell}px)`,
        gridAutoRows: `${cell}px`,
        gap: 1,
      }}
      aria-hidden="true"
    >
      {Array.from({ length: w * h }).map((_, i) => {
        const x = i % w;
        const y = Math.floor(i / w);
        const filled = occupied.has(`${x},${y}`);
        return (
          <div
            key={i}
            className="rounded-[2px]"
            style={filled ? { background: color } : undefined}
          />
        );
      })}
    </div>
  );
}

function useIsDark(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  return dark;
}

/* ------------------------------------------------------------------ */
/*  Overlays                                                           */
/* ------------------------------------------------------------------ */

/** One overlay body, always inside the well: bare type on the veil. */
function OverlayCard({
  kind,
  hud,
  onStart,
  onResume,
}: {
  kind: Exclude<GameStatus, "play">;
  hud: HudState;
  onStart: () => void;
  onResume: () => void;
}) {
  // The keyboard's primary verb always works: ⏎ takes the main button.
  useEffect(() => {
    const primary = kind === "paused" ? onResume : onStart;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      primary();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [kind, onStart, onResume]);

  if (kind === "ready") return <ReadyCard onStart={onStart} />;
  if (kind === "paused")
    return (
      <PausedCard
        score={hud.score}
        level={hud.level}
        lines={hud.lines}
        onResume={onResume}
        onRestart={onStart}
      />
    );
  return (
    <GameOverCard
      score={hud.score}
      best={hud.best}
      lines={hud.lines}
      pieces={hud.pieces}
      maxStreak={hud.maxStreak}
      isNewBest={hud.isNewBest}
      onRestart={onStart}
    />
  );
}

/** No box: just a measure-capped column of type sitting on the veiled well. */
const overlayCardClass = "w-full max-w-[236px] md:max-w-[280px]";

const primaryButtonClass = cn(
  "mt-4 w-full bg-foreground text-background hover:opacity-90",
  pressScale
);
const secondaryButtonClass = cn("mt-2 w-full", pressScale);

function ReadyCard({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={cardSpring}
      className={cn(overlayCardClass, "text-center")}
    >
      <span className="type-label">just tetris.</span>
      <h2 className="type-title mt-2">Shipstack</h2>
      <p className="type-caption mt-1.5">
        Fill rows to clear them. Clear four at once for a tetris.
      </p>

      {/* Gestures are taught only where gestures exist; on desktop the
          unfogged keys rail keeps that job. */}
      <ul className="mt-5 space-y-2.5 text-left text-[13px] text-muted-foreground md:hidden">
        <HintRow keys={["drag"]} action="move" />
        <HintRow keys={["tap"]} action="rotate" />
        <HintRow keys={["flick ↓"]} action="hard drop" />
        <HintRow keys={["hold ↓"]} action="soft drop" />
      </ul>

      <Button onClick={onStart} className={primaryButtonClass}>
        Start
      </Button>
      <EnterHint action="starts the game" />
    </motion.div>
  );
}

/** The quiet key affordance under every veil's primary button — desktop
    only, since it's the physical keyboard's verb. */
function EnterHint({ action }: { action: string }) {
  return (
    <p className="mt-3 hidden items-center justify-center gap-1.5 text-[11px] text-faint-foreground md:flex">
      <kbd className={keyChip}>⏎</kbd>
      {action}
    </p>
  );
}

function HintRow({ keys, action }: { keys: string[]; action: string }) {
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="flex gap-1">
        {keys.map((key) => (
          <kbd key={key} className={keyChip}>
            {key}
          </kbd>
        ))}
      </span>
      <span>{action}</span>
    </li>
  );
}

function PausedCard({
  score,
  level,
  lines,
  onResume,
  onRestart,
}: {
  score: number;
  level: number;
  lines: number;
  onResume: () => void;
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={cardSpring}
      className={cn(overlayCardClass, "text-center")}
    >
      <h2 className="type-title">Paused</h2>
      {/* The run's vitals, so the veil never costs you your place. */}
      <p className="type-caption mt-1.5 tabular-nums">
        {score.toLocaleString()} · lvl {level} · {lines} lines
      </p>
      <Button onClick={onResume} className={primaryButtonClass}>
        <Play className="h-4 w-4" />
        Resume
      </Button>
      <Button variant="outline" onClick={onRestart} className={secondaryButtonClass}>
        <RotateCcw className="h-4 w-4" />
        Start over
      </Button>
      <EnterHint action="resumes" />
    </motion.div>
  );
}

function GameOverCard({
  score,
  best,
  lines,
  pieces,
  maxStreak,
  isNewBest,
  onRestart,
}: {
  score: number;
  best: number;
  lines: number;
  pieces: number;
  maxStreak: number;
  isNewBest: boolean;
  onRestart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={cardSpring}
      className={overlayCardClass}
    >
      <span className="type-label block text-center">Game over</span>
      <h2 className="type-title mt-2 text-center">Stack overflow</h2>
      <p className="type-caption mt-1.5 text-center">The stack hit the ceiling.</p>

      {/* The verdict: one number, set like a headline. */}
      <div className="mt-5 text-center">
        <div className="text-[34px] font-semibold leading-none tracking-[-0.02em] tabular-nums">
          {score.toLocaleString()}
        </div>
        {isNewBest && (
          <div className="mt-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-green-700 dark:text-green-500">
            New best
          </div>
        )}
      </div>

      {/* A new best already *is* the score above — showing the same number
          in a row would read as noise. */}
      <dl className="mt-5 divide-y divide-border/60">
        {!isNewBest && <StatRow label="Best" value={best.toLocaleString()} />}
        <StatRow label="Lines" value={lines.toLocaleString()} />
        <StatRow label="Pieces" value={pieces.toLocaleString()} />
        {maxStreak >= 2 && <StatRow label="Best streak" value={`x${maxStreak}`} />}
      </dl>

      <Button onClick={onRestart} className={primaryButtonClass}>
        <RotateCcw className="h-4 w-4" />
        Play again
      </Button>
      <EnterHint action="plays again" />
    </motion.div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="type-label">{label}</dt>
      <dd className="text-[15px] font-medium tabular-nums">{value}</dd>
    </div>
  );
}
