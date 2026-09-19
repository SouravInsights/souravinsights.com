import type { CatActivityState } from "./types";

export const TILE = 32;
export const DEFAULT_Z_INDEX = 2_147_483_646;

// Movement config
export const STEER_LERP = 0.3;
export const MAX_VEL_FACTOR = 1.5;

// Obstacle config
export const OBSTACLE_INTERVAL = 30;
export const MIN_OBSTACLE_AREA = 500;
export const OBSTACLE_SELECTOR =
  "h1,h2,h3,h4,h5,h6,p,blockquote,a,button,img,svg,picture,video,nav,header,label,[role='button'],[data-oneko-obstacle]";

// Grid / route config
export const CELL_SIZE = 16;
export const SPRITE_RADIUS = 8;
export const PATH_RECALC_INTERVAL = 10;
export const PATH_RECALC_MOUSE_CELLS = 2;
export const WAYPOINT_REACH_DIST = CELL_SIZE;

// Chat bubble config
export const BUBBLE_DISPLAY_FRAMES = 180;
export const BUBBLE_COOLDOWN_FRAMES = 120;
/** Pixels between mouse samples before we treat movement as a new heading */
export const MOUSE_LOOP_MIN_STEP = 5;
/** Total radians of cursor-heading spin to count as “going in circles” */
export const MOUSE_LOOP_WINDING_TRIGGER = 6.2;
/** Soft cap so winding doesn’t run away (about two full spins) */
export const MOUSE_LOOP_WINDING_CAP = 13;
/** Per logic frame decay so old spinning fades out */
export const MOUSE_LOOP_WINDING_DECAY = 0.96;

export const IDLE_MESSAGES = [
  "mrrp",
  "just sitting here.",
  "watching you.",
  "nothing much going on.",
  "taking it easy.",
  "this spot is good.",
  "purrr.",
  "hm.",
];
export const MOVING_MESSAGES = [
  "on my way.",
  "hold on.",
  "coming over.",
  "excuse me.",
  "just walking.",
  "almost there.",
];
export const CIRCLE_LOOP_MESSAGES = [
  "you're going in circles.",
  "getting dizzy.",
  "stop spinning.",
  "pick a direction.",
  "I can't follow this.",
  "enough of that.",
];
export const SLEEPING_MESSAGES = [
  "zzz.",
  "five more minutes.",
  "asleep for now.",
  "do not wake me.",
  "just resting my eyes.",
  "shh.",
];
export const SCRATCHING_MESSAGES = [
  "just an itch.",
  "one moment.",
  "hold on.",
  "scratch scratch.",
  "give me a second.",
];
export const TIRED_MESSAGES = [
  "tired.",
  "need a break.",
  "sleepy.",
  "that's enough for now.",
  "worn out.",
  "slowing down.",
];
export const WALL_SCRATCH_MESSAGES = [
  "sharpening my claws.",
  "just a scratch.",
  "this is mine.",
  "marking my spot.",
  "leaving my mark.",
];
export const ALERT_MESSAGES = [
  "hm?",
  "what was that.",
  "did you hear that.",
  "listening.",
  "something moved.",
  "on edge.",
];

export const FREERUN_MESSAGES = [
  "zoomies.",
  "gotta go.",
  "can't stop now.",
  "see you later.",
  "here I go.",
];
export const FREERUN_CHANCE = 0.06;
export const FREERUN_DURATION = 40;
export const DEFAULT_SPEED = 10;
export const DEFAULT_SCALE = 1;
export const DEFAULT_OPACITY = 1;
export const DEFAULT_ROTATION_AMOUNT = 15;
export const DEFAULT_IDLE_THRESHOLD_MS = 1000;
export const DEFAULT_VOLUME = 0.5;
export const DEFAULT_BUBBLE_CHANCE = 0.5;
export const DEFAULT_FOLLOW_DISTANCE = 20;
export const DEFAULT_ANIMATION_SPEED = 1;

// Wander mode: roam a fixed region instead of chasing the cursor.
export const WANDER_RETARGET_FRAMES = 240;
export const WANDER_PAUSE_FRAMES = 60;
export const WANDER_EDGE_MARGIN = 16;
// Give up on an unreachable spot (blocked by a keep-out zone, pathing dead-end) after ~1.5s.
export const WANDER_STUCK_FRAMES = 90;

// Played once when the cat catches the laser dot
export const LASER_CATCH_POOL = ["/cat-sounds/Cat_eat1.ogg", "/cat-sounds/Cat_eat2.ogg"];

