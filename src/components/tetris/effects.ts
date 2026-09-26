/**
 * Juice for Shipstack: particles, floating text, slam tweens, squish and
 * settle pulses. Everything lives in fixed-size pools or maps, mutated in
 * place, so a long game never triggers a GC pause mid-frame. Positions are
 * stored in board cells, not pixels — the renderer converts with the current
 * metrics, so effects survive resizes and orientation changes.
 *
 * The motion grammar is borrowed from a good landing:
 *   slam    a hard-dropped piece falls the last stretch fast, then squishes
 *   settle  the stack takes the weight with a small vertical dip
 *   wobble  a rotation pops the piece briefly out of shape
 * None of it blocks play — state updates instantly, motion only reports.
 */
import type { ClearedCell } from "./engine";

interface Particle {
  alive: boolean;
  x: number; // board cells
  y: number;
  vx: number; // cells / ms
  vy: number;
  age: number;
  ttl: number;
  size: number; // fraction of a cell
  color: string;
  spin: number;
  rot: number;
}

interface Floater {
  alive: boolean;
  text: string;
  x: number; // board cells
  y: number;
  age: number;
  ttl: number;
  tone: "score" | "accent" | "dev";
  big: boolean;
}

interface SlamEntry {
  fromY: number;
  startedAt: number;
}

interface FallEntry {
  fromY: number;
  startedAt: number;
}

const MAX_PARTICLES = 240;
const MAX_FLOATERS = 10;

