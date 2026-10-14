import { OBSTACLE_INTERVAL, PATH_RECALC_INTERVAL, TILE, WANDER_EDGE_MARGIN } from "./constants";
import {
  catZoneRadius,
  collectZones,
  containsPoint,
  expandRect,
  isValidRect,
  nearestSafePoint,
  type OnekoZone,
  type ResolvedZone,
} from "./zones";
import type { CatRuntimeState, ObstacleRect, PathPoint } from "./types";
import type { CatAnimationDeps } from "./animation/deps";

export const EMPTY_ZONES: readonly OnekoZone[] = [];
export type ZoneRuntimeState = {
  definitions: readonly OnekoZone[];
  blocked: ObstacleRect[];
  favorites: ResolvedZone[];
  signature: string;
  targetId: string | null;
  visitFrames: number;
  cooldownFrames: number;
  chance: number;
  duration: number;
  movementTarget: PathPoint;
};

export function createZoneState(): ZoneRuntimeState {
  return {
    definitions: EMPTY_ZONES,
    blocked: [],
    favorites: [],
    signature: "",
    targetId: null,
    visitFrames: 0,
    cooldownFrames: 50,
    chance: 0.3,
    duration: 40,
    movementTarget: { x: 0, y: 0 },
  };
}

export function refreshZones(deps: CatAnimationDeps): boolean {
  const s = deps.stateRef.current,
    zones = s.zoneState;
  const resolved = collectZones(zones.definitions);
  const radius = catZoneRadius(s.scale);
  const signature = JSON.stringify([resolved, radius]);
  if (signature !== zones.signature) {
    zones.signature = signature;
    zones.blocked = resolved
      .filter((zone) => zone.type === "avoid")
      .map((zone) => expandRect(zone.rect, radius));
    zones.favorites = resolved.filter((zone) => zone.type === "attract");
    s.lastObstacleRefresh = -OBSTACLE_INTERVAL;
    s.lastPathRecalcFrame = -PATH_RECALC_INTERVAL;
  }
  if (!zones.blocked.length) {
    deps.el.style.visibility = "";
    deps.bubbleEl.style.visibility = "";
    return true;
  }
  // A confined region owns movement. Repositioning the cat to the nearest safe
  // viewport point would yank it out of an off-screen region.
  if (s.wanderCfg) {
    deps.el.style.visibility = "";
    deps.bubbleEl.style.visibility = "";
    return true;
  }
  const safe = nearestSafePoint(
    { x: s.nekoPosX, y: s.nekoPosY },
    zones.blocked,
    window.innerWidth,
    window.innerHeight,
    radius,
  );
  deps.el.style.visibility = safe ? "" : "hidden";
  deps.bubbleEl.style.visibility = safe ? "" : "hidden";
  if (!safe) {
    s.nekoVelX = 0;
    s.nekoVelY = 0;
    return false;
  }
  if (safe.x !== s.nekoPosX || safe.y !== s.nekoPosY) {
    s.nekoPosX = safe.x;
    s.nekoPosY = safe.y;
    s.nekoVelX = 0;
    s.nekoVelY = 0;
    deps.el.style.left = `${safe.x - TILE / 2}px`;
    deps.el.style.top = `${safe.y - TILE / 2}px`;
    s.lastPathRecalcFrame = -PATH_RECALC_INTERVAL;
  }
  return true;
}

/** Resolve the wander region's current viewport rect, tracking scroll and resize. */
export function resolveWanderBounds(s: CatRuntimeState): ObstacleRect | null {
  const cfg = s.wanderCfg;
  if (!cfg) return null;
  if (cfg.selector) {
    try {
      const element = document.querySelector(cfg.selector);
      if (element) {
        const { left, top, right, bottom } = element.getBoundingClientRect();
        const rect = { left, top, right, bottom };
        return isValidRect(rect) ? rect : null;
      }
    } catch {
      /* A stale selector must not stop the cat. */
    }
  }
  return cfg.rect && isValidRect(cfg.rect) ? cfg.rect : null;
}

/**
 * Keep the cat inside its region. It has no motion of its own: the movement
 * target is the pointer while the pointer is active, and its own spot
 * otherwise, so it only ever walks to answer the cursor or a tap.
 */
