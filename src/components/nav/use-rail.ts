"use client";

import {
  useCallback,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useSidebar } from "@/components/ui/sidebar";

/**
 * The rail's width limits in px, and where its labels stop fitting. Compact on
 * purpose: the labels are single words, and the reference is the longest of
 * them. "Insights" at 14px mono is ~67px, the group's and the row's padding plus
 * the icon take 56px more, so words fit from 128 and a default of 144 leaves
 * them 88. A 224 ceiling is a reader's own choice and more than the labels can
 * ever use; the 320 this used to allow was 176px of nothing.
 */
export const RAIL_ICON = 76;
export const RAIL_MAX = 224;
export const RAIL_LABELS_FROM = 128;
/** The viewport from which the labelled rail fits — the breakpoint globals.css
    used to encode as a default width, and which is a default *state* now. */
const LABELLED_VIEWPORT = "(min-width: 1280px)";

const WIDTH_KEY = "railWidth";
const OPEN_KEY = "railOpen";
/**
 * The collapsed rail's own width, while a drag is moving it. shadcn draws a
 * collapsed rail at `--sidebar-width-icon` and an open one at
 * `--sidebar-width`, and it does not read `--rail-user` in the first case — so
 * a drag that starts on a collapsed rail has to move *both* values or nothing
 * moves at all. AppShell points that variable at this one, and it is unset at
 * rest, so the collapsed rail is still shadcn's 4.75rem.
 */
const ICON_WIDTH_VAR = "--rail-icon-user";

const clampWidth = (px: number) =>
  Math.min(RAIL_MAX, Math.max(RAIL_ICON, Math.round(px)));

/** One writer, so the drag and the effect below can never disagree. */
function writeRailWidth(px: number | null) {
  const root = document.documentElement;
  if (px === null) root.style.removeProperty("--rail-user");
  else root.style.setProperty("--rail-user", `${Math.round(px)}px`);
}

/**
 * The rail's width, as a preference rather than a breakpoint.
 *
 * shadcn's Sidebar owns *whether* the rail is open — the cookie, ⌘B, its own
 * trigger and its rail — and draws its two widths from CSS. What is left here is
 * the px value behind the open width, plus the drag that sets it, written to
 * `--rail-user`, which the provider points `--sidebar-width` at — and, for the
 * length of a drag, to `--rail-icon-user`, which carries the collapsed rail.
 *
 * The open flag is mirrored into localStorage for one reason: the library
 * decides how a *collapsed* rail is drawn (square buttons, tooltips), and a
 * reader who collapsed it yesterday should find it collapsed on the next page
 * load rather than after a frame of labels. So the flag is read back on mount.
 */
