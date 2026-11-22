"use client";

/**
 * The board renderer, built around a single rule: hit the frame budget on a
 * mid-range phone.
 *
 * Every block, ghost and flash is pre-rendered once per (cell size × color ×
 * variant) onto a small offscreen canvas; frames are then pure GPU-composited
 * drawImage blits. The well itself — background, grid, inner shadow, frame —
 * is one more offscreen layer, rebuilt only on resize or theme flip. When the
 * game sits idle behind an overlay, painting stops entirely.
 *
 * The engine moves in discrete cells; this layer keeps a *rendered* pose for
 * the active piece that chases the logical one, so slides, gravity and wall
 * kicks read as motion instead of teleporting. Line clears sweep center-out,
 * locked pieces land with a fall-and-squish, the stack dips under a merge.
 * State is always instant — motion is the narration, never the blocker.
 */
import {
  useEffect,
  useRef,
  type MutableRefObject,
  type ReactElement,
} from "react";
import {
  COLS,
  HIDDEN_ROWS,
  ROWS,
  VISIBLE_ROWS,
  CELL_KIND_MASK,
  type EngineEvent,
  type TetrisEngine,
} from "./engine";
import { BLOCK_COLORS, ROTATIONS } from "./pieces";
import type { EffectsPool } from "./effects";
import type { KeyboardInput } from "./input";

export interface BoardMetrics {
  cell: number;
  ox: number;
  oy: number;
}

/** The rendered pose of the falling piece — chases the logical one. */
interface VisualPose {
  x: number;
  y: number;
  spawnNonce: number;
}

interface ThemePalette {
  blocks: string[];
  card: string;
  line: string;
  grid: string;
  text: string;
  accent: string;
  danger: string;
  white: string;
  dark: boolean;
}

function readCssVar(name: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value ? `hsl(${value})` : fallback;
}

function resolvePalette(dark: boolean): ThemePalette {
  return {
    blocks: BLOCK_COLORS[dark ? "dark" : "light"],
    card: readCssVar("--card", dark ? "#11141a" : "#fbf9f4"),
    line: readCssVar("--border", dark ? "#232a36" : "#ddd6c8"),
    grid: readCssVar("--border", dark ? "#232a36" : "#ddd6c8"),
    text: readCssVar("--foreground", dark ? "#eef1f4" : "#24211b"),
    accent: dark ? "#4ade80" : "#15803d", // the site's green
    danger: dark ? "#f87171" : "#dc2626",
    white: dark ? "#f5f6f7" : "#ffffff",
    dark,
  };
}

const MAX_DT_MS = 50;
/** Exponential smoothing time constant for the falling piece's glide. */
const POSE_TAU_MS = 58;
/** Cap pixel ratio — the last full step of DPR buys little and costs a lot. */
const MAX_DPR = 2;
/** Matches the site's --radius (0.5rem) exactly. */
const BOARD_RADIUS = 8;

/** Pre-rendered block variants, keyed per frame configuration. */
class SpriteCache {
  private map = new Map<string, HTMLCanvasElement>();

  clear() {
    this.map.clear();
  }

  block(
    color: string,
    cell: number,
    dpr: number,
    white: string
  ): HTMLCanvasElement {
    const key = `b:${color}:${cell}@${dpr}`;
    let sprite = this.map.get(key);
    if (sprite) return sprite;

    sprite = document.createElement("canvas");
    const size = Math.ceil(cell * dpr);
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const inset = Math.max(1, cell * 0.07);
    const s = cell - inset * 2;
    const r = Math.min(s / 2, cell * 0.22);

    ctx.fillStyle = color;
    roundedRect(ctx, inset, inset, s, s, r);
    ctx.fill();

    // Bevel: light up top, weight at the bottom — flat but solid.
    ctx.save();
    roundedRect(ctx, inset, inset, s, s, r);
    ctx.clip();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillRect(inset, inset, s, Math.max(1.5, s * 0.14));
    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.fillRect(inset, inset + s - Math.max(1.5, s * 0.13), s, Math.max(1.5, s * 0.13));
    ctx.restore();

    ctx.strokeStyle = "rgba(0,0,0,0.22)";
    ctx.lineWidth = 1;
    roundedRect(ctx, inset + 0.5, inset + 0.5, s - 1, s - 1, r);
    ctx.stroke();

    // `white` participates in the flash sprite only; referenced here so the
    // cache key stays honest if a future variant uses it.
    void white;
    this.map.set(key, sprite);
    return sprite;
  }

