"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Copy as CopyIcon,
  DownloadSimple,
  Plus,
  SlidersHorizontal,
  SpinnerGap,
} from "@phosphor-icons/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { InlineEditField } from "@/components/ui/inline-edit-field";
import { Kbd } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Swatch, SwatchGroup } from "@/components/ui/swatch";
import { Toggle } from "@/components/ui/toggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { SidePanel } from "@/components/ui/side-panel";
import {
  SnapCarousel,
  SnapCarouselContent,
  SnapCarouselItem,
} from "@/components/ui/snap-carousel";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
} from "./cards";

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
 * Every control is a shadcn primitive (Select, Switch, Textarea, Separator,
 * Label, Button, RadioGroup) on this site's tokens.
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
const GAP = 29;
/** Everything in the stage that is not the card: padding + top + chips + gaps. */
const STAGE_FIXED = 147;
const BAND_MIN = 220;
const BAND_MAX = 460;
const DPR = 2;
const THEME_IDS = THEMES.map((theme) => theme.id);

export function ShareQuote({
  open,
  onOpenChange,
  quote,
  title,
  publication,
  context,
}: Props) {
  const previewRefs = useRef<(HTMLCanvasElement | null)[]>([]);
  const pointerStart = useRef<{ x: number; y: number } | null>(null);
  const lastScroll = useRef(0);

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

  // Each open starts from the highlighted words as they are now.
  useEffect(() => {
    if (!open) return;
    setDraftQuote(quote);
    setDraftTitle(title);
    setDraftPublication(publication);
    setStatus("idle");
  }, [open, quote, title, publication]);

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

  const chooseTheme = useCallback((id: string) => {
    setThemeId(id);
    setVariantIndex(0);
    setOverrides({});
  }, []);

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

  /**
   * The colour roles the current design actually paints. A variant is a preset
   * for all of them; a hand-picked colour is an override on top. The two must
   * not disagree: picking a variant clears the colour overrides, and editing a
   * colour leaves the variant row unselected.
   */
  const COLOR_KEYS = ["background", "text", "highlight", "highlightText"] as const;
  const hasColorOverrides = COLOR_KEYS.some(
    (key) => overrides[key] !== undefined
  );
  const clearColorOverrides = () =>
    setOverrides((all) => {
      const next = { ...all };
      for (const key of COLOR_KEYS) delete next[key];
      return next;
    });
  const clear = (key: keyof Overrides) =>
    setOverrides((all) => {
      const next = { ...all };
      delete next[key];
      return next;
    });

  const panel = (
    <CustomizePanel
      theme={theme}
      variant={variant}
      options={options}
      overrides={overrides}
      set={set}
      clear={clear}
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
      `}</style>

      <DialogContent className="flex w-auto max-w-[96vw] flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-card p-0 text-foreground shadow-2xl data-[state=open]:!animate-[qs-palette-in_200ms_cubic-bezier(0.32,0.72,0,1)_backwards] data-[state=closed]:!animate-[qs-palette-out_150ms_ease-in_forwards] [&>button]:z-30 [&>button]:right-3 [&>button]:top-3.5 [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
        <DialogTitle className="sr-only">Share quote</DialogTitle>

        <div className="relative flex">
          {/* Customize. On a desktop its column animates width; on a phone it
              slides over the stage, because two columns do not fit. */}
          <SidePanel
            open={customize}
            side="left"
            width={PANEL_W}
            onScroll={(event) =>
              setPanelScrolled(event.currentTarget.scrollTop > 4)
            }
            className="px-4 pb-5"
          >
            {panel}
          </SidePanel>

          <div
            data-panel-open={customize || undefined}
            className="flex min-w-0 flex-col bg-card pb-6 pt-3.5 transition-[border-radius] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] w-[min(560px,94vw)] rounded-tl-[14px] data-[panel-open]:lg:rounded-tl-none lg:w-[560px]"
          >
            {/* Size */}
            <div className="flex h-[30px] items-center justify-center">
              <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <TabsList className="inline-flex h-auto items-center rounded-md bg-foreground/[0.055] p-[3px]">
                  {MODES.map((m) => (
                    <TabsTrigger
                      key={m.id}
                      value={m.id}
                      title={m.tip}
                      className="h-[24px] rounded-sm px-4 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm"
                    >
                      {m.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>

            {/* The designs. The card's height is the band; its width follows the
                size's aspect, so Post and Square are wider. */}
            <SnapCarousel
              items={THEME_IDS}
              value={themeId}
              onValueChange={chooseTheme}
              gap={GAP}
              recenterKey={`${mode}-${frameW}`}
            >
              <SnapCarouselContent
                tabIndex={0}
                role="group"
                aria-roledescription="carousel"
                aria-label="Styles"
                onScroll={() => {
                  lastScroll.current = performance.now();
                }}
                style={{
                  marginTop: GAP - 12,
                  height: band + 40,
                  paddingTop: 12,
                  paddingBottom: 28,
                  paddingInline: `calc(50% - ${frameW / 2}px)`,
                }}
                className="no-scrollbar relative flex items-center overflow-x-auto overflow-y-hidden outline-none [overscroll-behavior-x:contain]"
              >
                {THEMES.map((t, index) => {
                  const active = themeId === t.id;
                  return (
                    <SnapCarouselItem
                      key={t.id}
                      value={t.id}
                      aria-label={t.name}
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
                          Math.hypot(
                            event.clientX - start.x,
                            event.clientY - start.y
                          ) < 4;
                        const recent =
                          performance.now() - lastScroll.current < 150;
                        if (active || !still || recent) return;
                        chooseTheme(t.id);
                      }}
                      className="group cursor-pointer"
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
                    </SnapCarouselItem>
                  );
                })}
              </SnapCarouselContent>
            </SnapCarousel>

            {/* The active design's own variants. A hand-picked colour is a
                custom layer on top of the preset, so the row clears its
                selection and says so rather than pretending a preset is in
                force. */}
            <div className="relative" style={{ marginTop: -10 }}>
              <SwatchGroup
                aria-label={`${theme.name} colors`}
                value={hasColorOverrides ? "" : String(variantIndex)}
                onValueChange={(value) => {
                  setVariantIndex(Number(value));
                  clearColorOverrides();
                }}
                className="h-8 justify-center gap-2.5"
              >
                {theme.variants.map((v, index) => (
                  <Swatch
                    key={v.name}
                    value={String(index)}
                    background={v.swatch}
                    label={v.name}
                    variant="ring"
                  />
                ))}
              </SwatchGroup>
              {hasColorOverrides && (
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium text-faint-foreground">
                  Custom
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions. The two commands sit together at the right: the tinted one
            for saving, the solid one for copying, so the primary action reads
            as primary without a label saying so. */}
        <div className="flex h-[52px] items-center gap-2 rounded-b-[14px] border-t border-border bg-card px-3">
          <Toggle
            type="button"
            aria-label="Customize"
            pressed={customize}
            onPressedChange={setCustomize}
            className="h-8 gap-1.5 rounded-md px-3 text-[13.5px] font-medium text-muted-foreground transition-colors hover:!bg-foreground/[0.08] hover:text-foreground active:scale-[0.97] data-[state=on]:!bg-foreground/[0.08] data-[state=on]:text-foreground"
          >
            <SlidersHorizontal className="size-3.5" />
            <span className="hidden sm:inline">Customize</span>
          </Toggle>

          <div className="flex-1" />

          {status !== "idle" && (
            <span
              aria-live="polite"
              className={`mr-1 text-[12px] ${
                status === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {statusText}
            </span>
          )}

          <Button
            type="button"
            variant="secondary"
            onClick={save}
            disabled={status === "working"}
            className="h-8 min-w-[108px] gap-1.5 rounded-md !bg-foreground/[0.06] px-3 text-[13.5px] font-medium text-foreground hover:!bg-foreground/[0.08]"
          >
            {status === "working" ? (
              <SpinnerGap className="size-3.5 animate-spin text-muted-foreground" />
            ) : (
              <DownloadSimple className="size-3.5 text-muted-foreground" />
            )}
            Save image
            <Kbd className="ml-0.5 hidden bg-transparent p-0 font-sans text-[11px] font-medium text-current opacity-55 sm:inline-flex">
              ⌘S
            </Kbd>
          </Button>

          <Button
            type="button"
            onClick={copy}
            disabled={status === "working"}
            className="h-8 min-w-[112px] gap-1.5 rounded-md bg-foreground px-3 text-[13.5px] font-semibold text-background hover:bg-foreground/90 active:scale-[0.97]"
          >
            {status === "done" ? (
              <Check className="size-3.5 opacity-70" />
            ) : (
              <CopyIcon className="size-3.5 opacity-70" />
            )}
            Copy image
            <Kbd className="ml-0.5 hidden bg-transparent p-0 font-sans text-[11px] font-medium text-current opacity-55 sm:inline-flex">
              ⌘C
            </Kbd>
          </Button>
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
      <Label className="text-[13px] font-normal text-foreground/85">{label}</Label>
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
        className="h-7 w-[116px] flex-none rounded-md border-0 bg-foreground/[0.055] px-2.5 text-[13px] text-foreground/85 hover:bg-foreground/[0.09] focus-visible:ring-2 focus-visible:ring-ring/30"
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

function CustomizePanel({
  theme,
  variant,
  options,
  overrides,
  set,
  clear,
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
  variant: Variant;
  options: CardOptions;
  overrides: Overrides;
  set: (patch: Overrides) => void;
  clear: (key: keyof Overrides) => void;
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
  const [openColor, setOpenColor] = useState<string | null>(null);
  const colorOpen = (key: string) => ({
    open: openColor === key,
    onOpenChange: (open: boolean) => setOpenColor(open ? key : null),
  });
  const isMarker = theme.style === "marker";
  const paintIsGradient = options.paint.kind === "mesh";
  const variantIsGradient = variant.paint.kind === "mesh";

  return (
    <>
      <div
        className={`sticky top-0 z-[1] -mx-4 flex items-center justify-between border-b bg-card px-4 pb-2.5 pt-3.5 transition-colors duration-150 ${
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

      <div className="mt-3 flex flex-col gap-1.5">
        <ColorField
          {...colorOpen("background")}
          label="Background"
          value={options.background}
          valueLabel={paintIsGradient ? "Gradient" : undefined}
          onChange={(background) => set({ background })}
          extra={
            variantIsGradient
              ? {
                  background: variant.swatch,
                  label: "Gradient",
                  active: paintIsGradient,
                  onSelect: () => clear("background"),
                }
              : undefined
          }
        />
        {isMarker ? (
          <>
            <ColorField
              {...colorOpen("highlight")}
              label="Highlight"
              value={options.highlight}
              onChange={(highlight) => set({ highlight })}
            />
            <ColorField
              {...colorOpen("quoteText")}
              label="Quote text"
              value={options.highlightText}
              onChange={(highlightText) => set({ highlightText })}
            />
            <ColorField
              {...colorOpen("footerText")}
              label="Footer text"
              value={options.text}
              onChange={(text) => set({ text })}
            />
          </>
        ) : (
          <ColorField
            {...colorOpen("text")}
            label="Text"
            value={options.text}
            onChange={(text) => set({ text })}
          />
        )}
      </div>

      <div className="mt-4">
        <Select
          value={options.font}
          onValueChange={(value) => set({ font: value as FontChoice })}
        >
          <SelectTrigger
            aria-label="Font"
            className="h-10 w-full rounded-md border-0 bg-foreground/[0.055] px-3 text-[17px] text-foreground/85 hover:bg-foreground/[0.08] focus-visible:ring-2 focus-visible:ring-ring/30"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {[
              { value: "serif", label: "Serif" },
              { value: "sans", label: "Sans" },
              { value: "mono", label: "Mono" },
            ].map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-3">
        <div>
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
      </div>

      <Separator className="mb-1.5 mt-3" />

      <div className="flex flex-col">
          <InlineEditField label="Quote" value={quote} onChange={setQuote} />
          <InlineEditField
            label="Title"
            value={title}
            onChange={setTitle}
            visible={options.showTitle}
            onVisibleChange={(showTitle) => set({ showTitle })}
          />
          <InlineEditField
            label="Publication"
            value={publication}
            onChange={setPublication}
            visible={options.showPublication}
            onVisibleChange={(showPublication) => set({ showPublication })}
          />
      </div>
    </>
  );
}