export function useRail() {
  const { open, setOpen } = useSidebar();
  const [width, setWidth] = useState<number | null>(null);

  // Preferences land after mount: the first paint has to match the server's, and
  // the server has no localStorage. Mount only, deliberately: this effect
  // depends on setOpen, whose identity changes with `open`, so giving it that
  // dependency made it re-read the *stale* stored flag after every change and
  // flip the rail straight back — which silently cancelled both ⌘B and the drag.
  useEffect(() => {
    const stored = Number(localStorage.getItem(WIDTH_KEY));
    if (Number.isFinite(stored) && stored >= RAIL_ICON && stored <= RAIL_MAX) {
      setWidth(Math.round(stored));
    }

    // Whether the rail is open has to agree with how wide it is. Below xl there
    // was no room for the labelled rail — measured, at 1024 a blog post was left
    // 443px of prose — so a first visit arrives with it collapsed, and a
    // reader's own collapse wins wherever they are. A reader who widens their
    // window past xl therefore keeps the collapsed rail until they open it:
    // that is one keystroke, and the alternative is guessing at their intent.
    const storedOpen = localStorage.getItem(OPEN_KEY);
    if (
      storedOpen === "false" ||
      (storedOpen === null && !window.matchMedia(LABELLED_VIEWPORT).matches)
    ) {
      setOpen(false);
    }

    // No transitions yet, so the corrections above are a jump rather than a
    // slide nobody asked for. Armed a frame later, once the settled rail has
    // been painted; its absence is what globals.css keys the suppression on.
    const frame = requestAnimationFrame(() => {
      document.documentElement.dataset.shellReady = "true";
    });

    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Publish the width — and only once a reader has chosen one. Until then the
  // breakpoint default in globals.css stands, which is what keeps a labelled
  // rail off a 768px screen.
  useEffect(() => {
    writeRailWidth(width);
  }, [width]);

  useEffect(() => {
    localStorage.setItem(OPEN_KEY, String(open));
  }, [open]);

  /**
   * Drag the edge. One write per frame, straight to the element — re-rendering
   * the rail sixty times a second to move a border is exactly what made this
   * feel sticky — and React hears about the width once, on release.
   *
   * Two things it must not do, both of which it used to:
   *
   *   - take its width from the handle. shadcn's strip is a 16px button parked
   *     on the rail's edge, so a click on it asked for a 16px rail and squeezed
   *     the whole shell into a sliver. The pointer's x *is* the width, because
   *     the rail is pinned to x=0.
   *   - treat a click as a resize. A press that never moved has no width to
   *     commit: it is shadcn's toggle, and it stays one.
   */
  const onResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      event.preventDefault();
      const handle = event.currentTarget;
      const root = document.documentElement;
      handle.setPointerCapture?.(event.pointerId);

      root.dataset.resizing = "true";

      const fromX = event.clientX;
      /** Where the rail was before the drag, to put back if it ends collapsed. */
      const committed = width;
      let next = RAIL_ICON;
      let moved = false;
      let frame = 0;
      // Tracked locally, not read from the hook: a drag writes the state at most
      // twice (past the label threshold and back), and reading `open` instead
      // would fire a redundant write every frame.
      let liveOpen = open;

      const paint = () => {
        frame = 0;
        writeRailWidth(next);
        // Both boxes, together: shadcn draws a collapsed rail at
        // --sidebar-width-icon, so without this a drag that starts collapsed
        // moves nothing until the release flips the state — the pointer pulls
        // and the rail just sits there. Writing both keeps the flip invisible,
        // because the open and collapsed boxes are the same width the instant.
        root.style.setProperty(ICON_WIDTH_VAR, `${next}px`);

        // Labels arrive with the pointer rather than at the end of the gesture,
        // and the collapsed state takes the box's shape back on the way down.
        const wantsLabels = next > RAIL_LABELS_FROM;
        if (wantsLabels !== liveOpen) {
          liveOpen = wantsLabels;
          setOpen(wantsLabels);
        }
      };

      const onMove = (move: PointerEvent) => {
        // Two pixels, on the pointer's own travel: comparing the pointer to the
        // rail's width instead used to read a click on the handle as a drag.
        if (!moved && Math.abs(move.clientX - fromX) > 2) moved = true;
        next = clampWidth(move.clientX);
        // At most one write a frame: a 120Hz trackpad otherwise asks for two
        // layouts a frame and the rail starts trailing the pointer.
        if (!frame) frame = requestAnimationFrame(paint);
      };

      const onUp = () => {
        // Flushed rather than dropped: a pointer that came back to where it
        // started can end the drag with the last frame still pending, and the
        // element would keep the width from the frame before it.
        if (frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        handle.releasePointerCapture?.(event.pointerId);

        // The collapsed rail's own width is shadcn's again; a release under the
        // label threshold therefore settles back to the icon rail instead of
        // resting at a width where the words are clipped.
        root.style.removeProperty(ICON_WIDTH_VAR);
        delete root.dataset.resizing;

        if (!moved) return;

        writeRailWidth(next);

        // A drag that moved is not a click — and shadcn's rail toggles the
        // sidebar on click, a click that still arrives after this pointerup. So
        // the next one is swallowed at the document, in the capture phase,
        // before React can see it.
        const swallow = (click: MouseEvent) => {
          click.preventDefault();
          click.stopPropagation();
          window.removeEventListener("click", swallow, true);
        };
        window.addEventListener("click", swallow, true);
        window.setTimeout(
          () => window.removeEventListener("click", swallow, true),
          350
        );

        if (next > RAIL_LABELS_FROM) {
          setWidth(next);
          localStorage.setItem(WIDTH_KEY, String(next));
        } else {
          setOpen(false);
          // The reader's last open width is still theirs: --rail-user goes back
          // to it, so the next open lands where they left it rather than where
          // this drag gave up.
          writeRailWidth(committed);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [open, setOpen, width]
  );

  return { onResizeStart };
}