  ghost(color: string, cell: number, dpr: number): HTMLCanvasElement {
    const key = `g:${color}:${cell}@${dpr}`;
    let sprite = this.map.get(key);
    if (sprite) return sprite;

    sprite = document.createElement("canvas");
    const size = Math.ceil(cell * dpr);
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const inset = Math.max(1, cell * 0.07);
    const s = cell - inset * 2;
    const r = Math.min(s / 2, cell * 0.22);
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, cell * 0.06);
    roundedRect(ctx, inset + 0.5, inset + 0.5, s - 1, s - 1, r);
    ctx.stroke();

    this.map.set(key, sprite);
    return sprite;
  }

  flash(cell: number, dpr: number, white: string): HTMLCanvasElement {
    const key = `f:${white}:${cell}@${dpr}`;
    let sprite = this.map.get(key);
    if (sprite) return sprite;

    sprite = document.createElement("canvas");
    const size = Math.ceil(cell * dpr);
    sprite.width = size;
    sprite.height = size;
    const ctx = sprite.getContext("2d")!;
    ctx.scale(dpr, dpr);

    const inset = Math.max(1, cell * 0.07);
    const s = cell - inset * 2;
    const r = Math.min(s / 2, cell * 0.22);
    ctx.fillStyle = white;
    roundedRect(ctx, inset, inset, s, s, r);
    ctx.fill();

    this.map.set(key, sprite);
    return sprite;
  }
}

/** The static well — background, grid, inner shadow, frame + border. */
function buildWellSprite(
  cssW: number,
  cssH: number,
  cell: number,
  ox: number,
  oy: number,
  dpr: number,
  palette: ThemePalette
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(cssW * dpr));
  canvas.height = Math.max(1, Math.round(cssH * dpr));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.translate(ox, oy);

  const boardW = cell * COLS;
  const boardH = cell * VISIBLE_ROWS;

  // The well, slightly sunken relative to the page around it.
  ctx.fillStyle = palette.card;
  roundedRect(ctx, 0, 0, boardW, boardH, BOARD_RADIUS);
  ctx.fill();
  ctx.save();
  roundedRect(ctx, 0, 0, boardW, boardH, BOARD_RADIUS);
  ctx.clip();

  ctx.fillStyle = palette.dark ? "rgba(0,0,0,0.30)" : "rgba(0,0,0,0.04)";
  ctx.fillRect(0, 0, boardW, boardH);

  // Hairline grid.
  ctx.strokeStyle = palette.grid;
  ctx.globalAlpha = palette.dark ? 0.16 : 0.38;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < COLS; x++) {
    ctx.moveTo(x * cell + 0.5, 0);
    ctx.lineTo(x * cell + 0.5, boardH);
  }
  for (let y = 1; y < VISIBLE_ROWS; y++) {
    ctx.moveTo(0, y * cell + 0.5);
    ctx.lineTo(boardW, y * cell + 0.5);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Inner top shadow — depth, so blocks stack *into* something.
  const topShadow = ctx.createLinearGradient(0, 0, 0, cell * 1.4);
  topShadow.addColorStop(0, palette.dark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.09)");
  topShadow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = topShadow;
  ctx.fillRect(0, 0, boardW, cell * 1.4);
  ctx.restore();

  // Frame.
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  roundedRect(ctx, 0.5, 0.5, boardW - 1, boardH - 1, BOARD_RADIUS);
  ctx.stroke();

  return canvas;
}

