"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface CanvasDrawContext {
  /** Backing pixels per design pixel. */
  scale: number;
  width: number;
  height: number;
}

export interface CanvasProps extends Omit<
  React.CanvasHTMLAttributes<HTMLCanvasElement>,
  "width" | "height"
> {
  /** Design-space width. `draw` paints in this coordinate system. */
  width: number;
  /** Design-space height. */
  height: number;
  /** Backing pixels per CSS pixel. */
  pixelRatio?: number;
  /** Redraw when any of these change. */
  deps?: React.DependencyList;
  draw: (ctx: CanvasRenderingContext2D, context: CanvasDrawContext) => void;
}

/** A canvas that owns its backing size, DPR and repaint loop. */
const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(function Canvas(
  { width, height, pixelRatio = 2, deps = [], draw, className, style, ...props },
  forwardedRef,
) {
  const localRef = React.useRef<HTMLCanvasElement>(null);
  const drawRef = React.useRef(draw);
  drawRef.current = draw;

  React.useImperativeHandle(forwardedRef, () => localRef.current!);

  const paint = React.useCallback(() => {
    const canvas = localRef.current;
    if (!canvas) return;
    const box = canvas.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) return;
    const backingW = Math.round(box.width * pixelRatio);
    const backingH = Math.round(box.height * pixelRatio);
    if (canvas.width !== backingW) canvas.width = backingW;
    if (canvas.height !== backingH) canvas.height = backingH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = backingW / width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawRef.current(ctx, { scale, width, height });
  }, [height, pixelRatio, width]);

  React.useLayoutEffect(() => {
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, ...deps]);

  React.useEffect(() => {
    const canvas = localRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(paint);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  React.useEffect(() => {
    void document.fonts?.ready.then(paint);
  }, [paint]);

  return (
    <canvas
      ref={localRef}
      data-slot="canvas"
      width={width}
      height={height}
      className={cn("block", className)}
      style={style}
      {...props}
    />
  );
});
Canvas.displayName = "Canvas";

export { Canvas };
