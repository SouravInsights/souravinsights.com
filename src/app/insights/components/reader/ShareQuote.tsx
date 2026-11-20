"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy as CopyIcon,
  DownloadSimple,
  SlidersHorizontal,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  MODES,
  THEMES,
  cardToBlob,
  drawCard,
  resolveOptions,
  themeById,
  type AlignChoice,
  type CardOptions,
  type FontChoice,
  type Mode,
  type Overrides,
  type PositionChoice,
  type ShareTheme,
  type SizeChoice,
  type Variant,
} from "./share/cards";

/**
 * Share quote.
 *
 * The sheet's behaviour:
 *
 * 1. The card's HEIGHT is the fixed thing (the "band"); its width comes from the
 *    size's aspect ratio. The band is derived from the viewport, so the cards
 *    fill the modal at every screen size.
 * 2. The Customize panel animates its own WIDTH from 0 to 288px inside an
 *    overflow-hidden wrapper, and its contents are a fixed 288px wide. The sheet
 *    is content-sized, so it grows with the wrapper and nothing in the stage
 *    ever reflows — which is why the open/close has no flash.
 * 3. The carousel is a scroll-snap rail whose programmatic scroll is a SPRING,
 *    not `scrollIntoView`. During the glide it drops `scroll-snap-type` so the
 *    snap points don't fight the animation, and the active design is chosen from
 *    whichever slide is nearest the centre on scroll.
 *
 * Every control is a shadcn primitive (Select, Switch, Popover, Input, Textarea,
 * Separator, Label, Button, RadioGroup) on this site's tokens.
 */

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: string;
  title: string;
  publication: string;
  /** surrounding article text, for the faded-backdrop design */
  context: string;
}

