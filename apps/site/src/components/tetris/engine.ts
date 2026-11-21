/**
 * Shipstack engine — a guideline-faithful Tetris core.
 *
 * Pure TypeScript, no React: the board is a flat typed array of packed cells,
 * time advances only through step(dt), and every mutating call returns the
 * events it caused. The UI layer stays dumb — it renders state and translates
 * events into sound, haptics, particles and HUD updates.
 *
 * The rules are deliberately the ones players already know: 7-bag random
 * generator, SRS rotation with wall kicks, guideline scoring with combos,
 * back-to-back and full T-spin recognition, lock delay with move resets,
 * ARE between pieces, block-out and lock-out as top-out conditions.
 */
import {
  BLOCK_COLOR_COUNT,
  createBag,
  kicksFor,
  ROTATIONS,
  type PieceType,
} from "./pieces";

export const COLS = 10;
export const ROWS = 24;
/** Top rows kept off-screen, where pieces spawn. */
export const HIDDEN_ROWS = 4;
export const VISIBLE_ROWS = ROWS - HIDDEN_ROWS;

export const CELL_KIND_MASK = 0xff;

/** Milliseconds a cleared row flashes before it collapses. Long enough for
 * the center-out sweep to read, short enough to keep the pace. */
export const CLEAR_ANIM_MS = 340;

/**
 * Entry delay (ARE): the short beat between one piece locking and the next
 * spawning. Without it the game reads as a conveyor belt; with it the pace
 * breathes. Collapses pace themselves, so no delay is needed there.
 */
const ARE_MS = 90;

/**
 * Pieces spawn so their lowest occupied row sits on the first visible row —
 * the piece is on stage the moment it exists, never popping in mid-fall.
 */
const SPAWN_Y = HIDDEN_ROWS - 1;
/** Guideline lock delay, reset by successful moves/rotates (capped). */
export const LOCK_DELAY_MS = 500;
const MAX_LOCK_RESETS = 15;
/** Soft drop runs ~20× gravity, floored at 50ms per cell. */
const SOFT_DROP_MIN_MS = 50;

/** Milliseconds per row of gravity, by level (1-indexed, clamped). */
const GRAVITY_TABLE = [
  780, 690, 600, 520, 450, 390, 335, 285, 240, 200, 165, 135, 110, 90, 70, 55,
  45, 38, 32,
];
export const MAX_LEVEL = GRAVITY_TABLE.length;

const LINE_POINTS = [0, 100, 300, 500, 800];
/** Guideline T-spin table, by lines cleared: none/single/double/triple. */
const TSPIN_POINTS = [400, 800, 1200, 1600];
const TSPIN_MINI_POINTS = [100, 200, 400, 400];

export type TSpinKind = "mini" | "full" | null;

export interface ActivePiece {
  type: PieceType;
  /** index into ROTATIONS[type] */
  rot: number;
  /** bounding-box origin on the board */
  x: number;
  y: number;
  /** palette index, rolled when the piece entered the queue */
  color: number;
}

/** A dealt piece: shape from the bag, color rolled fresh. */
export interface QueuedPiece {
  type: PieceType;
  color: number;
}

export interface ClearedCell {
  x: number;
  y: number;
  kind: number;
}

export type EngineEvent =
  | { type: "spawn"; piece: QueuedPiece }
  | { type: "move" }
  | { type: "rotate" }
  | {
      type: "lock";
      cells: ClearedCell[];
      hardDropped: boolean;
      distance: number;
      tspin: TSpinKind;
      /** points awarded for a twist that cleared no rows */
      twistPoints: number;
    }
  | {
      type: "clear";
      rows: number[];
      count: number;
      points: number;
      combo: number;
      backToBack: boolean;
      tetris: boolean;
      tspin: TSpinKind;
    }
  | { type: "collapse"; rows: number[]; cells: ClearedCell[] }
  | { type: "softscore" } // soft-drop points trickle in; HUD wants to know
  | { type: "level"; level: number }
  | { type: "hold"; held: QueuedPiece | null; swapped: QueuedPiece | null }
  | { type: "gameover"; score: number };