function updateWanderTarget(s: CatRuntimeState): void {
  const zones = s.zoneState;
  const cfg = s.wanderCfg;
  const bounds = resolveWanderBounds(s);
  s.wanderBounds = bounds;
  if (!bounds || !cfg) {
    zones.movementTarget = { x: s.nekoPosX, y: s.nekoPosY };
    return;
  }
  const margin = Math.max(
    WANDER_EDGE_MARGIN,
    catZoneRadius(s.scale) + Math.max(0, cfg.padding ?? 0),
  );
  const usableW = bounds.right - bounds.left - margin * 2;
  const usableH = bounds.bottom - bounds.top - margin * 2;
  if (usableW <= 1 || usableH <= 1) {
    zones.movementTarget = { x: s.nekoPosX, y: s.nekoPosY };
    return;
  }

  // Pointer activity has a short memory. While it is fresh the cat reacts to
  // it; a parked cursor or a stale tap never keeps it chasing.
  if (s.pointerInterest > 0) s.pointerInterest--;
  const pointer = s.pointerTarget;
  if (s.followCursorCfg && s.pointerInterest > 0 && pointer) {
    let aim: PathPoint | null = null;
    if (containsPoint(bounds, pointer)) {
      aim = pointer;
    } else if (window.matchMedia?.("(hover: none)")?.matches) {
      // Touch screens have no hover, so a tap anywhere should still nudge the
      // cat. Aim at the nearest point inside the region, keeping its x.
      aim = {
        x: Math.min(Math.max(pointer.x, bounds.left + margin), bounds.right - margin),
        y: Math.min(Math.max(pointer.y, bounds.top + margin), bounds.bottom - margin),
      };
    }
    if (aim) {
      zones.movementTarget = aim;
      return;
    }
  }

  // Nothing to answer: hold position instead of roaming on its own.
  zones.movementTarget = { x: s.nekoPosX, y: s.nekoPosY };
}

/** A confined region takes over first; otherwise the cat chases the pointer and visits favorites. */
export function updateZoneTarget(
  s: CatRuntimeState,
  width: number,
  height: number,
  random = Math.random,
): void {
  const zones = s.zoneState;
  if (s.wanderCfg) {
    updateWanderTarget(s);
    return;
  }
  const oldId = zones.targetId;
  const radius = catZoneRadius(s.scale);
  const favorites = zones.favorites.filter((zone) => {
    const point = {
      x: (zone.rect.left + zone.rect.right) / 2,
      y: (zone.rect.top + zone.rect.bottom) / 2,
    };
    return (
      point.x >= radius &&
      point.x <= width - radius &&
      point.y >= radius &&
      point.y <= height - radius &&
      !zones.blocked.some((rect) => containsPoint(rect, point))
    );
  });
  // The laser toy and explicit debug controls keep priority over occasional visits.
  if (
    !s.followCursorCfg ||
    s.laserPointerCfg ||
    s.noFollow ||
    s.stateLocked ||
    zones.chance === 0
  ) {
    zones.targetId = null;
    zones.visitFrames = 0;
    zones.cooldownFrames = 50;
  } else if (zones.targetId) {
    zones.visitFrames--;
    if (zones.visitFrames <= 0 || !favorites.some((zone) => zone.id === zones.targetId)) {
      zones.targetId = null;
      zones.cooldownFrames = 80;
    }
  } else if (--zones.cooldownFrames <= 0) {
    zones.cooldownFrames = 50;
    if (favorites.length && random() < zones.chance) {
      const index = Math.min(favorites.length - 1, Math.floor(random() * favorites.length));
      zones.targetId = favorites[index].id;
      zones.visitFrames = zones.duration;
    }
  }
  const favorite = favorites.find((zone) => zone.id === zones.targetId);
  const desired = !s.followCursorCfg
    ? { x: s.nekoPosX, y: s.nekoPosY }
    : favorite
      ? {
          x: (favorite.rect.left + favorite.rect.right) / 2,
          y: (favorite.rect.top + favorite.rect.bottom) / 2,
        }
      : // The pointer's aim, not the raw cursor: over a control that is the point
        // outside it, so the cat stops beside the button rather than on it.
        (s.pointerTarget ?? { x: s.mousePosX, y: s.mousePosY });
  zones.movementTarget = zones.blocked.length
    ? (nearestSafePoint(desired, zones.blocked, width, height, radius) ?? {
        x: s.nekoPosX,
        y: s.nekoPosY,
      })
    : desired;
  if (oldId !== zones.targetId) s.lastPathRecalcFrame = -PATH_RECALC_INTERVAL;
}