const PANEL_W = 288;
const STAGE_W = 560;
const GAP = 29;
/** Everything in the stage that is not the card: padding + top + chips + gaps. */
const STAGE_FIXED = 147;
const BAND_MIN = 220;
const BAND_MAX = 460;
const DPR = 2;
/** The spring's stiffness and damping. */
const SPRING = 24;

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function ShareQuote({
  open,
  onOpenChange,
  quote,
  title,
  publication,
  context,
}: Props) {
  const panelWrapRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const previewRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const glideRef = useRef<{
    raf: number;
    x: number;
    v: number;
    target: number;
    last: number;
  } | null>(null);
  const scrollRaf = useRef(0);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastScroll = useRef(0);
  const activeRef = useRef(THEMES[0].id);

  const [mode, setMode] = useState<Mode>("story");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [variantIndex, setVariantIndex] = useState(0);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [customize, setCustomize] = useState(false);
  const [band, setBand] = useState(367);
  const [panelScrolled, setPanelScrolled] = useState(false);
  const [draftQuote, setDraftQuote] = useState(quote);
  const [draftTitle, setDraftTitle] = useState(title);
  const [draftPublication, setDraftPublication] = useState(publication);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">(
    "idle"
  );
  const [statusText, setStatusText] = useState("");
  // Client-only component, so the real answer is available before first paint.
  const [desktop, setDesktop] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 1024px)").matches
  );

  activeRef.current = themeId;

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // Each open starts from the highlighted words as they are now.
  useEffect(() => {
    if (!open) return;
    setDraftQuote(quote);
    setDraftTitle(title);
    setDraftPublication(publication);
    setStatus("idle");
  }, [open, quote, title, publication]);

  // The panel wrapper is focusable while collapsed unless it is inert.
  useEffect(() => {
    const el = panelWrapRef.current;
    if (!el) return;
    if (customize) el.removeAttribute("inert");
    else el.setAttribute("inert", "");
  }, [customize, desktop]);

  // The band: the card's height, derived from the viewport so the sheet fits.
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const available = window.innerHeight - 32 - (STAGE_FIXED + 52);
      setBand(Math.max(BAND_MIN, Math.min(BAND_MAX, Math.round(available))));
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [open]);

  const theme = themeById(themeId);
  const variant = theme.variants[variantIndex] ?? theme.variants[0];
  const content = useMemo(
    () => ({
      quote: draftQuote,
      title: draftTitle,
      publication: draftPublication,
      context,
    }),
    [draftQuote, draftTitle, draftPublication, context]
  );
  const options = useMemo(
    () => resolveOptions(theme, variant, overrides, content),
    [theme, variant, overrides, content]
  );

  const dims = MODES.find((m) => m.id === mode) ?? MODES[0];
  const frameH = band;
  const frameW = Math.round(band * (dims.width / dims.height));

  /* ---------------------------------------------------------- the carousel */

  const centerOf = useCallback((id: string) => {
    const el = carouselRef.current;
    const slide = el?.querySelector<HTMLElement>(`[data-slide="${id}"]`);
    if (!el || !slide) return null;
    return slide.offsetLeft + slide.offsetWidth / 2 - el.clientWidth / 2;
  }, []);

  const stopGlide = useCallback(() => {
    const g = glideRef.current;
    if (!g) return;
    cancelAnimationFrame(g.raf);
    glideRef.current = null;
    carouselRef.current?.classList.remove("qs-gliding");
  }, []);

  /** The spring that replaces `scrollIntoView` — snap is off while it runs. */
  const glideTo = useCallback(
    (id: string) => {
      const el = carouselRef.current;
      const target = centerOf(id);
      if (!el || target === null) return;
      if (prefersReduced()) {
        stopGlide();
        el.scrollLeft = target;
        return;
      }
      if (glideRef.current) {
        glideRef.current.target = target;
        return;
      }
      if (Math.abs(el.scrollLeft - target) < 1) return;
      el.classList.add("qs-gliding");
      const g = {
        x: el.scrollLeft,
        v: 0,
        target,
        last: performance.now(),
        raf: 0,
      };
      glideRef.current = g;
      const step = (now: number) => {
        const dt = Math.min(0.05, (now - g.last) / 1000);
        g.last = now;
        const a = g.x - g.target;
        const o = g.v + SPRING * a;
        const s = Math.exp(-SPRING * dt);
        g.x = g.target + (a + o * dt) * s;
        g.v = (o - SPRING * (a + o * dt)) * s;
        if (Math.abs(g.x - g.target) < 0.5 && Math.abs(g.v) < 30) {
          el.scrollLeft = g.target;
          stopGlide();
        } else {
          el.scrollLeft = g.x;
          g.raf = requestAnimationFrame(step);
        }
      };
      g.raf = requestAnimationFrame(step);
    },
    [centerOf, stopGlide]
  );

  const chooseTheme = useCallback(
    (id: string, glide = true) => {
      setThemeId(id);
      setVariantIndex(0);
      setOverrides({});
      if (glide) glideTo(id);
    },
    [glideTo]
  );

  /** Whichever slide is nearest the centre becomes active (rAF-throttled). */
  const onCarouselScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el) return;
    lastScroll.current = performance.now();
    cancelAnimationFrame(scrollRaf.current);
    scrollRaf.current = requestAnimationFrame(() => {
      // While a programmatic glide runs the target is already active.
      if (glideRef.current) return;
      const center = el.scrollLeft + el.clientWidth / 2;
      let nearest = activeRef.current;
      let best = Infinity;
      el.querySelectorAll<HTMLElement>("[data-slide]").forEach((slide) => {
        const d = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
        if (d < best) {
          best = d;
          nearest = slide.dataset.slide ?? nearest;
        }
      });
      if (nearest !== activeRef.current) chooseTheme(nearest, false);
    });
  }, [chooseTheme]);

  // Wheel steps the rail; a horizontal wheel (or a touch) cancels the glide.
  useEffect(() => {
    if (!open) return;
    const el = carouselRef.current;
    if (!el) return;
    let gate = 0;
    const onWheel = (event: WheelEvent) => {
      const steps = event.deltaMode === 1 || (Math.abs(event.deltaY) >= 50 && event.deltaX === 0);
      if (!steps) {
        if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) stopGlide();
        return;
      }
      if (event.ctrlKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now < gate) return;
      gate = now + 200;
      const ids = Array.from(
        el.querySelectorAll<HTMLElement>("[data-slide]")
      ).map((slide) => slide.dataset.slide ?? "");
      const next = ids[ids.indexOf(activeRef.current) + Math.sign(event.deltaY)];
      if (next) chooseTheme(next);
    };
    const onTouch = () => stopGlide();
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouch, { passive: true });
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouch);
    };
  }, [open, chooseTheme, stopGlide]);

  // Centre the active card instantly on open, on a size change, and on resize.
  useEffect(() => {
    if (!open) return;
    stopGlide();
    const el = carouselRef.current;
    const target = centerOf(activeRef.current);
    if (el && target !== null) el.scrollLeft = target;
    return stopGlide;
  }, [open, frameW, mode, centerOf, stopGlide]);

  /* ------------------------------------------------------------- painting */

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const paint = () => {
      if (cancelled) return;
      const scale = (frameW * DPR) / dims.width;
      THEMES.forEach((t, index) => {
        const canvas = previewRefs.current[index];
        const ctx = canvas?.getContext("2d");
        if (!canvas || !ctx) return;
        canvas.width = Math.round(dims.width * scale);
        canvas.height = Math.round(dims.height * scale);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
        drawCard(
          ctx,
          mode,
          t,
          resolveOptions(
            t,
            t.id === themeId ? variant : t.variants[0],
            t.id === themeId ? overrides : {},
            content
          )
        );
      });
    };
    paint();
    // Canvas ignores page fonts until they are ready; repaint once they are.
    void document.fonts?.ready.then(paint);
    return () => {
      cancelled = true;
    };
  }, [open, mode, themeId, variant, overrides, content, dims, frameW]);

  const flash = useCallback((text: string, ok: boolean) => {
    setStatus(ok ? "done" : "error");
    setStatusText(text);
    window.setTimeout(() => setStatus("idle"), 2000);
  }, []);

  const save = useCallback(async () => {
    if (status === "working") return;
    setStatus("working");
    const blob = await cardToBlob(mode, theme, options);
    if (!blob) return flash("Couldn’t draw the card.", false);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `quote-${mode}.png`;
    link.click();
    URL.revokeObjectURL(url);
    flash("Image saved", true);
  }, [status, mode, theme, options, flash]);

  const copy = useCallback(async () => {
    if (status === "working") return;
    setStatus("working");
    const blob = await cardToBlob(mode, theme, options);
    if (!blob) return flash("Couldn’t draw the card.", false);
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      flash("Image copied", true);
    } catch {
      flash("Clipboard blocked — use Save image.", false);
    }
  }, [status, mode, theme, options, flash]);

  // ⌘S / ⌘C while the studio is open, exactly as the buttons advertise.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      } else if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        void copy();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, save, copy]);

  const set = (patch: Overrides) => setOverrides((all) => ({ ...all, ...patch }));

  const panel = (
    <CustomizePanel
      theme={theme}
      options={options}
      overrides={overrides}
      set={set}
      reset={() => setOverrides({})}
      quote={draftQuote}
      setQuote={setDraftQuote}
      title={draftTitle}
      setTitle={setDraftTitle}
      publication={draftPublication}
      setPublication={setDraftPublication}
      onDone={() => setCustomize(false)}
      scrolled={panelScrolled}
    />
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <style>{`
        @keyframes qs-palette-in { from { opacity: 0; scale: .97 } }
        @keyframes qs-palette-out { to { opacity: 0; scale: .98 } }
        .qs-carousel { scroll-snap-type: x mandatory; }
        .qs-carousel.qs-gliding { scroll-snap-type: none; }
        .qs-slide {
          scroll-snap-align: center;
          scroll-snap-stop: always;
          transition: scale 240ms cubic-bezier(.2,0,0,1), opacity 150ms ease-out;
        }
        .qs-slide[data-peek="before"] { transform-origin: 100%; scale: .92; }
        .qs-slide[data-peek="after"]  { transform-origin: 0;    scale: .92; }
        .qs-slide[data-peek="before"]:hover,
        .qs-slide[data-peek="after"]:hover { scale: .95; }
        @media (prefers-reduced-motion: reduce) { .qs-slide { transition: none } }
      `}</style>

      <DialogContent className="flex w-auto max-w-[96vw] flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-background p-0 text-foreground shadow-2xl data-[state=open]:!animate-[qs-palette-in_200ms_cubic-bezier(0.32,0.72,0,1)_backwards] data-[state=closed]:!animate-[qs-palette-out_150ms_ease-in_forwards] [&>button]:z-30 [&>button]:right-3 [&>button]:top-3.5 [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
        <DialogTitle className="sr-only">Share quote</DialogTitle>

        <div className="relative flex">
          {/* Customize. On a desktop its column animates width; on a phone it
              slides over the stage, because two columns do not fit. */}
          {desktop ? (
            <div
              ref={panelWrapRef}
              aria-hidden={!customize}
              style={{ width: customize ? PANEL_W : 0 }}
              className="relative order-first shrink-0 overflow-hidden bg-background transition-[width] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)]"
            >
              {customize && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 z-[2] w-px bg-border"
                />
              )}
              <div
                ref={panelRef}
                style={{ width: PANEL_W }}
                onScroll={(event) =>
                  setPanelScrolled(event.currentTarget.scrollTop > 4)
                }
                className="absolute inset-y-0 right-0 overflow-y-auto overscroll-contain bg-background px-4 pb-5 [scrollbar-width:thin]"
              >
                {panel}
              </div>
            </div>
          ) : (
            <div
              ref={panelWrapRef}
              aria-hidden={!customize}
              onScroll={(event) =>
                setPanelScrolled(event.currentTarget.scrollTop > 4)
              }
              style={{
                translate: customize ? "0" : "-100%",
                opacity: customize ? 1 : 0,
                pointerEvents: customize ? "auto" : "none",
              }}
              className="absolute inset-y-0 left-0 z-20 w-[288px] overflow-y-auto overscroll-contain bg-background px-4 pb-5 shadow-[12px_0_32px_-12px_rgba(0,0,0,0.4)] transition-[translate,opacity] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] [scrollbar-width:thin]"
            >
              {panel}
            </div>
          )}

          <div
            className="flex min-w-0 flex-col bg-card transition-[border-radius] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)]"
            style={{
              width: desktop ? STAGE_W : `min(${STAGE_W}px, 94vw)`,
              paddingTop: 14,
              paddingBottom: 24,
              borderTopLeftRadius: desktop && customize ? 0 : 14,
              borderTopRightRadius: 14,
            }}
          >
            {/* Size */}
            <div className="flex h-[30px] items-center justify-center">
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="inline-flex h-auto items-center rounded-[9px] bg-foreground/[0.06] p-[2px]">
                  {MODES.map((m) => (
                    <TabsTrigger
                      key={m.id}
                      value={m.id}
                      title={m.tip}
                      className="h-[26px] rounded-[7px] px-3.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-foreground/[0.1] data-[state=active]:text-foreground data-[state=active]:shadow-none"
                    >
                      {m.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* The designs. The card's height is the band; its width follows the
                size's aspect, so Post and Square are wider. */}
            <div
              ref={carouselRef}
              tabIndex={0}
              role="group"
              aria-roledescription="carousel"
              aria-label="Styles"
              onScroll={onCarouselScroll}
              className="qs-carousel no-scrollbar relative flex items-center overflow-x-auto overflow-y-hidden outline-none [overscroll-behavior-x:contain]"
              style={{
                gap: GAP,
                marginTop: GAP - 12,
                height: band + 40,
                paddingTop: 12,
                paddingBottom: 28,
                paddingInline: `calc(50% - ${frameW / 2}px)`,
              }}
            >
              {THEMES.map((t, index) => {
                const activeIndex = THEMES.findIndex((x) => x.id === themeId);
                const active = themeId === t.id;
                const peek =
                  active ? "on" : index < activeIndex ? "before" : "after";
                return (
                  <div
                    key={t.id}
                    data-slide={t.id}
                    data-peek={peek}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={t.name}
                    aria-current={active || undefined}
                    style={{ width: frameW, height: frameH }}
                    onPointerDown={(event) =>
                      (pointerStart.current = {
                        x: event.clientX,
                        y: event.clientY,
                      })
                    }
                    onClick={(event) => {
                      const start = pointerStart.current;
                      const still =
                        !start ||
                        Math.hypot(event.clientX - start.x, event.clientY - start.y) <
                          4;
                      const recent = performance.now() - lastScroll.current < 150;
                      if (active || !still || recent) return;
                      chooseTheme(t.id);
                    }}
                    className="qs-slide group relative flex-none cursor-pointer"
                  >
                    <div className="relative h-full w-full overflow-hidden rounded-md shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05)] group-data-[peek=on]:shadow-[0_0_0_0.5px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.05),0_8px_24px_-6px_rgba(0,0,0,0.14)] dark:shadow-[0_0_0_0.5px_rgba(255,255,255,0.1)] dark:group-data-[peek=on]:shadow-[0_0_0_0.5px_rgba(255,255,255,0.1),0_10px_28px_-6px_rgba(0,0,0,0.6)]">
                      <canvas
                        ref={(el) => {
                          previewRefs.current[index] = el;
                        }}
                        style={{ width: frameW, height: frameH }}
                        aria-label={`${t.name} design preview`}
                        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* The active design's own variants. */}
            <RadioGroup
              aria-label={`${theme.name} colors`}
              value={String(variantIndex)}
              onValueChange={(value) => setVariantIndex(Number(value))}
              className="flex h-8 items-center justify-center gap-2.5"
              style={{ marginTop: -10 }}
            >
              {theme.variants.map((v, index) => (
                <RadioGroupItem
                  key={v.name}
                  value={String(index)}
                  aria-label={v.name}
                  title={v.name}
                  style={{ background: v.swatch }}
                  className="size-7 flex-none overflow-hidden rounded-full border-0 p-0 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-shadow duration-150 hover:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_3px_hsl(var(--muted-foreground))] data-[state=checked]:shadow-[0_0_0_2px_hsl(var(--card)),0_0_0_3.5px_hsl(var(--foreground))] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)] [&_svg]:hidden"
                />
              ))}
            </RadioGroup>
          </div>
        </div>

        {/* Actions. The two commands sit together at the right: the tinted one
            for saving, the solid one for copying, so the primary action reads
            as primary without a label saying so. */}
        <div className="flex h-[52px] items-center gap-2 rounded-b-[14px] border-t border-border bg-background px-3">
          <button
            type="button"
            aria-expanded={customize}
            onClick={() => setCustomize((c) => !c)}
            className={`inline-flex h-[30px] items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-medium transition-colors active:scale-[0.96] ${
              customize
                ? "bg-foreground/[0.1] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground"
            }`}
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Customize</span>
          </button>

          <div className="flex-1" />

          {status !== "idle" && (
            <span
              aria-live="polite"
              className={`mr-1 text-[12px] ${
                status === "error"
                  ? "text-red-600 dark:text-red-400"
                  : "text-muted-foreground"
              }`}
            >
              {statusText}
            </span>
          )}

          <button
            type="button"
            onClick={save}
            disabled={status === "working"}
            className="inline-flex h-[30px] min-w-[108px] items-center justify-center gap-1.5 rounded-lg bg-foreground/[0.06] px-3 text-[13.5px] font-medium text-foreground transition-[background-color,opacity,scale] duration-150 hover:bg-foreground/[0.1] active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45"
          >
            {status === "working" ? (
              <SpinnerGap className="size-3.5 animate-spin text-muted-foreground" />
            ) : (
              <DownloadSimple className="size-3.5 text-muted-foreground" />
            )}
            Save image
            <kbd className="ml-0.5 hidden font-medium opacity-55 sm:inline">
              ⌘S
            </kbd>
          </button>

          <button
            type="button"
            onClick={copy}
            disabled={status === "working"}
            className="inline-flex h-[30px] min-w-[112px] items-center justify-center gap-1.5 rounded-lg bg-foreground px-3 text-[13.5px] font-semibold text-background transition-[background-color,opacity,scale] duration-150 hover:opacity-90 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-45"
          >
            {status === "done" ? (
              <Check className="size-3.5 opacity-70" />
            ) : (
              <CopyIcon className="size-3.5 opacity-70" />
            )}
            Copy image
            <kbd className="ml-0.5 hidden font-medium opacity-55 sm:inline">
              ⌘C
            </kbd>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- controls */

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-3">
      <Label className="text-[13px] font-normal text-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Choice<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={(next) => onChange(next as T)}>
      <SelectTrigger
        aria-label={label}
        className="h-7 w-[116px] flex-none rounded-lg border-0 bg-foreground/[0.06] px-2.5 text-[13px] hover:bg-foreground/[0.1] focus:ring-2 focus:ring-ring/30"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            className="text-[13px]"
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ColorRow({
  label,
  value,
  onChange,
  presets,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets: string[];
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="-mx-2 flex h-9 w-[calc(100%+16px)] items-center gap-2.5 rounded-[9px] px-2 font-normal hover:bg-foreground/5"
        >
          <span
            className="size-5 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
            style={{ background: value }}
          />
          <span className="flex-1 text-left text-[13px] text-foreground">
            {label}
          </span>
          <span className="text-[12px] tabular-nums text-muted-foreground">
            {value.toUpperCase()}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[248px] p-3">
        <div className="flex flex-wrap gap-1.5">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              aria-label={preset}
              onClick={() => onChange(preset)}
              style={{ background: preset }}
              className="size-7 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.1)] transition-transform duration-150 hover:scale-110 dark:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.16)]"
            />
          ))}
        </div>
        <Separator className="my-3" />
        <div className="flex items-center justify-between">
          <Label className="text-[12px] font-normal text-muted-foreground">
            Custom
          </Label>
          <Input
            type="color"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="h-7 w-12 cursor-pointer border-0 bg-transparent p-0"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** One editable field: label, value, an Edit hint, and an optional switch. */
function TextRow({
  label,
  value,
  onChange,
  show,
  onToggle,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  show?: boolean;
  onToggle?: (checked: boolean) => void;
}) {
  const [editing, setEditing] = useState(false);
  return (
    <div className="-ml-2 flex min-h-11 items-center gap-3">
      <div className="min-w-0 flex-1">
        {editing ? (
          <Textarea
            autoFocus
            value={value}
            rows={2}
            spellCheck={false}
            onChange={(event) => onChange(event.target.value)}
            onBlur={() => setEditing(false)}
            className="min-h-0 resize-none bg-foreground/[0.06] px-2 py-1.5 text-[12.5px] leading-snug"
          />
        ) : (
          <Button
            type="button"
            variant="ghost"
            aria-label={`Edit ${label.toLowerCase()}`}
            onClick={() => setEditing(true)}
            className="group flex h-auto w-full items-center gap-2.5 rounded-[9px] px-2 py-1.5 text-left font-normal hover:bg-foreground/5"
          >
            <span className="flex min-w-0 flex-1 flex-col gap-px">
              <span className="text-[13px] leading-[18px] text-foreground">
                {label}
              </span>
              <span className="truncate text-[12px] leading-4 text-muted-foreground">
                {value}
              </span>
            </span>
            <span className="flex-none text-[12px] font-medium text-muted-foreground group-hover:text-foreground">
              Edit
            </span>
          </Button>
        )}
      </div>
      <div className="flex w-7 flex-none justify-end">
        {onToggle !== undefined && (
          <Switch
            aria-label={`Show ${label.toLowerCase()}`}
            checked={!!show}
            onCheckedChange={onToggle}
          />
        )}
      </div>
    </div>
  );
}

function CustomizePanel({
  theme,
  options,
  overrides,
  set,
  reset,
  quote,
  setQuote,
  title,
  setTitle,
  publication,
  setPublication,
  onDone,
  scrolled,
}: {
  theme: ShareTheme;
  options: CardOptions;
  overrides: Overrides;
  set: (patch: Overrides) => void;
  reset: () => void;
  quote: string;
  setQuote: (value: string) => void;
  title: string;
  setTitle: (value: string) => void;
  publication: string;
  setPublication: (value: string) => void;
  onDone: () => void;
  scrolled: boolean;
}) {
  const dirty = Object.keys(overrides).length > 0;
  const backgroundPresets = theme.variants.map((v: Variant) =>
    v.paint.kind === "solid" ? v.paint.color : v.paint.base
  );
  const textPresets = Array.from(new Set(theme.variants.map((v) => v.text)));

  return (
    <>
      <div
        className={`sticky top-0 z-[1] -mx-4 flex items-center justify-between border-b bg-background px-4 pb-2.5 pt-3.5 transition-colors duration-150 ${
          scrolled ? "border-border" : "border-transparent"
        }`}
      >
        <h3 className="text-[14px] font-semibold leading-[30px] text-foreground">
          Customize
        </h3>
        <div className="flex items-center gap-1">
          {dirty && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={reset}
              className="h-7 px-2 text-[12px] font-normal text-muted-foreground"
            >
              Reset
            </Button>
          )}
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onDone}
            className="h-7 px-2.5 text-[12px] lg:hidden"
          >
            Done
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 pt-2">
        <ColorRow
          label="Background"
          value={options.background}
          onChange={(background) => set({ background })}
          presets={backgroundPresets}
        />
        <ColorRow
          label="Text"
          value={options.text}
          onChange={(text) => set({ text })}
          presets={textPresets}
        />
      </div>

      <div className="mt-4">
        <Row label="Font">
          <Choice<FontChoice>
            label="Font"
            value={options.font}
            onChange={(font) => set({ font })}
            options={[
              { value: "serif", label: "Serif" },
              { value: "sans", label: "Sans" },
              { value: "mono", label: "Mono" },
            ]}
          />
        </Row>
      </div>

      <div className="mt-3 flex flex-col">
        <Row label="Size">
          <Choice<SizeChoice>
            label="Size"
            value={options.size}
            onChange={(size) => set({ size })}
            options={[
              { value: "small", label: "Small" },
              { value: "medium", label: "Medium" },
              { value: "large", label: "Large" },
            ]}
          />
        </Row>
        <Row label="Align">
          <Choice<AlignChoice>
            label="Align"
            value={options.align}
            onChange={(align) => set({ align })}
            options={[
              { value: "left", label: "Left" },
              { value: "center", label: "Center" },
            ]}
          />
        </Row>
        <Row label="Position">
          <Choice<PositionChoice>
            label="Position"
            value={options.position}
            onChange={(position) => set({ position })}
            options={[
              { value: "top", label: "Top" },
              { value: "middle", label: "Middle" },
              { value: "bottom", label: "Bottom" },
            ]}
          />
        </Row>
      </div>

      <Separator className="mb-1.5 mt-3" />

      <div className="flex flex-col">
        <TextRow label="Quote" value={quote} onChange={setQuote} />
        <TextRow
          label="Title"
          value={title}
          onChange={setTitle}
          show={options.showTitle}
          onToggle={(showTitle) => set({ showTitle })}
        />
        <TextRow
          label="Publication"
          value={publication}
          onChange={setPublication}
          show={options.showPublication}
          onToggle={(showPublication) => set({ showPublication })}
        />
      </div>
    </>
  );
}
