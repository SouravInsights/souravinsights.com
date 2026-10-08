import {
  MOUSE_LOOP_MIN_STEP,
  MOUSE_LOOP_WINDING_CAP,
  POINTER_INTEREST_FRAMES,
  POINTER_KEEP_OUT_SELECTOR,
} from "../constants";
import { catZoneRadius, expandRect, nearestSafePoint } from "../zones";
import type { CatRuntimeState, ObstacleRect, PathPoint } from "../types";
import type { CatAnimationDeps } from "./deps";

/** A control's box holds still while the page does; re-read it when the page moves. */
const controlRects = new WeakMap<Element, { rect: ObstacleRect; scrollX: number; scrollY: number }>();

/**
 * The point the cat is allowed to stand on when it answers the pointer.
 *
 * Usually that is the cursor itself. Over a control it is not: it is the nearest
 * point outside that control's box, so the cat still comes to you and stops
 * beside the button instead of on top of it. Reaching for a link should never
 * mean clicking through the cat.
 *
 * This is the keep-out rule and nothing else — a box the cat does not enter, and
 * the closest point outside it — with the element under the pointer standing in
 * for a declared zone. The same primitive serves both, which is the point: one
 * idea, applied to two sources of boxes.
 */
function pointerAim(s: CatRuntimeState, event: MouseEvent, x: number, y: number): PathPoint {
  const control =
    event.target instanceof Element ? event.target.closest(POINTER_KEEP_OUT_SELECTOR) : null;
  if (!control) return { x, y };

  const scrollX = window.scrollX;
  const scrollY = window.scrollY;
  let cached = controlRects.get(control);
  if (!cached || cached.scrollX !== scrollX || cached.scrollY !== scrollY) {
    const { left, top, right, bottom } = control.getBoundingClientRect();
    cached = { rect: { left, top, right, bottom }, scrollX, scrollY };
    controlRects.set(control, cached);
  }

  const radius = catZoneRadius(s.scale);
  const outside = nearestSafePoint(
    { x, y },
    [expandRect(cached.rect, radius)],
    window.innerWidth,
    window.innerHeight,
    radius,
  );
  return outside ?? { x, y };
}

export function createMouseMoveHandler(deps: CatAnimationDeps) {
  return (ev: MouseEvent) => {
    const mx = ev.clientX;
    const my = ev.clientY;
    const s = deps.stateRef.current;
    const px = s.mousePosX;
    const py = s.mousePosY;
    const dx = mx - px;
    const dy = my - py;
    const dist = Math.hypot(dx, dy);
    if (dist >= MOUSE_LOOP_MIN_STEP) {
      const ang = Math.atan2(dy, dx);
      if (s.loopPrevAngle !== null) {
        let d = ang - s.loopPrevAngle;
        while (d > Math.PI) {
          d -= 2 * Math.PI;
        }
        while (d < -Math.PI) {
          d += 2 * Math.PI;
        }
        s.mouseCircleWinding += d;
        if (s.mouseCircleWinding > MOUSE_LOOP_WINDING_CAP) {
          s.mouseCircleWinding = MOUSE_LOOP_WINDING_CAP;
        } else if (s.mouseCircleWinding < -MOUSE_LOOP_WINDING_CAP) {
          s.mouseCircleWinding = -MOUSE_LOOP_WINDING_CAP;
        }
      }
      s.loopPrevAngle = ang;
    }
    s.mousePosX = mx;
    s.mousePosY = my;
    // Wander mode reads this: recent pointer activity, wherever it happened.
    // It is also where the cat is told it may stand, which is not always where
    // the cursor is — see pointerAim.
    s.pointerTarget = pointerAim(s, ev, mx, my);
    s.pointerInterest = POINTER_INTEREST_FRAMES;
  };
}
