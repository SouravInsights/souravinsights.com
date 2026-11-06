"use client";

import { ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import { Check, CircleNotch, Pencil, X } from "@phosphor-icons/react";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useFeedback } from "@/hooks/useFeedback";

/** Drag distance or velocity past which the sheet dismisses. */
const DISMISS_OFFSET = 110;
const DISMISS_VELOCITY = 700;

export interface DetailSheetProps {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  isAdmin?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  saveState?: "idle" | "saving" | "saved";
  /** Left side of the meta row. */
  meta?: ReactNode;
  /** Shared-element id, so the frame grows out of the tile it was opened from. */
  layoutId?: string;
  mediaClassName?: string;
  mediaStyle?: React.CSSProperties;
  /** Full-width layer behind the frame, e.g. an ambient print. Fades with the
      chrome and is never part of the shared element, so the travel stays a
      clean scale of the frame. */
  mediaBackdrop?: ReactNode;
  media: ReactNode;
  children: ReactNode;
}

/** The transient save state. Only rendered when there is something to say. */
function SaveBadge({
  saveState,
}: {
  saveState?: "idle" | "saving" | "saved";
}) {
  return (
    <AnimatePresence>
      {saveState && saveState !== "idle" && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="inline-flex items-center gap-1 type-caption text-faint-foreground"
        >
          {saveState === "saving" ? (
            <CircleNotch className="h-3 w-3 animate-spin" />
          ) : (
            <Check className="h-3 w-3 text-green-700 dark:text-green-500" />
          )}
          {saveState === "saving" ? "Saving" : "Saved"}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

/**
 * The one detail panel on the site.
 *
 * Desktop: a centred card. Phone: the same card as a bottom sheet that drags
 * away. The media is the head of the card and carries the shared `layoutId`, so
 * it grows out of the grid tile it was opened from and returns there on close.
 * Close and edit float over the media as dark glass circles; the save state
 * sits in a quiet meta row at the top of the words.
 *
 * Every detail view renders this, and only this, so the two can never drift.
 */
export function DetailSheet({
  label,
  onClose,
  isAdmin,
  editing,
  onToggleEdit,
  saveState,
  meta,
  layoutId,
  mediaClassName,
  mediaStyle,
  mediaBackdrop,
  media,
  children,
}: DetailSheetProps) {
  const isDesktop = useMediaQuery("(min-width: 640px)");
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();
  const dragControls = useDragControls();
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // The sheet's own drag offset drives the backdrop, so the page behind fades
  // as the sheet is pulled away — the way a native sheet behaves.
  const dragY = useMotionValue(0);
  const backdropOpacity = useTransform(dragY, [0, 280], [1, 0], {
    clamp: true,
  });

  // Lock the page behind the panel, close on Escape, focus the close button,
  // and hand focus back to whatever opened the sheet. Mount-only: a re-run
  // would fight the user's own focus.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, []);

  const close = () => {
    feedback.press();
    onClose();
  };

  // The chrome waits almost the whole travel, so nothing reads as an empty
  // panel the media then fills.
  const reveal = reduceMotion
    ? { duration: 0 }
    : { duration: 0.2, delay: 0.26, ease: [0.23, 1, 0.32, 1] as const };

  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80";

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/40 backdrop-blur-md sm:bg-black/55"
        style={{ opacity: backdropOpacity }}
        aria-hidden="true"
        onClick={close}
      />

      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="relative flex max-h-[92svh] w-full flex-col sm:max-h-[min(92svh,56rem)] sm:max-w-3xl"
        style={{ y: dragY }}
        drag={isDesktop ? false : "y"}
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragSnapToOrigin
        dragMomentum={false}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (
            info.offset.y > DISMISS_OFFSET ||
            info.velocity.y > DISMISS_VELOCITY
          ) {
            close();
          }
        }}
      >
        {/* The surface as its own layer, so no opaque slab precedes the media. */}
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-t-lg border border-border bg-background shadow-2xl shadow-black/40 sm:rounded-lg"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
        />

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-t-lg sm:rounded-lg">
          {/* Phone-only grabber. A full-width strip with a generous touch
              target, not just the little pill. It is also the drag handle. */}
          <motion.div
            className="relative z-20 flex shrink-0 cursor-grab touch-none justify-center pb-2 pt-3 active:cursor-grabbing sm:hidden"
            onPointerDown={(event) => dragControls.start(event)}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reveal}
            aria-hidden="true"
          >
            <span className="h-1.5 w-10 rounded-full bg-foreground/20" />
          </motion.div>

          {/* The media head. The frame always carries the shared `layoutId`, so
              it grows out of the tile it was opened from; the page only picks
              the frame's shape and what goes inside it. */}
          <div className="relative z-10 flex w-full shrink-0 justify-center">
            {mediaBackdrop && (
              <motion.div
                aria-hidden="true"
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: "inset(0 round 0.5rem 0.5rem 0 0)" }}
                initial={reduceMotion ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={reveal}
              >
                {mediaBackdrop}
              </motion.div>
            )}

            <motion.div
              layoutId={layoutId}
              transition={{
                layout: { type: "tween", duration: 0.34, ease: [0.22, 1, 0.36, 1] },
              }}
              className={`relative z-10 shrink-0 overflow-hidden bg-black ${
                mediaClassName ?? "w-full"
              }`}
              style={{
                borderRadius: 0,
                clipPath: "inset(0 round 0.5rem 0.5rem 0 0)",
                ...mediaStyle,
              }}
            >
              {media}
            </motion.div>
          </div>

          {/* Words, a beat behind the media. */}
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reveal}
            className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="relative px-5 pt-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-7 sm:pt-6 sm:pb-8">
              {meta ? (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {meta}
                  <span className="ml-auto">
                    <SaveBadge saveState={saveState} />
                  </span>
                </div>
              ) : (
                <span className="absolute right-5 top-4 sm:right-7">
                  <SaveBadge saveState={saveState} />
                </span>
              )}

              {children}
            </div>
          </motion.div>
        </div>

        {isAdmin && onToggleEdit && (
          <motion.button
            type="button"
            onClick={() => {
              feedback.select();
              onToggleEdit();
            }}
            aria-pressed={editing}
            aria-label={editing ? "Done editing" : "Edit"}
            title={editing ? "Done editing" : "Edit"}
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reveal}
            className={`absolute right-14 top-3 z-30 sm:right-16 sm:top-4 ${iconButton} ${
              editing
                ? "bg-white text-black"
                : "bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-sm hover:bg-black/65"
            }`}
          >
            {editing ? (
              <Check className="h-4 w-4" />
            ) : (
              <Pencil className="h-3.5 w-3.5" />
            )}
          </motion.button>
        )}

        <motion.button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close"
          initial={reduceMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={reveal}
          className={`absolute right-3 top-3 z-30 sm:right-4 sm:top-4 ${iconButton} bg-black/45 text-white ring-1 ring-white/15 backdrop-blur-sm transition-colors hover:bg-black/65`}
        >
          <X className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </div>,
    document.body
  );
}
