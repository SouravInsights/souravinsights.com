"use client";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Dithering } from "@paper-design/shaders-react";
import { useReducedMotion } from "framer-motion";
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export type PreviewCardPayload = {
  url: string;
  name: string;
  previewImage?: string;
};

interface PreviewCardContextValue {
  isTouchDevice: boolean;
}

const PreviewCardContext = createContext<PreviewCardContextValue | null>(null);

function usePreviewCardContext() {
  const context = useContext(PreviewCardContext);
  if (!context) {
    throw new Error(
      "usePreviewCardContext must be used within a PreviewCardProvider"
    );
  }
  return context;
}

/** Images we've already decoded, so reopening a card doesn't re-preload. */
const loadedImages = new Set<string>();

/**
 * WebGL dither shader as the loading state, tuned to our palette: a slow,
 * low-contrast pattern that reads as texture rather than a spinner. Respects
 * reduced motion and falls back to a flat surface if WebGL is unavailable.
 */
function PreviewLoader() {
  const { isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-secondary">
      <Dithering
        speed={reduceMotion ? 0 : 0.08}
        shape="dots"
        type="8x8"
        size={2.4}
        scale={1.2}
        fit="cover"
        colorBack="#00000000"
        colorFront={isDarkMode ? "#33383d" : "#d3d3cc"}
        width="100%"
        height="100%"
        className="absolute inset-0"
      />
    </div>
  );
}

function PreviewFallback() {
  return (
    <div className="relative aspect-[40/21] w-full overflow-hidden bg-foreground/5">
      <PreviewLoader />
    </div>
  );
}

/**
 * Preloads the stored screenshot and shows a placeholder until it's ready, so
 * a slow image never flashes a broken frame or a third-party loading graphic.
 */
function PreviewImage({ src, name }: { src: string; name: string }) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(() =>
    loadedImages.has(src) ? "loaded" : "loading"
  );

  useEffect(() => {
    if (loadedImages.has(src)) {
      setStatus("loaded");
      return;
    }

    setStatus("loading");
    const image = new Image();
    image.onload = () => {
      loadedImages.add(src);
      setStatus("loaded");
    };
    image.onerror = () => setStatus("error");
    image.src = src;

    return () => {
      image.onload = null;
      image.onerror = null;
    };
  }, [src]);

  if (status === "error") return <PreviewFallback />;

  return (
    <div className="relative aspect-[40/21] w-full overflow-hidden bg-foreground/5">
      {status === "loading" && <PreviewLoader />}
      {status === "loaded" && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Preview of ${name}`}
          className="h-full w-full object-cover object-top"
        />
      )}
    </div>
  );
}

function PreviewCardBody({ payload }: { payload: PreviewCardPayload }) {
  return (
    <div className="flex flex-col">
      {payload.previewImage ? (
        <PreviewImage src={payload.previewImage} name={payload.name} />
      ) : (
        <PreviewFallback />
      )}
      <div className="border-t border-border px-3 py-2.5">
        <div className="truncate font-mono text-xs font-medium text-foreground">
          {payload.name}
        </div>
      </div>
    </div>
  );
}

const touchMediaQuery = "(hover: none)";

function subscribeTouchDevice(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(touchMediaQuery);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

function getSnapshotTouchDevice() {
  if (typeof window === "undefined") return false;
  return window.matchMedia(touchMediaQuery).matches;
}

function getServerSnapshotTouchDevice() {
  return false; // assume non-touch on the server
}

function useIsTouchDevice() {
  return useSyncExternalStore(
    subscribeTouchDevice,
    getSnapshotTouchDevice,
    getServerSnapshotTouchDevice
  );
}

export function PreviewCardProvider({ children }: { children: ReactNode }) {
  const isTouchDevice = useIsTouchDevice();

  return (
    <PreviewCardContext.Provider value={{ isTouchDevice }}>
      {/* Shared timing so moving between rows opens instantly once one is shown,
          mirroring briOS's single-tooltip feel. */}
      <TooltipPrimitive.Provider
        delayDuration={300}
        skipDelayDuration={100}
        disableHoverableContent
      >
        {children}
      </TooltipPrimitive.Provider>
    </PreviewCardContext.Provider>
  );
}

interface PreviewCardTriggerProps {
  payload: PreviewCardPayload;
  children: ReactNode;
  className?: string;
}

export function PreviewCardTrigger({
  payload,
  children,
  className,
}: PreviewCardTriggerProps) {
  const { isTouchDevice } = usePreviewCardContext();
  // Horizontal position of the cursor inside the row, so the card follows it
  // across the row (Radix exposes this as `alignOffset`).
  const [alignOffset, setAlignOffset] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    },
    []
  );

  if (isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const next = Math.max(0, event.clientX - rect.left);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => setAlignOffset(next));
  };

  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>
        <div className={className} onMouseMove={handleMouseMove}>
          {children}
        </div>
      </TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side="bottom"
          sideOffset={8}
          align="start"
          alignOffset={alignOffset}
          collisionPadding={20}
          avoidCollisions
          className={cn(
            "pointer-events-none z-50 w-[320px] overflow-hidden rounded-lg border border-border bg-background shadow-lg shadow-black/10",
            "origin-[var(--radix-tooltip-content-transform-origin)]",
            "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95",
            "data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95",
            "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
          )}
        >
          <PreviewCardBody payload={payload} />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}