export function BoardCanvas({
  engine,
  effects,
  input,
  onEvents,
  metricsRef,
}: {
  engine: TetrisEngine;
  effects: EffectsPool;
  input: KeyboardInput;
  onEvents: (events: EngineEvent[]) => void;
  metricsRef: MutableRefObject<BoardMetrics>;
}): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const poseRef = useRef<VisualPose>({ x: 3, y: 2, spawnNonce: -1 });
  const onEventsRef = useRef(onEvents);
  onEventsRef.current = onEvents;

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let dark = document.documentElement.classList.contains("dark");
    let palette = resolvePalette(dark);
    const sprites = new SpriteCache();
    let well: HTMLCanvasElement | null = null;
    let wellKey = "";

    const themeObserver = new MutationObserver(() => {
      const next = document.documentElement.classList.contains("dark");
      if (next !== dark) {
        dark = next;
        palette = resolvePalette(dark);
        sprites.clear();
        wellKey = ""; // force well rebuild
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let cssW = 0;
    let cssH = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0].contentRect;
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
      wellKey = "";
    });
    resizeObserver.observe(wrapper);

    input.attach();

    let raf = 0;
    let last = performance.now();
    let paintedForWellKey = "";

    const frame = (now: number) => {
      const dt = Math.min(MAX_DT_MS, now - last);
      last = now;

      const events = input.poll(dt).concat(engine.step(dt));
      if (events.length) onEventsRef.current(events);
      effects.update(dt);

      if (cssW > 0 && cssH > 0) {
        const cell = Math.max(10, Math.floor(Math.min(cssW / COLS, cssH / VISIBLE_ROWS)));
        const boardW = cell * COLS;
        const boardH = cell * VISIBLE_ROWS;
        const ox = Math.round((cssW - boardW) / 2);
        const oy = Math.round((cssH - boardH) / 2);
        metricsRef.current = { cell, ox, oy };

        const key = `${cssW}x${cssH}:${cell}:${ox}:${oy}@${dpr}:${dark ? 1 : 0}`;
        if (key !== wellKey) {
          wellKey = key;
          well = buildWellSprite(cssW, cssH, cell, ox, oy, dpr, palette);
          sprites.clear();
        }

        // Idle frames are free frames: while "play" or "clearing" we always
        // paint; behind a ready/over overlay we repaint once per well layout
        // and then only for as long as effects are still alive.
        const idle = engine.phase === "ready" || engine.phase === "over";
        const freshWellPaint = paintedForWellKey !== key;
        if (well && (!idle || effects.busy || freshWellPaint)) {
          paint(
            ctx, canvas, well, cell, ox, oy, dt, now, dpr,
            engine, effects, palette, sprites, poseRef.current
          );
          paintedForWellKey = key;
        }
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      themeObserver.disconnect();
      input.detach();
    };
    // Engine, effects and input are stable instances owned by the caller.
  }, [engine, effects, input, metricsRef]);

  return (
    <div ref={wrapperRef} className="absolute inset-0">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label="Shipstack board, 10 by 20 blocks"
        className="block"
      />
    </div>
  );
}