export type Phase = "ready" | "play" | "clearing" | "over";

export class TetrisEngine {
  grid = new Uint16Array(COLS * ROWS);
  active: ActivePiece | null = null;
  ghostY = 0;
  queue: QueuedPiece[] = [];
  held: QueuedPiece | null = null;
  canHold = true;

  phase: Phase = "ready";
  paused = false;
  clearingRows: number[] = [];
  clearProgress = 0; // 0..1 while phase === "clearing"

  score = 0;
  lines = 0;
  level = 1;
  /** Consecutive locking clears; -1 when the streak is broken. */
  streak = -1;
  maxStreak = 0;
  backToBack = false;
  piecesLocked = 0;
  /** Bumped on every spawn — the renderer snaps pose interpolation on change. */
  spawnNonce = 0;
  startTime = 0;

  private bag: PieceType[] = [];
  private dropAcc = 0;
  private lockTimer = 0;
  private lockResets = 0;
  private softDrop = false;
  private lastDropDistance = 0;
  private spawnTimer = -1;
  private lastColor = -1;
  /** T-spin detection: only a rotation (with its kick) can set up a twist. */
  private lastActionWasRotation = false;
  private lastKickIndex = 0;

  /** Reset everything and deal the first pieces. Returns the spawn events. */
  start(): EngineEvent[] {
    this.grid.fill(0);
    this.bag = [];
    this.queue = [];
    this.held = null;
    this.lastColor = -1;
    this.canHold = true;
    this.active = null;
    this.clearingRows = [];
    this.clearProgress = 0;
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.streak = -1;
    this.maxStreak = 0;
    this.backToBack = false;
    this.piecesLocked = 0;
    this.dropAcc = 0;
    this.lockTimer = 0;
    this.lockResets = 0;
    this.softDrop = false;
    this.lastActionWasRotation = false;
    this.lastKickIndex = 0;
    this.startTime = Date.now();
    this.phase = "play";

    this.refillQueue();
    return this.spawn();
  }

  /** Advance gravity, lock delay, entry delay and the clear animation. */
  step(dtMs: number): EngineEvent[] {
    if (this.paused) return [];
    if (this.phase === "clearing") {
      this.clearProgress = Math.min(
        1,
        this.clearProgress + dtMs / CLEAR_ANIM_MS
      );
      if (this.clearProgress >= 1) {
        return this.collapseRows();
      }
      return [];
    }
    if (this.phase !== "play") return [];

    // The ARE beat: no piece for a breath after a lock.
    if (this.spawnTimer >= 0) {
      this.spawnTimer -= dtMs;
      if (this.spawnTimer < 0) return this.spawn();
      return [];
    }
    if (!this.active) return [];

    const events: EngineEvent[] = [];
    const interval = this.softDrop
      ? Math.max(SOFT_DROP_MIN_MS, this.gravityMs() / 20)
      : this.gravityMs();

    let softPoints = 0;
    this.dropAcc += dtMs;
    while (this.dropAcc >= interval) {
      this.dropAcc -= interval;
      if (this.canPlace(this.active, 0, 1)) {
        this.active.y += 1;
        if (this.softDrop) softPoints += 1;
        this.refreshGhost();
      } else {
        this.dropAcc = 0;
        break;
      }
    }
    if (softPoints > 0) {
      this.score += softPoints;
      events.push({ type: "softscore" });
    }

    // Lock delay only ticks while the piece is resting on something. Moving
    // or rotating resets it (capped), so an active player never gets a piece
    // snatched out from under them — and a staller runs out of resets.
    if (!this.canPlace(this.active, 0, 1)) {
      this.lockTimer += dtMs;
      if (this.lockTimer >= LOCK_DELAY_MS || this.lockResets >= MAX_LOCK_RESETS) {
        return events.concat(this.lockPiece(false));
      }
    } else {
      this.lockTimer = 0;
    }

    return events;
  }

