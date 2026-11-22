"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SidePanel } from "@/components/ui/side-panel";
import { QuoteOptions } from "./options";
import { QuoteCarousel } from "./carousel";
import { QuoteVariantPicker } from "./variant-picker";
import { QuoteActions } from "./actions";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MODES, type Mode } from "./presets";
import { THEMES, themeById } from "./themes";
import { cardToBlob, resolveOptions, type Overrides } from "./render";

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
/** Everything in the stage that is not the card: padding + top + chips + gaps. */
const STAGE_FIXED = 147;
const BAND_MIN = 220;
const BAND_MAX = 460;
const NO_OVERRIDES: Overrides = {};

export function ShareQuoteDialog({
  open,
  onOpenChange,
  quote,
  title,
  publication,
  context,
}: Props) {

  const [mode, setMode] = useState<Mode>("story");
  const [themeId, setThemeId] = useState(THEMES[0].id);
  const [variantByTheme, setVariantByTheme] = useState<Record<string, number>>(
    {}
  );
  const [overridesByTheme, setOverridesByTheme] = useState<
    Record<string, Overrides>
  >({});
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
  const variantIndex = variantByTheme[themeId] ?? 0;
  const overrides = overridesByTheme[themeId] ?? NO_OVERRIDES;
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

  const chooseTheme = useCallback((id: string) => setThemeId(id), []);

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

  const set = (patch: Overrides) =>
    setOverridesByTheme((all) => ({
      ...all,
      [themeId]: { ...(all[themeId] ?? {}), ...patch },
    }));

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
    setOverridesByTheme((all) => {
      const next = { ...(all[themeId] ?? {}) };
      for (const key of COLOR_KEYS) delete next[key];
      return { ...all, [themeId]: next };
    });
  const clear = (key: keyof Overrides) =>
    setOverridesByTheme((all) => {
      const next = { ...(all[themeId] ?? {}) };
      delete next[key];
      return { ...all, [themeId]: next };
    });

  const panel = (
    <QuoteOptions
      theme={theme}
      variant={variant}
      options={options}
      overrides={overrides}
      set={set}
      clear={clear}
      reset={() =>
        setOverridesByTheme((all) => ({ ...all, [themeId]: {} }))
      }
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

      <DialogContent className="flex w-auto !max-w-[96vw] flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-card p-0 text-foreground shadow-2xl data-[state=open]:!animate-[qs-palette-in_200ms_cubic-bezier(0.32,0.72,0,1)_backwards] data-[state=closed]:!animate-[qs-palette-out_150ms_ease-in_forwards] [&>button]:z-30 [&>button]:right-3 [&>button]:top-3.5 [&>button]:text-muted-foreground [&>button]:hover:text-foreground">
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
            className="flex min-w-0 flex-col bg-background pb-6 pt-3.5 transition-[border-radius] duration-[260ms] ease-[cubic-bezier(0.2,0,0,1)] w-[min(560px,94vw)] rounded-tl-[14px] data-[panel-open]:lg:rounded-tl-none lg:w-[560px]"
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
            <QuoteCarousel
              themes={THEMES}
              themeId={themeId}
              onThemeChange={chooseTheme}
              mode={mode}
              band={band}
              frameWidth={frameW}
              frameHeight={frameH}
              content={content}
              variantByTheme={variantByTheme}
              overridesByTheme={overridesByTheme}
            />

            <QuoteVariantPicker
              variants={theme.variants}
              value={variantIndex}
              onValueChange={(index) => {
                setVariantByTheme((all) => ({ ...all, [themeId]: index }));
                clearColorOverrides();
              }}
              label={`${theme.name} colors`}
              custom={hasColorOverrides}
            />
          </div>
        </div>

        <QuoteActions
          customize={customize}
          onCustomizeChange={setCustomize}
          status={status}
          statusText={statusText}
          onSave={save}
          onCopy={copy}
        />
      </DialogContent>
    </Dialog>
  );
}