// Sound pools keyed by activity label
const HISS_POOL = [
  "/cat-sounds/Cat_hiss1.ogg",
  "/cat-sounds/Cat_hiss2.ogg",
  "/cat-sounds/Cat_hiss3.ogg",
];
export const SOUND_POOLS: Record<CatActivityState, string[]> = {
  idle: [
    "/cat-sounds/Cat_idle1.ogg",
    "/cat-sounds/Cat_idle2.ogg",
    "/cat-sounds/Cat_idle3.ogg",
    "/cat-sounds/Cat_idle4.ogg",
  ],
  moving: [
    "/cat-sounds/Cat_baby_ambient1.ogg",
    "/cat-sounds/Cat_baby_ambient2.ogg",
    "/cat-sounds/Cat_baby_ambient3.ogg",
    "/cat-sounds/Cat_baby_ambient4.ogg",
    "/cat-sounds/Cat_baby_ambient5.ogg",
    "/cat-sounds/Cat_baby_ambient6.ogg",
    "/cat-sounds/Cat_baby_ambient7.ogg",
  ],
  sleeping: ["/cat-sounds/Cat_purr1.ogg", "/cat-sounds/Cat_purr2.ogg", "/cat-sounds/Cat_purr3.ogg"],
  scratchSelf: ["/cat-sounds/Cat_beg1.ogg", "/cat-sounds/Cat_beg2.ogg", "/cat-sounds/Cat_beg3.ogg"],
  scratchWallN: HISS_POOL,
  scratchWallS: HISS_POOL,
  scratchWallE: HISS_POOL,
  scratchWallW: HISS_POOL,
  tired: ["/cat-sounds/Cat_purreow1.ogg", "/cat-sounds/Cat_purreow2.ogg"],
  freerun: [
    "/cat-sounds/Cat_royal_ambient1.ogg",
    "/cat-sounds/Cat_royal_ambient2.ogg",
    "/cat-sounds/Cat_royal_ambient3.ogg",
    "/cat-sounds/Cat_royal_ambient4.ogg",
    "/cat-sounds/Cat_royal_ambient5.ogg",
    "/cat-sounds/Cat_royal_ambient6.ogg",
  ],
  alert: [
    "/cat-sounds/Stray_cat_idle1.ogg",
    "/cat-sounds/Stray_cat_idle2.ogg",
    "/cat-sounds/Stray_cat_idle3.ogg",
    "/cat-sounds/Stray_cat_idle4.ogg",
  ],
};

// Konami code
export const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "KeyB",
  "KeyA",
];
export const KONAMI_TARGET = KONAMI_SEQUENCE.join(",");

// Direction table — module-level so it's not re-allocated every frame
export const DIRECTION_RANGES = [
  { min: -22.5, max: 22.5, dir: "E" },
  { min: 22.5, max: 67.5, dir: "SE" },
  { min: 67.5, max: 112.5, dir: "S" },
  { min: 112.5, max: 157.5, dir: "SW" },
  { min: -157.5, max: -112.5, dir: "NW" },
  { min: -112.5, max: -67.5, dir: "N" },
  { min: -67.5, max: -22.5, dir: "NE" },
] as const;

// 8-directional neighbor offsets: [rowDelta, colDelta, movementCost]
export const NEIGHBOR_OFFSETS: [number, number, number][] = [
  [-1, 0, 1.0],
  [1, 0, 1.0],
  [0, -1, 1.0],
  [0, 1, 1.0],
  [-1, -1, Math.SQRT2],
  [-1, 1, Math.SQRT2],
  [1, -1, Math.SQRT2],
  [1, 1, Math.SQRT2],
];

export const defaultSpriteSets = {
  idle: [[-3, -3]],
  alert: [[-7, -3]],
  scratchSelf: [
    [-5, 0],
    [-6, 0],
    [-7, 0],
  ],
  scratchWallN: [
    [0, 0],
    [0, -1],
  ],
  scratchWallS: [
    [-7, -1],
    [-6, -2],
  ],
  scratchWallE: [
    [-2, -2],
    [-2, -3],
  ],
  scratchWallW: [
    [-4, 0],
    [-4, -1],
  ],
  tired: [[-3, -2]],
  sleeping: [
    [-2, 0],
    [-2, -1],
  ],
  N: [
    [-1, -2],
    [-1, -3],
  ],
  NE: [
    [0, -2],
    [0, -3],
  ],
  E: [
    [-3, 0],
    [-3, -1],
  ],
  SE: [
    [-5, -1],
    [-5, -2],
  ],
  S: [
    [-6, -3],
    [-7, -2],
  ],
  SW: [
    [-5, -3],
    [-6, -1],
  ],
  W: [
    [-4, -2],
    [-4, -3],
  ],
  NW: [
    [-1, 0],
    [-1, -1],
  ],
} as const;

export const IDLE_ANIMATION_DURATIONS: Record<string, number> = {
  sleeping: 80,
  scratchSelf: 24,
  tired: 40,
  scratchWallN: 24,
  scratchWallS: 24,
  scratchWallE: 24,
  scratchWallW: 24,
};

// Static colour tokens for the debug overlay. Hoisted to module scope so the
// object isn't reallocated every time the animation effect mounts/re-runs.
export const debugColor = {
  panelBg: "color-mix(in srgb, var(--background) 88%, transparent)",
  panelBorder: "color-mix(in srgb, var(--border) 70%, transparent)",
  panelText: "var(--foreground)",
  panelSubtle: "var(--muted-foreground)",
  controlBg: "color-mix(in srgb, var(--muted) 72%, transparent)",
  controlBorder: "var(--border)",
  accent: "var(--ring)",
  accentStrong: "var(--primary)",
  danger: "var(--destructive)",
  dangerSoft: "color-mix(in srgb, var(--destructive) 30%, transparent)",
  trail: "color-mix(in srgb, var(--ring) 60%, transparent)",
  trailDot: "color-mix(in srgb, var(--ring) 76%, transparent)",
  gridStroke: "color-mix(in srgb, var(--muted-foreground) 18%, transparent)",
};

export const DEFAULT_POSITION = {
  x: typeof window !== "undefined" ? window.innerWidth / 2 : 512,
  y: typeof window !== "undefined" ? window.innerHeight / 2 : 384,
};