  /** True when the player can influence the falling piece right now. */
  get controllable() {
    return this.phase === "play" && !this.paused && this.active !== null;
  }

  /** Slide the active piece sideways. */
  moveActive(dx: number): EngineEvent[] {
    if (!this.controllable) return [];
    const piece = this.active!;
    if (this.canPlace(piece, dx, 0)) {
      piece.x += dx;
      this.lastActionWasRotation = false;
      this.touchLockDelay();
      this.refreshGhost();
      return [{ type: "move" }];
    }
    return [];
  }

  /** Rotate the active piece clockwise (dir=1) or counter-clockwise (dir=-1). */
  rotateActive(dir: 1 | -1): EngineEvent[] {
    if (!this.controllable) return [];
    const piece = this.active!;
    const from = piece.rot;
    const to = (from + dir + 4) % 4;
    const kicks = kicksFor(piece.type, from, to);

    for (let i = 0; i < kicks.length; i++) {
      const [dx, dy] = kicks[i];
      const nx = piece.x + dx;
      const ny = piece.y + dy;
      if (this.fits(piece.type, to, nx, ny)) {
        piece.rot = to;
        piece.x = nx;
        piece.y = ny;
        this.lastActionWasRotation = true;
        this.lastKickIndex = i;
        this.touchLockDelay();
        this.refreshGhost();
        return [{ type: "rotate" }];
      }
    }
    return [];
  }

  /** Instantly drop on the ghost and lock. */
  hardDrop(): EngineEvent[] {
    if (!this.controllable) return [];
    const piece = this.active!;
    const distance = this.ghostY - piece.y;
    piece.y = this.ghostY;
    this.score += distance * 2;
    this.lastDropDistance = distance;
    return this.lockPiece(true);
  }

  setSoftDrop(on: boolean) {
    this.softDrop = on;
  }

  /**
   * Stash the active piece (or swap with the stash). One hold per drop —
   * it becomes available again once the stashed piece locks.
   */
  swapHold(): EngineEvent[] {
    if (!this.controllable || !this.canHold) return [];
    const active = this.active!;
    const current: QueuedPiece = { type: active.type, color: active.color };
    const swapped = this.held;
    this.held = current;
    this.canHold = false;
    const events: EngineEvent[] = [{ type: "hold", held: current, swapped }];
    const spawn = this.spawn(swapped ?? undefined);
    return events.concat(spawn);
  }

  /** World x of the active piece's left edge — the touch layer's rail. */
  get activeX() {
    return this.active?.x ?? 0;
  }

  private gravityMs() {
    return GRAVITY_TABLE[Math.min(this.level, MAX_LEVEL) - 1];
  }

  private refillQueue() {
    while (this.queue.length < 7) {
      if (this.bag.length === 0) this.bag = createBag();
      const type = this.bag.pop() as PieceType;
      this.queue.push({ type, color: this.rollColor() });
    }
  }

  /** A fresh color per piece; one reroll against an immediate repeat. */
  private rollColor(): number {
    let color = Math.floor(Math.random() * BLOCK_COLOR_COUNT);
    if (color === this.lastColor) {
      color = Math.floor(Math.random() * BLOCK_COLOR_COUNT);
    }
    this.lastColor = color;
    return color;
  }

  private spawn(forced?: QueuedPiece): EngineEvent[] {
    this.spawnTimer = -1;
    this.lastActionWasRotation = false;
    this.lastKickIndex = 0;
    const next = forced ?? this.drawNext();
    const piece: ActivePiece = {
      type: next.type,
      rot: 0,
      x: 3,
      y: SPAWN_Y,
      color: next.color,
    };
    this.active = piece;
    this.spawnNonce += 1;
    this.lockTimer = 0;
    this.lockResets = 0;

    if (!this.fits(piece.type, piece.rot, piece.x, piece.y)) {
      // Blocked at spawn — the stack reached the ceiling. Stack overflow.
      this.phase = "over";
      return [{ type: "gameover", score: this.score }];
    }

    this.refreshGhost();
    return [{ type: "spawn", piece: next }];
  }

