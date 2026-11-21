"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ColorField } from "@/components/ui/color-field";
import { InlineEditField } from "@/components/ui/inline-edit-field";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type {
  AlignChoice,
  FontChoice,
  PositionChoice,
  SizeChoice,
} from "./presets";
import type { CardOptions, Overrides } from "./render";
import type { ShareTheme, Variant } from "./themes";

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

function QuoteOptions({
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
  const fillIsGradient = options.fill.kind === "mesh";
  const variantIsGradient = variant.fill.kind === "mesh";

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
          valueLabel={fillIsGradient ? "Gradient" : undefined}
          onChange={(background) => set({ background })}
          extra={
            variantIsGradient
              ? {
                  background: variant.swatch,
                  label: "Gradient",
                  active: fillIsGradient,
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

export { QuoteOptions };