const SLAM_FALL_MS = 120;
const SLAM_SQUISH_MS = 100;
const WOBBLE_MS = 140;
const SETTLE_MS = 210;
/** How long the stack takes to land after a collapse. */
const FALL_MS = 230;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** A soft overshoot: lands at 1 with a faint bounce at the end. */
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export class EffectsPool {
  reducedMotion = false;

  private particles: Particle[] = [];
  private floaters: Floater[] = [];
  private slams = new Map<string, SlamEntry>();
  private falls = new Map<string, FallEntry>();
  private slamClock = 0;
  private shakeAge = Infinity;
  private shakeTtl = 1;
  private shakeMag = 0;
  private wobbleAge = Infinity;
  private settleAge = Infinity;

  /** Spawn particles per cleared block, fanned outward from row center. */
  burstCells(cells: ClearedCell[], colorFor: (kind: number) => string) {
    for (const cell of cells) {
      const outward = Math.sign(cell.x - 4.5) || (Math.random() < 0.5 ? -1 : 1);
      const count = this.reducedMotion ? 1 : 2;
      for (let i = 0; i < count; i++) {
        this.spawnParticle({
          x: cell.x + 0.5,
          y: cell.y + 0.5,
          vx: outward * (0.002 + Math.random() * 0.01),
          vy: -(0.006 + Math.random() * 0.009),
          ttl: 420 + Math.random() * 280,
          size: 0.3 + Math.random() * 0.32,
          color: colorFor(cell.kind),
          spin: (Math.random() - 0.5) * 0.024,
        });
      }
    }
  }

  /** A soft dust puff kicked up where a hard-dropped piece landed. */
  dust(cells: ClearedCell[], color: string) {
    if (this.reducedMotion) return;
    for (const cell of cells) {
      this.spawnParticle({
        x: cell.x + 0.5 + (Math.random() - 0.5) * 0.6,
        y: cell.y + 0.95,
        vx: (Math.random() - 0.5) * 0.007,
        vy: -(0.0015 + Math.random() * 0.003),
        ttl: 280 + Math.random() * 160,
        size: 0.2 + Math.random() * 0.16,
        color,
        spin: 0,
      });
    }
  }

  /**
   * The last stretch of a hard drop plays out as a fall-and-squish tween on
   * the freshly locked cells: the mind reads it as impact, not teleport.
   */
  beginSlam(cells: ClearedCell[], distance: number) {
    if (this.reducedMotion) return;
    const travel = Math.min(distance, 12);
    if (travel <= 0) return;
    for (const cell of cells) {
      this.slams.set(`${cell.x},${cell.y}`, {
        fromY: cell.y - travel,
        startedAt: this.slamClock,
      });
    }
  }

  /**
   * Render state for a cell mid-slam: a vertical offset plus a y-scale
   * about the cell's bottom edge. Null once the tween is over.
   */
  slamState(x: number, y: number): { dy: number; squish: number } | null {
    const entry = this.slams.get(`${x},${y}`);
    if (!entry) return null;
    const t = this.slamClock - entry.startedAt;
    if (t < SLAM_FALL_MS) {
      const p = easeOutCubic(t / SLAM_FALL_MS);
      return { dy: (entry.fromY - y) * (1 - p), squish: 1 };
    }
    if (t < SLAM_FALL_MS + SLAM_SQUISH_MS) {
      const p = easeOutBack((t - SLAM_FALL_MS) / SLAM_SQUISH_MS);
      return { dy: 0, squish: 0.84 + 0.16 * p };
    }
    this.slams.delete(`${x},${y}`);
    return null;
  }

  /**
   * After rows collapse, everything above them eased down to its new row
   * instead of teleporting — the mind expects gravity, not cut frames.
   */
  beginFall(moves: { x: number; y: number; fromY: number }[]) {
    if (this.reducedMotion) return;
    this.falls.clear();
    for (const move of moves) {
      this.falls.set(`${move.x},${move.y}`, {
        fromY: move.fromY,
        startedAt: this.slamClock,
      });
    }
  }

  /** Vertical offset (in cells) for a cell mid-fall; null when landed. */
  fallState(x: number, y: number): number | null {
    const entry = this.falls.get(`${x},${y}`);
    if (!entry) return null;
    const t = (this.slamClock - entry.startedAt) / FALL_MS;
    if (t >= 1) {
      this.falls.delete(`${x},${y}`);
      return null;
    }
    return (entry.fromY - y) * (1 - easeOutCubic(Math.max(0, t)));
  }

  /** A rotation pops the piece: quick dip, small overshoot, settle. */
  kickRotate() {
    if (this.reducedMotion) return;
    this.wobbleAge = 0;
  }

  /** Scale multiplier for the active piece while the rotate wobble runs. */
  rotateScale(): number {
    if (this.wobbleAge > WOBBLE_MS) return 1;
    const p = this.wobbleAge / WOBBLE_MS;
    if (p < 0.4) {
      return 1 - 0.16 * easeOutCubic(p / 0.4);
    }
    return 0.84 + 0.16 * easeOutBack((p - 0.4) / 0.6);
  }

  /** The whole stack dips under the weight of a collapse. */
  kickSettle() {
    if (this.reducedMotion) return;
    this.settleAge = 0;
  }

  /** Board scaleY multiplier while the settle pulse runs. */
  settleScaleY(): number {
    if (this.settleAge > SETTLE_MS) return 1;
    const p = this.settleAge / SETTLE_MS;
    return 1 - 0.018 * Math.sin(Math.PI * Math.min(1, p));
  }

  float(
    text: string,
    x: number,
    y: number,
    opts: { tone?: Floater["tone"]; big?: boolean; ttl?: number } = {}
  ) {
    let slot = this.floaters.find((f) => !f.alive);
    if (!slot) {
      if (this.floaters.length >= MAX_FLOATERS) return;
      slot = {
        alive: false,
        text: "",
        x: 0,
        y: 0,
        age: 0,
        ttl: 0,
        tone: "score",
        big: false,
      };
      this.floaters.push(slot);
    }
    slot.alive = true;
    slot.text = text;
    slot.x = x;
    slot.y = y;
    slot.age = 0;
    slot.ttl = opts.ttl ?? 1000;
    slot.tone = opts.tone ?? "score";
    slot.big = opts.big ?? false;
  }

  kick(magnitude: number) {
    if (this.reducedMotion) return;
    // Never stack shakes upward — the strongest recent one wins.
    this.shakeMag = Math.max(
      this.shakeAge < this.shakeTtl ? this.shakeMag * 0.5 : 0,
      magnitude
    );
    this.shakeAge = 0;
    this.shakeTtl = 150;
  }

  /** False when every effect has run out — the renderer can skip frames. */
  get busy(): boolean {
    return (
      this.shakeAge < this.shakeTtl ||
      this.settleAge <= SETTLE_MS ||
      this.wobbleAge <= WOBBLE_MS ||
      this.slams.size > 0 ||
      this.falls.size > 0 ||
      this.particles.some((p) => p.alive) ||
      this.floaters.some((f) => f.alive)
    );
  }

  /** Current shake offset in cells; (0,0) when settled. */
  shakeOffset(): [number, number] {
    if (this.shakeAge >= this.shakeTtl) return [0, 0];
    const t = this.shakeAge / this.shakeTtl;
    const fall = Math.pow(1 - t, 2);
    return [
      (Math.random() - 0.5) * this.shakeMag * fall,
      (Math.random() - 0.5) * this.shakeMag * fall * 0.6,
    ];
  }

  update(dtMs: number) {
    this.slamClock += dtMs;
    this.shakeAge += dtMs;
    this.wobbleAge += dtMs;
    this.settleAge += dtMs;

    for (const p of this.particles) {
      if (!p.alive) continue;
      p.age += dtMs;
      if (p.age >= p.ttl) {
        p.alive = false;
        continue;
      }
      p.vy += 0.000028 * dtMs; // gravity, in cells/ms²
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.rot += p.spin * dtMs;
    }

    for (const f of this.floaters) {
      if (!f.alive) continue;
      f.age += dtMs;
      if (f.age >= f.ttl) f.alive = false;
    }
  }

  /**
   * Draws particles and floating text onto the board context. `project`
   * converts board-cell coords to canvas pixels; palettes resolves tones to
   * themed colors.
   */
  draw(
    ctx: CanvasRenderingContext2D,
    project: (x: number, y: number) => [number, number],
    cellPx: number,
    palette: { text: string; accent: string; white: string }
  ) {
    for (const p of this.particles) {
      if (!p.alive) continue;
      const t = p.age / p.ttl;
      const [px, py] = project(p.x, p.y);
      const size = p.size * cellPx * (1 - t * 0.35);
      ctx.globalAlpha = 1 - easeOutCubic(t);
      ctx.fillStyle = p.color;
      if (p.spin !== 0) {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(p.rot);
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
      } else {
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;

    for (const f of this.floaters) {
      if (!f.alive) continue;
      const t = f.age / f.ttl;
      const rise = easeOutCubic(Math.min(1, t * 1.7)) * 1.5;
      const [px, py] = project(f.x, f.y - rise);
      const enter = Math.min(1, f.age / 90);
      ctx.globalAlpha = (t < 0.65 ? 1 : 1 - (t - 0.65) / 0.35) * enter;
      ctx.font = `${f.big ? 700 : 600} ${Math.max(
        11,
        cellPx * (f.big ? 0.9 : 0.62)
      )}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle =
        f.tone === "accent"
          ? palette.accent
          : f.tone === "dev"
            ? palette.white
            : palette.text;
      ctx.fillText(f.text, px, py);
    }
    ctx.globalAlpha = 1;
  }

  private spawnParticle(init: Omit<Particle, "alive" | "age" | "rot">) {
    let slot = this.particles.find((p) => !p.alive);
    if (!slot) {
      if (this.particles.length >= MAX_PARTICLES) return;
      slot = {
        alive: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        age: 0,
        ttl: 0,
        size: 0,
        color: "",
        spin: 0,
        rot: 0,
      };
      this.particles.push(slot);
    }
    Object.assign(slot, init, { alive: true, age: 0, rot: 0 });
  }
}