  private drawNext(): QueuedPiece {
    this.refillQueue();
    const next = this.queue.shift() as QueuedPiece;
    this.refillQueue();
    return next;
  }

  private refreshGhost() {
    if (!this.active) {
      this.ghostY = 0;
      return;
    }
    let dy = 0;
    while (this.canPlace(this.active, 0, dy + 1)) dy += 1;
    this.ghostY = this.active.y + dy;
  }

  private touchLockDelay() {
    if (this.active && !this.canPlace(this.active, 0, 1)) {
      this.lockTimer = 0;
      this.lockResets += 1;
    }
  }

  private cellsOf(piece: ActivePiece, rot = piece.rot): ClearedCell[] {
    const cells = ROTATIONS[piece.type][rot];
    return cells.map(([cx, cy]) => ({
      x: piece.x + cx,
      y: piece.y + cy,
      kind: piece.color + 1,
    }));
  }

  private fits(type: PieceType, rot: number, x: number, y: number) {
    for (const [cx, cy] of ROTATIONS[type][rot]) {
      const bx = x + cx;
      const by = y + cy;
      if (bx < 0 || bx >= COLS || by >= ROWS) return false;
      if (by >= 0 && this.grid[by * COLS + bx] !== 0) return false;
    }
    return true;
  }

  private canPlace(piece: ActivePiece, dx: number, dy: number) {
    return this.fits(piece.type, piece.rot, piece.x + dx, piece.y + dy);
  }

  /**
   * The three-corner rule: a T lands twisted when its final action was a
   * rotation and at least three diagonal corners around its center are
   * occupied. Landing the kickless (±0) kick or the deep STSD kick decides
   * mini vs full.
   */
  private detectTSpin(piece: ActivePiece): TSpinKind {
    if (piece.type !== "T" || !this.lastActionWasRotation) return null;
    // Center of the T's 3x3 box.
    const cx = piece.x + 1;
    const cy = piece.y + 1;
    const corners: [number, number][] = [
      [cx - 1, cy - 1],
      [cx + 1, cy - 1],
      [cx - 1, cy + 1],
      [cx + 1, cy + 1],
    ];
    const filled = corners.map(([x, y]) => {
      const outOfBounds = x < 0 || x >= COLS || y < 0 || y >= ROWS;
      return outOfBounds || this.grid[y * COLS + x] !== 0;
    });
    const total = filled.filter(Boolean).length;
    if (total < 3) return null;

    // A full twist needs both corners BEHIND the pointing side (rot 0 = up)
    // or the deep STSD kick; the usual overhang slide-in is a mini.
    const [tl, tr, bl, br] = filled;
    const backPair: [boolean, boolean][] = [
      [bl, br], // pointing up → back is below
      [tl, bl], // pointing right → back is left
      [tl, tr], // pointing down → back is above
      [tr, br], // pointing left → back is right
    ];
    const [b1, b2] = backPair[piece.rot];
    if (this.lastKickIndex === 4 || (b1 && b2)) return "full";
    return "mini";
  }