function paint(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  well: HTMLCanvasElement,
  cell: number,
  ox: number,
  oy: number,
  dt: number,
  now: number,
  dpr: number,
  engine: TetrisEngine,
  effects: EffectsPool,
  palette: ThemePalette,
  sprites: SpriteCache,
  pose: VisualPose
) {
  const cssW = canvas.width / dpr;
  const cssH = canvas.height / dpr;
  const boardW = cell * COLS;
  const boardH = cell * VISIBLE_ROWS;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssW, cssH);

  const [shakeX, shakeY] = effects.shakeOffset();
  const settleY = effects.settleScaleY();
  const needsBoardTransform = settleY !== 1;
  if (needsBoardTransform || shakeX !== 0 || shakeY !== 0) {
    ctx.save();
    ctx.translate(ox + shakeX * cell, oy + shakeY * cell);
    if (needsBoardTransform) {
      ctx.translate(boardW / 2, boardH);
      ctx.scale(1, settleY);
      ctx.translate(-boardW / 2, -boardH);
    }
    ctx.translate(-ox, -oy);
    ctx.drawImage(well, 0, 0, cssW, cssH);
  } else {
    ctx.drawImage(well, 0, 0, cssW, cssH);
  }

  // Everything board-space from here on.
  ctx.save();
  ctx.translate(ox + shakeX * cell, oy + shakeY * cell);
  roundedRect(ctx, 0, 0, boardW, boardH, BOARD_RADIUS);
  ctx.clip();
  if (needsBoardTransform) {
    ctx.translate(boardW / 2, boardH);
    ctx.scale(1, settleY);
    ctx.translate(-boardW / 2, -boardH);
  }

  const flashSpriteFor = () => sprites.flash(cell, dpr, palette.white);

  const clearing = new Set(engine.clearingRows);

  // Settled blocks.
  for (let by = HIDDEN_ROWS; by < ROWS; by++) {
    const inClearing = clearing.has(by);
    for (let bx = 0; bx < COLS; bx++) {
      const value = engine.grid[by * COLS + bx];
      if (value === 0) continue;
      const kind = value & CELL_KIND_MASK;
      const color = palette.blocks[kind - 1];
      const sprite = sprites.block(color, cell, dpr, palette.white);
      const px = bx * cell;
      const py = (by - HIDDEN_ROWS) * cell;

      const slam = effects.slamState(bx, by);
      const fall = effects.fallState(bx, by);
      if (slam) {
        if (slam.dy !== 0) {
          ctx.drawImage(sprite, px, py + slam.dy * cell, cell, cell);
        } else {
          const h = cell * slam.squish;
          ctx.drawImage(sprite, px, py + (cell - h), cell, h);
        }
      } else if (fall) {
        // Just dropped after a collapse: land it where it belongs, eased.
        ctx.drawImage(sprite, px, py + fall * cell, cell, cell);
      } else if (inClearing) {
        // The wash runs late toward the walls — a sweep from the center out.
        const stagger = Math.abs(bx - 4.5) * 0.065;
        const local = clamp01((engine.clearProgress - stagger) / 0.42);
        const pop = 1 + Math.sin(local * Math.PI) * 0.1;
        const size = cell * pop;
        ctx.drawImage(sprite, px - (size - cell) / 2, py - (size - cell) / 2, size, size);
        const flashAlpha = Math.sin(local * Math.PI) * 0.85;
        if (flashAlpha > 0.02) {
          ctx.globalAlpha = flashAlpha;
          ctx.drawImage(flashSpriteFor(), px, py, cell, cell);
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.drawImage(sprite, px, py, cell, cell);
      }
    }
  }

  // The falling piece: chase the logical pose so every move glides.
  if (engine.active && (engine.phase === "play" || engine.phase === "ready")) {
    const piece = engine.active;
    if (pose.spawnNonce !== engine.spawnNonce) {
      pose.x = piece.x;
      pose.y = piece.y;
      pose.spawnNonce = engine.spawnNonce;
    } else {
      const k = 1 - Math.exp(-dt / POSE_TAU_MS);
      pose.x += (piece.x - pose.x) * k;
      pose.y += (piece.y - pose.y) * k;
      // Fast gravity must never let the drawing trail the truth: snap when
      // the lag grows past a couple of rows.
      if (Math.abs(pose.y - piece.y) > 2) pose.y = piece.y - 1.5;
      if (Math.abs(pose.x - piece.x) > 3) pose.x = piece.x;
    }

    const cells = ROTATIONS[piece.type][piece.rot];
    const color = palette.blocks[piece.color];

    // Ghost, breathing gently — a suggestion, not a demand.
    const ghostDistance = engine.ghostY - piece.y;
    if (ghostDistance > 0) {
      const breathe = 0.26 + 0.08 * Math.sin(now / 480);
      const ghost = sprites.ghost(color, cell, dpr);
      ctx.globalAlpha = breathe;
      for (const [cx, cy] of cells) {
        const gy = engine.ghostY + cy;
        if (gy < HIDDEN_ROWS) continue;
        ctx.drawImage(ghost, (piece.x + cx) * cell, (gy - HIDDEN_ROWS) * cell, cell, cell);
      }
      ctx.globalAlpha = 1;
    }

    // The piece itself, scaled around its own center during the wobble so a
    // rotation reads as a pop, not a jitter.
    const wobble = effects.rotateScale();
    const cxList = cells.map(([cx]) => cx);
    const cyList = cells.map(([, cy]) => cy);
    const minX = Math.min(...cxList);
    const maxX = Math.max(...cxList);
    const minY = Math.min(...cyList);
    const maxY = Math.max(...cyList);
    const centerX = (pose.x + (minX + maxX + 1) / 2) * cell;
    const centerY = (pose.y - HIDDEN_ROWS + (minY + maxY + 1) / 2) * cell;

    ctx.save();
    if (wobble !== 1) {
      ctx.translate(centerX, centerY);
      ctx.scale(wobble, wobble);
      ctx.translate(-centerX, -centerY);
    }
    cells.forEach(([cx, cy]) => {
      if (pose.y + cy < HIDDEN_ROWS - 1) return;
      const sprite = sprites.block(color, cell, dpr, palette.white);
      const px = (pose.x + cx) * cell;
      const py = (pose.y + cy - HIDDEN_ROWS) * cell;
      ctx.drawImage(sprite, px, py, cell, cell);
    });
    ctx.restore();
  }

  // Danger heartbeat: the ceiling glows as the stack climbs toward it.
  let highest = VISIBLE_ROWS;
  topScan: for (let by = HIDDEN_ROWS; by < ROWS; by++) {
    for (let bx = 0; bx < COLS; bx++) {
      if (engine.grid[by * COLS + bx] !== 0) {
        highest = by - HIDDEN_ROWS;
        break topScan;
      }
    }
  }
  if (highest < 7 && engine.phase !== "ready") {
    const depth = (7 - highest) / 7;
    const pulse = 0.75 + 0.25 * Math.sin(now / 280);
    const gradient = ctx.createLinearGradient(0, 0, 0, cell * 4);
    gradient.addColorStop(0, hexWithAlpha(palette.danger, 0.22 * depth * pulse + 0.03));
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, boardW, cell * 4);
    ctx.fillStyle = hexWithAlpha(palette.danger, 0.5 * depth * pulse);
    ctx.fillRect(0, 0, boardW, 1);
  }

  // Particles and floating text ride above everything.
  effects.draw(
    ctx,
    (x, y) => [x * cell, (y - HIDDEN_ROWS) * cell],
    cell,
    { text: palette.text, accent: palette.accent, white: palette.white }
  );

  ctx.restore(); // board clip
  if (needsBoardTransform || shakeX !== 0 || shakeY !== 0) ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function hexWithAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}
