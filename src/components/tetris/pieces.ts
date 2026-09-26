/**
 * Tetromino geometry: spawn states, rotation states and SRS wall kicks.
 *
 * Each piece lives in a bounding box (3×3, or 4×4 for I and O). The four
 * rotation states are computed by rotating the spawn cells clockwise inside
 * that box; the kicks are the SRS tables for J/L/S/T/Z and I, converted to
 * grid coordinates (y grows downward).
 */

export type PieceType = "I" | "O" | "T" | "S" | "Z" | "J" | "L";
export const PIECE_TYPES: PieceType[] = ["I", "O", "T", "S", "Z", "J", "L"];

export type Cell = readonly [number, number];

interface PieceDef {
  /** Bounding-box edge length the piece rotates inside. */
  size: 3 | 4;
  cells: Cell[];
}

const DEFS: Record<PieceType, PieceDef> = {
  I: {
    size: 4,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
    ],
  },
  O: {
    size: 4,
    cells: [
      [1, 0],
      [2, 0],
      [1, 1],
      [2, 1],
    ],
  },
  T: {
    size: 3,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 0],
    ],
  },
  S: {
    size: 3,
    cells: [
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
    ],
  },
  Z: {
    size: 3,
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
    ],
  },
  J: {
    size: 3,
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  L: {
    size: 3,
    cells: [
      [0, 1],
      [1, 1],
      [2, 1],
      [2, 0],
    ],
  },
};

/** Clockwise rotation inside the box: (x, y) → (n-1-y, x). */
function rotateCW(cells: Cell[], n: number): Cell[] {
  return cells.map(([x, y]) => [n - 1 - y, x] as Cell);
}

/**
 * cells[piece][rotation] — rotation 0 is spawn, 1 is one quarter-turn
 * clockwise, and so on. Cell order is preserved across all four states.
 */
export const ROTATIONS: Record<PieceType, Cell[][]> = PIECE_TYPES.reduce(
  (acc, type) => {
    const def = DEFS[type];
    if (type === "O") {
      acc[type] = [def.cells, def.cells, def.cells, def.cells];
      return acc;
    }
    const r1 = rotateCW(def.cells, def.size);
    const r2 = rotateCW(r1, def.size);
    const r3 = rotateCW(r2, def.size);
    acc[type] = [def.cells, r1, r2, r3];
    return acc;
  },
  {} as Record<PieceType, Cell[][]>
);

export const PIECE_SIZES: Record<PieceType, number> = {
  I: 4,
  O: 4,
  T: 3,
  S: 3,
  Z: 3,
  J: 3,
  L: 3,
};

type KickTable = Record<string, Cell[]>;

/**
 * SRS wall kicks for the J, L, S, T and Z pieces, converted to screen
 * coordinates (y grows downward). Indexed by "<from><to>" rotations.
 */
const KICKS_JLSTZ: KickTable = {
  "01": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "10": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "12": [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  "21": [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  "23": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  "32": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "30": [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  "03": [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};

/** The I piece gets its own kick table — it rotates in a bigger box. */
const KICKS_I: KickTable = {
  "01": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "10": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "12": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  "21": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "23": [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  "32": [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  "30": [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  "03": [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

const NO_KICKS: KickTable = { "01": [[0, 0]], "12": [[0, 0]], "23": [[0, 0]], "30": [[0, 0]] };

export function kicksFor(type: PieceType, from: number, to: number): Cell[] {
  if (type === "O") return NO_KICKS[`${from}${to}`] ?? [[0, 0]];
  const table = type === "I" ? KICKS_I : KICKS_JLSTZ;
  return table[`${from}${to}`] ?? [[0, 0]];
}

/**
 * A 7-bag randomizer: pull pieces from a shuffled bag of every type, so long
 * droughts and floods are impossible — the deal Tetris players expect.
 */
export function createBag(): PieceType[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/**
 * The block palette: classic tetromino hues, deepened a step for the warm
 * paper surface and lifted a step for the dark one.
 *
 * Unlike guideline Tetris, color is not welded to shape — each piece rolls a
 * fresh color when it enters the queue. The rules stay strictly standard,
 * but consecutive drops never look like the same game replayed.
 */
export const BLOCK_COLORS: Record<"light" | "dark", string[]> = {
  light: [
    "#0891b2", // cyan-600
    "#eab308", // yellow-500
    "#8b5cf6", // violet-500
    "#16a34a", // green-600
    "#dc2626", // red-600
    "#2563eb", // blue-600
    "#ea580c", // orange-600
  ],
  dark: [
    "#22d3ee", // cyan-400
    "#fde047", // yellow-300
    "#a78bfa", // violet-400
    "#4ade80", // green-400
    "#f87171", // red-400
    "#60a5fa", // blue-400
    "#fb923c", // orange-400
  ],
};

export const BLOCK_COLOR_COUNT = BLOCK_COLORS.light.length;

export function blockColor(index: number, dark: boolean): string {
  const palette = BLOCK_COLORS[dark ? "dark" : "light"];
  return palette[((index % palette.length) + palette.length) % palette.length];
}