  private lockPiece(hardDropped: boolean): EngineEvent[] {
    const piece = this.active;
    if (!piece) return [];
    const cells = this.cellsOf(piece);
    const tspin = this.detectTSpin(piece);

    for (const cell of cells) {
      if (cell.y >= 0 && cell.y < ROWS) {
        this.grid[cell.y * COLS + cell.x] = cell.kind;
      }
    }
    this.piecesLocked += 1;
    this.canHold = true;
    this.active = null;
    this.softDrop = false;
    this.lastActionWasRotation = false;

    // Lock out: the whole piece came to rest inside the vanish zone.
    if (cells.every((cell) => cell.y < HIDDEN_ROWS)) {
      this.phase = "over";
      return [
        {
          type: "lock",
          cells,
          hardDropped,
          distance: hardDropped ? this.lastDropDistance : 0,
          tspin: null,
          twistPoints: 0,
        },
        { type: "gameover", score: this.score },
      ];
    }

    const fullRows: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      let full = true;
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y * COLS + x] === 0) {
          full = false;
          break;
        }
      }
      if (full) fullRows.push(y);
    }

    let twistPoints = 0;
    if (fullRows.length === 0) {
      // A twist that clears nothing still pays: full twists ride (and keep)
      // the B2B ladder; minis pay base and leave the ladder untouched.
      this.streak = -1;
      if (tspin === "full") {
        twistPoints = TSPIN_POINTS[0] * this.level;
        if (this.backToBack) twistPoints = Math.floor(twistPoints * 1.5);
        this.backToBack = true;
        this.score += twistPoints;
      } else if (tspin === "mini") {
        twistPoints = TSPIN_MINI_POINTS[0] * this.level;
        this.score += twistPoints;
      } else {
        this.backToBack = false;
      }
    }

    const events: EngineEvent[] = [
      {
        type: "lock",
        cells,
        hardDropped,
        distance: hardDropped ? this.lastDropDistance : 0,
        tspin,
        twistPoints,
      },
    ];
    this.lastDropDistance = 0;

    if (fullRows.length === 0) {
      this.spawnTimer = ARE_MS;
      return events;
    }

    // Enter the flash window; scoring lands now, removal lands on collapse.
    this.phase = "clearing";
    this.clearingRows = fullRows;
    this.clearProgress = 0;

    const count = fullRows.length;
    const tetris = count === 4;

    // Back-to-back: tetrises and full T-spins keep the 1.5× ladder alive.
    const b2bEligible = tetris || tspin === "full";
    const wasBackToBack = b2bEligible && this.backToBack;
    let points: number;
    if (tspin === "full") {
      points = TSPIN_POINTS[Math.min(count, 3)] * this.level;
    } else if (tspin === "mini") {
      points = TSPIN_MINI_POINTS[Math.min(count, 3)] * this.level;
    } else {
      points = LINE_POINTS[count] * this.level;
    }
    if (wasBackToBack) points = Math.floor(points * 1.5);
    this.backToBack = b2bEligible;

    this.streak += 1;
    this.maxStreak = Math.max(this.maxStreak, this.streak);
    if (this.streak > 0) points += 50 * this.streak * this.level;

    this.score += points;
    this.lines += count;

    const nextLevel = Math.min(1 + Math.floor(this.lines / 10), MAX_LEVEL);
    const leveled = nextLevel !== this.level;
    this.level = nextLevel;

    events.push({
      type: "clear",
      rows: fullRows,
      count,
      points,
      combo: this.streak,
      backToBack: wasBackToBack,
      tetris,
      tspin,
    });
    if (leveled) events.push({ type: "level", level: this.level });
    return events;
  }

  private collapseRows(): EngineEvent[] {
    const rows = this.clearingRows;
    const cells: ClearedCell[] = [];
    for (const y of rows) {
      for (let x = 0; x < COLS; x++) {
        const value = this.grid[y * COLS + x];
        cells.push({
          x,
          y,
          kind: value & CELL_KIND_MASK,
        });
      }
    }

    // Remove cleared rows, shift everything above them down.
    const keep: number[][] = [];
    for (let y = 0; y < ROWS; y++) {
      if (!rows.includes(y)) {
        keep.push(Array.from(this.grid.slice(y * COLS, y * COLS + COLS)));
      }
    }
    this.grid.fill(0);
    let writeY = ROWS - 1;
    for (let i = keep.length - 1; i >= 0; i--) {
      this.grid.set(keep[i], writeY * COLS);
      writeY -= 1;
    }

    this.clearingRows = [];
    this.clearProgress = 0;
    this.phase = "play";

    const events: EngineEvent[] = [{ type: "collapse", rows, cells }];
    return events.concat(this.spawn());
  }
}
