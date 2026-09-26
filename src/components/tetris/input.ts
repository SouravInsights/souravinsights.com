/**
 * Keyboard control with DAS/ARR auto-shift: a shift fires on press, the next
 * after a 160ms delayed-auto-shift, then every 40ms while held — the timing
 * every serious stacking game converged on. Left/right get the repeat
 * treatment; everything else fires once per keydown.
 */
import type { EngineEvent, TetrisEngine } from "./engine";

const DAS_MS = 160;
const ARR_MS = 40;

const GAME_KEYS = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowDown",
  "ArrowUp",
  "Space",
  "KeyZ",
  "KeyX",
  "KeyC",
  "KeyP",
]);

interface HeldKey {
  dasAcc: number;
  arrAcc: number;
}

export class KeyboardInput {
  enabled = false;
  onPauseRequest: (() => void) | null = null;

  private queue: EngineEvent[] = [];
  private held = new Map<string, HeldKey>();
  private attached = false;

  constructor(private engine: TetrisEngine) {}

  attach() {
    if (this.attached) return;
    this.attached = true;
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
  }

  detach() {
    if (!this.attached) return;
    this.attached = false;
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
  }

  /** Called every frame: drains queued events and applies held-key repeats. */
  poll(dtMs: number): EngineEvent[] {
    if (this.enabled) {
      this.held.forEach((state, code) => {
        if (code !== "ArrowLeft" && code !== "ArrowRight") return;
        state.dasAcc += dtMs;
        if (state.dasAcc < DAS_MS) return;
        state.arrAcc += dtMs;
        while (state.arrAcc >= ARR_MS) {
          state.arrAcc -= ARR_MS;
          this.push(this.engine.moveActive(code === "ArrowLeft" ? -1 : 1));
        }
      });
    }
    if (this.queue.length === 0) return [];
    return this.queue.splice(0, this.queue.length);
  }

  private push(events: EngineEvent[]) {
    if (events.length) this.queue.push(...events);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    if (!GAME_KEYS.has(e.code)) return;

    // A focused button must keep its own Space/Enter — otherwise the "Start"
    // button the player just pressed would re-fire mid-game on every Space.
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, a, input, textarea, select, [role='button']")) {
      return;
    }

    if (e.code === "KeyP" && !e.repeat) {
      e.preventDefault();
      this.onPauseRequest?.();
      return;
    }
    if (!this.enabled) return;

    e.preventDefault();
    if (e.repeat) return; // our own autorepeat keeps timing consistent

    switch (e.code) {
      case "ArrowLeft":
      case "ArrowRight":
        this.push(this.engine.moveActive(e.code === "ArrowLeft" ? -1 : 1));
        this.held.set(e.code, { dasAcc: 0, arrAcc: 0 });
        break;
      case "ArrowDown":
        this.engine.setSoftDrop(true);
        break;
      case "ArrowUp":
      case "KeyX":
        this.push(this.engine.rotateActive(1));
        break;
      case "KeyZ":
        this.push(this.engine.rotateActive(-1));
        break;
      case "Space":
        this.push(this.engine.hardDrop());
        break;
      case "KeyC":
        this.push(this.engine.swapHold());
        break;
    }
  };

  private handleKeyUp = (e: KeyboardEvent) => {
    if (e.code === "ArrowLeft" || e.code === "ArrowRight") {
      this.held.delete(e.code);
    }
    if (e.code === "ArrowDown") {
      this.engine.setSoftDrop(false);
    }
  };

  private handleBlur = () => {
    this.held.clear();
    this.engine.setSoftDrop(false);
  };
}
