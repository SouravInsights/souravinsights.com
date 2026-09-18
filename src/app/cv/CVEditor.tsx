"use client";

import React, { useState } from "react";
import { CVData, CVProjectLink } from "@/types/cv";
import { EditableField } from "@/components/EditableField";
import { saveCVData, loginAdmin } from "./actions";
import { cn } from "@/lib/utils";
import {
  Download,
  Check,
  Loader2,
  Eye,
  Edit2,
  Link as LinkIcon,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  Linkedin,
  ArrowUpRight,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CVEditorProps {
  initialData: CVData;
  isEditing: boolean;
  secretToLogin?: string;
}

/* ------------------------------------------------------------------ *
 * Presentation helpers. Module scope on purpose: every entry in every
 * section renders through the same components, so spacing and the type
 * scale cannot drift between Experience, Projects and Education.
 *
 * The page's metaphor is a typeset one-pager: hairlines, folio numerals,
 * mono dates, middot separators — and brand marks (favicons) where a name
 * alone would make the reader work harder than they should.
 * ------------------------------------------------------------------ */

const FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

const META = "text-[13px] leading-[1.5] text-muted-foreground";

/**
 * Inline links: the underline is a hairline until hover, so paragraphs stay
 * calm but link destinations are never ambiguous.
 */
const linkClass =
  "underline decoration-border decoration-1 underline-offset-[3px] transition-colors hover:text-foreground hover:decoration-foreground";

/**
 * The "plate" rule: favicons in this domain are black-on-transparent
 * surprisingly often (Vercel, Next.js, GitHub, Fastify…), which makes them
 * vanish on the dark surface. In dark mode every mark therefore sits on a
 * small paper-white plate — uniform treatment, no per-logo exceptions.
 * Light mode keeps the marks bare.
 */
const FAVICON_PLATE = "dark:rounded-[3px] dark:bg-white dark:p-px";

/**
 * Favicon fallback chain. The s2 endpoint 404s when a host has no icon,
 * which happens for subdomains (api.beenthere.page, webmcp.souravinsights.com)
 * even when the root domain has one — so we retry on the registrable domain
 * once, and only then hide the mark. Hiding (opacity, not removal) keeps the
 * layout identical either way.
 */
function hideBrokenIcon(event: React.SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  try {
    const host = new URL(img.src).searchParams.get("domain");
    if (host && !img.dataset.retried) {
      const rest = host.split(".").slice(1).join(".");
      if (rest.includes(".")) {
        img.dataset.retried = "1";
        img.src = `https://www.google.com/s2/favicons?domain=${rest}&sz=128`;
        return;
      }
    }
  } catch {
    /* fall through to hiding */
  }
  img.style.opacity = "0";
}

function withProtocol(url: string) {
  return url.startsWith("http") ? url : `https://${url}`;
}

/**
 * Company and project logos default to the site's favicon, the same way the
 * safetomerge landing page resolves favicons. An explicit logoUrl always wins.
 */
function faviconFor(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const hostname = new URL(withProtocol(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`;
  } catch {
    return undefined;
  }
}

/**
 * Display labels for the header links. The raw stored values stay untouched
 * (and are what the editor edits); in view mode the reader gets the tight
 * version: no protocol, no www, no trailing slash, handles where they help.
 */
function urlLabel(url: string): string {
  try {
    const parsed = new URL(withProtocol(url));
    const path = parsed.pathname.replace(/\/$/, "");
    return parsed.hostname.replace(/^www\./, "") + (path === "" ? "" : path);
  } catch {
    return url;
  }
}

function linkedinLabel(url: string): string {
  try {
    const parsed = new URL(withProtocol(url));
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length >= 2 && parts[0] === "in") return `in/${parts[1]}`;
    return urlLabel(url);
  } catch {
    return url;
  }
}

function xLabel(url: string): string {
  try {
    const parsed = new URL(withProtocol(url));
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (parts.length > 0) return `@${parts[parts.length - 1]}`;
    return urlLabel(url);
  } catch {
    return url;
  }
}

function yearOf(value: string): number | undefined {
  const match = value.match(/\d{4}/);
  return match ? Number(match[0]) : undefined;
}

/**
 * A section only shows a span when it actually holds dates. Skills and the
 * summary have none, so they get no span rather than a decorative one.
 * En dash, not a hyphen: this string is computed, never edited.
 */
function spanOf(items: Array<{ startDate: string; endDate: string }>): string | undefined {
  const years = items
    .flatMap((item) => [yearOf(item.startDate), yearOf(item.endDate)])
    .filter((year): year is number => typeof year === "number");
  if (years.length === 0) return undefined;
  const ongoing = items.some((item) => /present/i.test(item.endDate));
  return `${Math.min(...years)} – ${ongoing ? "Present" : Math.max(...years)}`;
}

/* X's mark exists in no version of lucide the site pins, so it ships inline.
   The path is X's official glyph; everything else in the header is lucide. */
function XLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
    </svg>
  );
}

/**
 * One header meta item: icon + value, optionally linked. `displayValue`
 * lets view mode show the tight label while edit mode keeps the raw value.
 */
function MetaItem({
  icon,
  value,
  displayValue,
  href,
  isLink = false,
  onChange,
  isEditing,
}: {
  icon: React.ReactNode;
  value: string;
  displayValue?: string;
  href?: string;
  isLink?: boolean;
  onChange: (value: string) => void;
  isEditing: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5", META)}>
      <span
        aria-hidden="true"
        className="flex h-3.5 w-3.5 items-center justify-center text-muted-foreground/60"
      >
        {icon}
      </span>
      <EditableField
        value={isEditing ? value : displayValue ?? value}
        onChange={onChange}
        isEditing={isEditing}
        href={!isEditing && isLink ? href : undefined}
        className={cn(
          isLink &&
            "underline decoration-transparent underline-offset-[3px] transition-[color,text-decoration-color] hover:text-foreground hover:decoration-muted-foreground/60"
        )}
      />
    </span>
  );
}

/**
 * Name or company rendered as an external link in view mode. The arrow
 * appears next to the text and nudges up-right on hover — affordance
 * without relying on the underline alone.
 */
/**
 * Bare mark at text size for mobile entity lines — the skills-row pattern:
 * an identity hint, no tile. Hidden from sm: up, where the gutter tile
 * carries the brand instead. Renders nothing when no mark can resolve, so
 * entries without links keep a flush left edge.
 */
function InlineMark({ imgUrl, linkUrl }: { imgUrl?: string; linkUrl?: string }) {
  const src = imgUrl || faviconFor(linkUrl);
  if (!src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
      onError={hideBrokenIcon}
      // mr-1 + this row's gap-1 = 8px before the name: at 4px the mark
      // read as if glued to the text.
      className={cn("mr-1 h-4 w-4 shrink-0 select-none object-contain sm:hidden", FAVICON_PLATE)}
    />
  );
}

function LinkedName({
  value,
  onChange,
  isEditing,
  href,
  className,
  leadingIcon,
}: {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
  href?: string;
  className: string;
  /** A mark glued to the name in this flex row's gap; when it renders null
      the name keeps its flush position. */
  leadingIcon?: React.ReactNode;
}) {
  return (
    <span className="group/ext inline-flex items-center gap-1">
      {leadingIcon}
      <EditableField
        value={value}
        onChange={onChange}
        isEditing={isEditing}
        href={!isEditing ? href : undefined}
        className={cn(className, href && linkClass)}
      />
      {href && !isEditing && (
        <ArrowUpRight
          aria-hidden="true"
          strokeWidth={2}
          className="h-3 w-3 shrink-0 text-muted-foreground/60 transition-[transform,color] duration-200 group-hover/ext:translate-x-px group-hover/ext:-translate-y-px group-hover/ext:text-foreground"
        />
      )}
    </span>
  );
}

/**
 * 36px tile centered in the 40px gutter column (text-column alignment is
 * untouched) with a 24px mark: the mark fills ~67% of the tile — before, a
 * 20px mark in a 40px tile made the wrapper dominate the logo.
 */
function Logo({
  imgUrl,
  linkUrl,
  isEditing,
}: {
  imgUrl?: string;
  linkUrl?: string;
  isEditing: boolean;
}) {
  const resolved = imgUrl || faviconFor(linkUrl);
  const href = linkUrl ? withProtocol(linkUrl) : undefined;

  const tile = cn(
    "relative mx-auto flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg",
    "bg-muted/60 ring-1 ring-inset ring-border/60",
    "transition-[background-color,box-shadow] duration-200",
    "group-hover/entry:bg-muted group-hover/entry:ring-border",
    FOCUS_RING
  );

  const mark = resolved ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt=""
      aria-hidden="true"
      loading="lazy"
      draggable={false}
      onError={hideBrokenIcon}
      className="h-6 w-6 select-none object-contain dark:rounded-[5px] dark:bg-white dark:p-[2px]"
    />
  ) : isEditing ? (
    <ImageIcon className="h-4 w-4 text-muted-foreground/40" />
  ) : null;

  if (!isEditing && href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={tile}>
        {mark}
      </a>
    );
  }
  return <div className={tile}>{mark}</div>;
}

function Dates({
  value,
  onChange,
  isEditing,
}: {
  value: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}) {
  return (
    <EditableField
      // En dash in view mode; the editor keeps the raw "A - B" so the
      // split-and-save round trip stays byte-identical.
      value={isEditing ? value : value.replace(/ - /g, " – ")}
      onChange={onChange}
      isEditing={isEditing}
      className={cn(META, "font-mono text-[12.5px] tabular-nums whitespace-nowrap")}
    />
  );
}

/* ------------------------------------------------------------------ *
 * Mobile-only progressive disclosure.
 *
 * On a phone, long bullet runs and wide tool grids stack into a wall of
 * text, so mobile shows just the lead and hides the rest behind a quiet
 * text toggle; the last visible line fades out as the continuation cue
 * instead of any chrome. Three rules keep this honest:
 *   1. Desktop (sm:+) always renders everything — the tail is expanded by
 *      CSS and the toggle is display:none.
 *   2. Edit mode renders everything — disclosure is a reading aid only.
 *   3. Content stays in the DOM in every state (no SEO/ATS cost).
 * ------------------------------------------------------------------ */

/** Collapsible region: 0fr→1fr grid-rows is the animation-friendly
    collapse trick; on desktop it is pinned open; unsupported browsers
    merely snap, which is an acceptable degradation. */
function DisclosureTail({
  id,
  open,
  className,
  children,
}: {
  id: string;
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={cn(
        "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr] sm:grid-rows-[1fr]",
        className
      )}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

function DisclosureToggle({
  id,
  open,
  hiddenCount,
  onToggle,
  className,
  inFlow = false,
  mobileOnly = true,
}: {
  id: string;
  open: boolean;
  hiddenCount: number;
  onToggle: () => void;
  className?: string;
  /** Stacked (default): below the content with a leading chevron, used by
      bullets. inFlow: an inline "+ N more" continuation glyph INSIDE a wrap
      list — it belongs to the sequence, so no chevron, the "+" is the cue. */
  inFlow?: boolean;
  /** Bullets disclose on mobile only; skills (which pass inFlow) disclose
      at every breakpoint. */
  mobileOnly?: boolean;
}) {
  return (
    <button
      type="button"
      aria-expanded={open}
      aria-controls={id}
      onClick={onToggle}
      className={cn(
        "text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
        mobileOnly && "sm:hidden",
        inFlow ? "inline-flex items-center" : "flex items-center gap-1.5 pt-2.5",
        FOCUS_RING,
        className
      )}
    >
      {!inFlow && (
        <ChevronDown
          aria-hidden="true"
          strokeWidth={2}
          className={cn("h-3 w-3 transition-transform duration-200 motion-reduce:transition-none", open && "-rotate-180")}
        />
      )}
      {open ? "Show less" : inFlow ? `+ ${hiddenCount} more` : `Show ${hiddenCount} more`}
    </button>
  );
}

/** Mobile rule of thumb: beyond 4 bullets, hold everything after the third. */
function Bullets({
  items,
  onChange,
  onAdd,
  isEditing,
}: {
  items: string[];
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  isEditing: boolean;
}) {
  const SHOWN = 3;
  const collapsible = !isEditing && items.length > SHOWN + 1;
  const [open, setOpen] = useState(false);
  const tailId = React.useId();

  const lead = collapsible ? items.slice(0, SHOWN) : items;
  const tail = collapsible ? items.slice(SHOWN) : [];

  const renderBullet = (bullet: string, index: number) => (
    <div key={index} className="relative pl-4">
      <span
        aria-hidden="true"
        className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-full bg-muted-foreground/40"
      />
      <EditableField
        as="div"
        value={bullet}
        onChange={(value) => onChange(index, value)}
        isEditing={isEditing}
        multiline
        className="text-[15px] leading-[1.65] text-foreground [text-wrap:pretty]"
      />
    </div>
  );

  return (
    <div className="mt-3 space-y-2.5">
      <div
        className={cn(
          "space-y-2.5",
          // The fade is the disclosure cue: the third bullet dissolves at
          // the fold, so the reader knows the list continues.
          collapsible &&
            !open &&
            "max-sm:[-webkit-mask-image:linear-gradient(180deg,black_68%,transparent)] max-sm:[mask-image:linear-gradient(180deg,black_68%,transparent)]"
        )}
      >
        {lead.map(renderBullet)}
      </div>

      {collapsible && (
        <>
          {/* No extra padding anywhere here: the parent's space-y already
              keeps the 10px rhythm, so tail and toggle read as more bullets,
              not as separate chrome. */}
          <DisclosureTail id={tailId} open={open}>
            <div className="space-y-2.5">{tail.map((bullet, i) => renderBullet(bullet, i + SHOWN))}</div>
          </DisclosureTail>
          <DisclosureToggle
            id={tailId}
            open={open}
            hiddenCount={tail.length}
            onToggle={() => setOpen((value) => !value)}
            className="pl-4 pt-1"
          />
        </>
      )}

      {isEditing && (
        <div className="pl-4">
          <button
            onClick={onAdd}
            className={cn(
              "rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
              FOCUS_RING
            )}
          >
            + Add bullet
          </button>
        </div>
      )}
    </div>
  );
}

/**
 * Section heading with a folio numeral, like a numbered section in a
 * printed document. The numeral is mono and muted so the order reads
 * as typesetting, not decoration.
 */
function SectionHead({ index, title, span }: { index: string; title: string; span?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border pb-3">
      <h2 className="flex items-baseline gap-2.5 text-[15px] font-semibold tracking-tight text-foreground">
        <span aria-hidden="true" className="font-mono text-[11px] tabular-nums tracking-normal text-muted-foreground/50">
          {index}
        </span>
        {title}
      </h2>
      {span && <span className={cn(META, "font-mono text-[12.5px] tabular-nums")}>{span}</span>}
    </div>
  );
}

/**
 * A project's outbound links (site extras, npm, GitHub…) sit inline under the
 * role as hairline-underlined text, separated by whitespace. No marks (the
 * entry titles carry none inline), no arrows (reserved for the primary name
 * links) — these are the quietest links on the page by design.
 */
function DestinationLinks({ links }: { links: CVProjectLink[] }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
      {links.map((link) => (
        <a
          key={link.url}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          // py-1/-my-1 grows the tap target by 8px without moving anything
          className={cn("rounded py-1 -my-1", META, linkClass, FOCUS_RING)}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Skill marks: a hand-maintained map from skill name → the domain whose
 * favicon stands in for the logo. Keys are normalized (lowercase,
 * parentheticals stripped), so "Next.js (App Router)" resolves via
 * "next.js". Anything unmapped falls back to a quiet monogram tile —
 * honest about having no brand mark, and keeps the row rhythm even.
 * ------------------------------------------------------------------ */

const SKILL_DOMAINS: Record<string, string> = {
  typescript: "typescriptlang.org",
  javascript: "javascript.info",
  react: "react.dev",
  "react native": "react.dev",
  "next.js": "nextjs.org",
  expo: "expo.dev",
  "node.js": "nodejs.org",
  tailwindcss: "tailwindcss.com",
  nativewind: "nativewind.dev",
  shadcn: "ui.shadcn.com",
  "radix ui": "radix-ui.com",
  tanstack: "tanstack.com",
  zustand: "pmnd.rs",
  jotai: "jotai.org",
  motion: "motion.dev",
  gsap: "gsap.com",
  tiptap: "tiptap.dev",
  "dnd-kit": "dndkit.com",
  fastify: "fastify.dev",
  postgresql: "postgresql.org",
  "drizzle orm": "orm.drizzle.team",
  neon: "neon.tech",
  zod: "zod.dev",
  "rest / openapi": "openapis.org",
  graphql: "graphql.org",
  prisma: "prisma.io",
  "better auth": "better-auth.com",
  razorpay: "razorpay.com",
  "google maps api": "developers.google.com",
  resend: "resend.com",
  openrouter: "openrouter.ai",
  replicate: "replicate.com",
  vllm: "vllm.ai",
  turborepo: "turbo.build",
  "github actions": "github.com",
  docker: "docker.com",
  vercel: "vercel.com",
  aws: "aws.amazon.com",
  cloudflare: "cloudflare.com",
  "npm packages": "npmjs.com",
  sentry: "sentry.io",
  betterstack: "betterstack.com",
  posthog: "posthog.com",
};

function normalizeSkill(name: string): string {
  return name.toLowerCase().replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

/** A skill's identity mark: its favicon, or a monogram tile when unmapped. */
function SkillMark({ name }: { name: string }) {
  const domain = SKILL_DOMAINS[normalizeSkill(name)];
  const src = domain ? faviconFor(domain) : undefined;

  if (src) {
    return (
      // Marks rest desaturated with a breath of opacity off, so the rows read
      // as quiet text with hints of identity; full color returns under hover,
      // where recognition does its work. (If grayscale ever feels too loud in
      // the other direction, raise the resting opacity — not the saturation.)
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        draggable={false}
        onError={hideBrokenIcon}
        className={cn(
          "h-[15px] w-[15px] select-none object-contain opacity-85 grayscale",
          "transition-[filter,opacity] duration-200 motion-reduce:transition-none",
          "group-hover/mark:grayscale-0 group-hover/mark:opacity-100",
          FAVICON_PLATE
        )}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-[15px] w-[15px] select-none items-center justify-center rounded-[3px] bg-muted text-[8px] font-semibold uppercase leading-none text-muted-foreground/70 ring-1 ring-inset ring-border/40"
    >
      {name.trim().charAt(0)}
    </span>
  );
}

/**
 * String skill groups render as a wrap of mark + name pairs in view mode.
 * Edit mode keeps the raw comma-separated field, since that is the stored
 * shape; the marks re-derive from it on save.
 */
function SkillItems({
  items,
  onChange,
  isEditing,
}: {
  items: string;
  onChange: (value: string) => void;
  isEditing: boolean;
}) {
  // Hooks before the early return: edit/preview toggling would otherwise
  // crash on a hook-count mismatch.
  const [open, setOpen] = useState(false);
  const gridId = React.useId();
  // Every breakpoint: the grid opens with one calm row (5 marks — the most
  // recognizable tools act as the précis), and the in-flow "+ N more"
  // counter that trails it reveals the rest. With the counter inline,
  // hiding even a single extra item is worth a toggle.
  const SHOWN = 5;

  if (isEditing) {
    return (
      <EditableField
        as="div"
        value={items}
        onChange={onChange}
        isEditing={isEditing}
        multiline
        className={cn(META, "leading-[1.7]")}
      />
    );
  }

  // Split only on commas OUTSIDE parentheses: "GraphQL (Relay, Apollo)" is
  // one skill with extra context, and a naive split would fabricate bogus
  // entries ("Apollo)") that would all fall back to meaningless monograms.
  const skills = items
    .split(/,(?![^(]*\))/)
    .map((item) => item.trim())
    .filter(Boolean);
  const collapsible = skills.length > SHOWN;



  // One container for ALL items: tail items hide individually below sm.
  // Splitting lead/tail into two flex containers would break wrap
  // continuity and maroon the last lead item on a row of its own.
  const renderSkill = (skill: string, index: number) => {

    // A trailing "(App Router)"-style qualifier is detail, not identity —
    // the mark comes from the base name, and the qualifier reads quieter.
    const parenMatch = skill.match(/^(.*?)(\s*\(.*\))$/);
    const hidden = collapsible && !open && index >= SHOWN;
    return (
      <span
        key={skill}
        className={cn("group/mark inline-flex items-center gap-1.5", hidden && "hidden")}
      >
        <SkillMark name={skill} />
        {/* Skill names carry ~80% ink: they are content, not metadata — the
            muted META tone went too far once the marks desaturated. Only the
            parenthetical qualifier keeps the receded meta tone. */}
        <span className="text-[13px] leading-[1.5] text-foreground/80">
          {parenMatch ? (
            <>
              {parenMatch[1]}
              <span className="text-muted-foreground/80">{parenMatch[2]}</span>
            </>
          ) : (
            skill
          )}
        </span>
      </span>
    );
  };

  return (
    <div id={gridId} className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
      {skills.map(renderSkill)}
      {collapsible && (
        <DisclosureToggle
          inFlow
          mobileOnly={false}
          id={gridId}
          open={open}
          hiddenCount={skills.length - SHOWN}
          onToggle={() => setOpen((value) => !value)}
        />
      )}
    </div>
  );
}

function AddSectionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded text-[13px] font-medium text-primary transition-opacity hover:opacity-70",
        FOCUS_RING
      )}
    >
      {children}
    </button>
  );
}

export function CVEditor({ initialData, isEditing: isUserAuthenticated, secretToLogin }: CVEditorProps) {
  const [data, setData] = useState<CVData>(initialData);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Derived state: edit controls only show for an authenticated user who is not previewing
  const isEditing = isUserAuthenticated && !isPreviewMode;

  // Track the first mount so we don't auto-save the initial data immediately
  const isFirstRender = React.useRef(true);

  React.useEffect(() => {
    if (secretToLogin) {
      loginAdmin(secretToLogin);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [secretToLogin]);

  // Auto-save logic
  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (!isEditing) return;

    setSaveStatus("saving");

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const res = await saveCVData(data);
      if (!res.success) {
        alert("Failed to save: " + res.error);
        setSaveStatus("idle");
      } else {
        setSaveStatus("saved");
        // Revert back to idle after a few seconds
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    }, 1500); // 1.5s debounce

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [data, isEditing]);

  const updateHeader = (key: keyof CVData["header"], value: string) => {
    setData((prev) => ({ ...prev, header: { ...prev.header, [key]: value } }));
  };

  /* Nested list updates. Each helper clones the entry it touches so React sees a
     new object, and the save effect fires once per edit. */
  const mutateAt = <K extends "workExperience" | "projects" | "education" | "skills">(
    key: K,
    index: number,
    mutate: (item: CVData[K][number]) => void
  ) => {
    setData((prev) => {
      const next = [...prev[key]] as CVData[K];
      next[index] = { ...next[index] };
      mutate(next[index]);
      return { ...prev, [key]: next };
    });
  };

  const [downloadStatus, setDownloadStatus] = useState<"idle" | "preparing" | "done" | "error">("idle");

  /**
   * The PDF is rendered on the server, so there is a real wait. We fetch it here
   * to own the progress state, then hand the blob to the browser. The element
   * stays an anchor, so modified clicks and "save link as" still behave natively.
   */
  const handleDownload = async (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;

    event.preventDefault();
    if (downloadStatus === "preparing") return;

    setDownloadStatus("preparing");

    try {
      const response = await fetch("/cv/pdf");
      if (!response.ok) throw new Error(`Request failed with ${response.status}`);

      const objectUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "sourav-nanda-cv.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      // Revoking too early can cancel the download in some browsers.
      setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);

      setDownloadStatus("done");
    } catch {
      setDownloadStatus("error");
    }
  };

  React.useEffect(() => {
    if (downloadStatus !== "done" && downloadStatus !== "error") return;
    const timer = setTimeout(
      () => setDownloadStatus("idle"),
      downloadStatus === "error" ? 4000 : 2600
    );
    return () => clearTimeout(timer);
  }, [downloadStatus]);

  const downloadLabel =
    downloadStatus === "preparing"
      ? "Preparing"
      : downloadStatus === "done"
        ? "Downloaded"
        : downloadStatus === "error"
          ? "Try again"
          : "Download PDF";

  const iconStroke = 1.75; // matches the optical weight of 13px meta text

  return (
    <div className="relative min-h-screen bg-background px-5 pb-12 pt-10 text-foreground antialiased selection:bg-primary/20 sm:pb-24 sm:pt-36">
      {/* Floating preview toggle for the authenticated user */}
      {isUserAuthenticated && (
        <button
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className={cn(
            // On mobile the site nav sits at bottom-right, so this moves left to stay clear of it.
            "fixed bottom-4 left-4 z-50 flex h-11 w-11 items-center justify-center rounded-full sm:bottom-6 sm:left-auto sm:right-6",
            "border border-border/60 bg-background/80 text-muted-foreground backdrop-blur-md",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.16)]",
            "transition-[background-color,color,transform] duration-200",
            "hover:bg-muted hover:text-foreground active:scale-95 motion-reduce:active:scale-100",
            FOCUS_RING
          )}
          title={isPreviewMode ? "Back to edit mode" : "Preview mode"}
        >
          {isPreviewMode ? <Edit2 className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      )}

      {/* Auto-save status */}
      {isEditing && saveStatus !== "idle" && (
        <div
          className={cn(
            "fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full",
            "border border-border/60 bg-background/80 px-3 py-1.5 backdrop-blur-md",
            "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-8px_rgba(0,0,0,0.16)]"
          )}
        >
          {saveStatus === "saving" && (
            <span className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <Check className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
        </div>
      )}

      <div className="mx-auto max-w-[760px]">
        <header className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
          <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/sourav-avatar.jpg"
              alt=""
              aria-hidden="true"
              draggable={false}
              // Image outline: pure black/white at ~10%, never a tinted neutral
              // — tinted rings pick up the surface color and read as dirt.
              className="h-16 w-16 shrink-0 select-none rounded-full object-cover ring-1 ring-black/10 sm:h-20 sm:w-20 dark:ring-white/10"
            />

            <div className="min-w-0">
              <EditableField
                as="h1"
                value={data.header.name}
                onChange={(val) => updateHeader("name", val)}
                isEditing={isEditing}
                className="text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-foreground [text-wrap:balance] sm:text-[44px]"
              />

              {/* Contact cluster: icons carry the scanning load, so no
                  separators are needed and the rows wrap cleanly on mobile. */}
              <div className="mt-3.5 space-y-2 sm:mt-4">
                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <MetaItem
                    icon={<MapPin className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                    value={data.header.location}
                    onChange={(val) => updateHeader("location", val)}
                    isEditing={isEditing}
                  />
                  <MetaItem
                    icon={<Phone className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                    value={data.header.phone}
                    href={`tel:${data.header.phone.replace(/[^+\d]/g, "")}`}
                    isLink
                    onChange={(val) => updateHeader("phone", val)}
                    isEditing={isEditing}
                  />
                  <MetaItem
                    icon={<Mail className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                    value={data.header.email}
                    href={`mailto:${data.header.email.trim()}`}
                    isLink
                    onChange={(val) => updateHeader("email", val)}
                    isEditing={isEditing}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                  <MetaItem
                    icon={<Globe className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                    value={data.header.website}
                    displayValue={urlLabel(data.header.website)}
                    href={withProtocol(data.header.website)}
                    isLink
                    onChange={(val) => updateHeader("website", val)}
                    isEditing={isEditing}
                  />
                  <MetaItem
                    icon={<Linkedin className="h-3.5 w-3.5" strokeWidth={iconStroke} />}
                    value={data.header.linkedin}
                    displayValue={linkedinLabel(data.header.linkedin)}
                    href={withProtocol(data.header.linkedin)}
                    isLink
                    onChange={(val) => updateHeader("linkedin", val)}
                    isEditing={isEditing}
                  />
                  <MetaItem
                    // X's glyph is denser than the stroked lucide marks,
                    // so it renders 0.5px smaller to share optical weight.
                    icon={<XLogo className="h-3 w-3" />}
                    value={data.header.twitter}
                    displayValue={xLabel(data.header.twitter)}
                    href={withProtocol(data.header.twitter)}
                    isLink
                    onChange={(val) => updateHeader("twitter", val)}
                    isEditing={isEditing}
                  />
                </div>
              </div>
            </div>
          </div>

          <a
            href="/cv/pdf"
            download
            onClick={handleDownload}
            aria-busy={downloadStatus === "preparing"}
            className={cn(
              "group inline-flex h-9 shrink-0 items-center justify-center gap-2 self-start rounded-lg px-3.5",
              // Fixed width so the label swap cannot shift the layout
              "min-w-[152px] text-[13px] font-medium",
              "shadow-[0_1px_2px_rgba(0,0,0,0.06),0_6px_16px_-6px_rgba(0,0,0,0.28)]",
              "transition-[transform,box-shadow,background-color,opacity] duration-200",
              "active:scale-[0.98] motion-reduce:active:scale-100",
              downloadStatus === "error"
                ? "bg-destructive text-destructive-foreground"
                : "bg-primary text-primary-foreground hover:opacity-90",
              FOCUS_RING
            )}
          >
            <span aria-hidden="true" className="relative flex h-3.5 w-3.5 items-center justify-center">
              <AnimatePresence initial={false}>
                <motion.span
                  key={downloadStatus}
                  className="absolute inset-0 flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                  transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                >
                  {downloadStatus === "preparing" ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : downloadStatus === "done" ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Download className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-y-[1px]" />
                  )}
                </motion.span>
              </AnimatePresence>
            </span>
            <span aria-live="polite">{downloadLabel}</span>
          </a>
        </header>

        {/* About */}
        <section className="mt-12 sm:mt-16">
          <SectionHead index="01" title="About" />
          <p className="mt-5 text-[15px] leading-[1.7] text-foreground [text-wrap:pretty]">
            <EditableField
              as="span"
              value={data.about}
              onChange={(val) => setData((prev) => ({ ...prev, about: val }))}
              isEditing={isEditing}
              multiline
            />
          </p>
        </section>

        {/* Experience */}
        <section className="mt-12 sm:mt-16">
          <SectionHead index="02" title="Experience" span={spanOf(data.workExperience)} />

          <div className="mt-8 space-y-8 sm:space-y-10">
            {data.workExperience.map((job, index) => {
              const showLogo = Boolean(job.logoUrl || job.companyUrl) || isEditing;

              return (
                <div
                  key={job.id}
                  className={cn(
                    "group/entry grid gap-x-5",
                    // The gutter column stays desktop-only (a phone can't spare
                    // 60px); mobile carries a bare inline mark instead, glued
                    // to the name it pictures (company / project).
                    showLogo ? "grid-cols-1 sm:grid-cols-[40px_1fr]" : "grid-cols-1"
                  )}
                >
                  {showLogo && (
                    <div className="hidden sm:block">
                      <Logo imgUrl={job.logoUrl} linkUrl={job.companyUrl} isEditing={isEditing} />
                    </div>
                  )}

                  <div className="min-w-0">
                    {/* Below sm the mixed-size items center on one line;
                        desktop keeps the baseline-typeset alignment. */}
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 sm:items-baseline">
                      <EditableField
                        value={job.role}
                        onChange={(val) => mutateAt("workExperience", index, (item) => { item.role = val; })}
                        isEditing={isEditing}
                        className="text-[15px] font-semibold text-foreground"
                      />
                      <Dates
                        value={`${job.startDate} - ${job.endDate}`}
                        onChange={(val) => {
                          const parts = val.split(" - ");
                          if (parts.length !== 2) return;
                          mutateAt("workExperience", index, (item) => {
                            item.startDate = parts[0].trim();
                            item.endDate = parts[1].trim();
                          });
                        }}
                        isEditing={isEditing}
                      />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:items-baseline">
                      <LinkedName
                        value={job.company}
                        onChange={(val) => mutateAt("workExperience", index, (item) => { item.company = val; })}
                        isEditing={isEditing}
                        href={job.companyUrl ? withProtocol(job.companyUrl) : undefined}
                        className="text-[15px] text-foreground"
                        leadingIcon={<InlineMark imgUrl={job.logoUrl} linkUrl={job.companyUrl} />}
                      />
                      {/* No separator glyph: place gets its own typographic
                          role (muted italic) instead of punctuation, the
                          print-résumé convention. */}
                      {job.location && (
                        <EditableField
                          value={job.location}
                          onChange={(val) => mutateAt("workExperience", index, (item) => { item.location = val; })}
                          isEditing={isEditing}
                          className={cn(META, "italic")}
                        />
                      )}
                    </div>

                    {isEditing && (
                      <div className="flex items-center gap-4 pt-2 opacity-40 transition-opacity focus-within:opacity-100">
                        <EditMetaInput
                          icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />}
                          value={job.logoUrl || ""}
                          placeholder="Paste logo URL..."
                          onChange={(val) => mutateAt("workExperience", index, (item) => { item.logoUrl = val; })}
                        />
                        <EditMetaInput
                          icon={<LinkIcon className="h-3 w-3 text-muted-foreground" />}
                          value={job.companyUrl || ""}
                          placeholder="Paste company URL..."
                          onChange={(val) => mutateAt("workExperience", index, (item) => { item.companyUrl = val; })}
                        />
                      </div>
                    )}

                    <Bullets
                      items={job.bullets}
                      onChange={(bulletIndex, val) =>
                        mutateAt("workExperience", index, (item) => { item.bullets[bulletIndex] = val; })
                      }
                      onAdd={() =>
                        mutateAt("workExperience", index, (item) => { item.bullets.push("New detail..."); })
                      }
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              );
            })}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    workExperience: [
                      ...prev.workExperience,
                      {
                        id: Math.random().toString(),
                        startDate: "2024",
                        endDate: "Present",
                        role: "New Role",
                        company: "Company",
                        location: "Location",
                        bullets: ["Detail your work here"],
                      },
                    ],
                  }))
                }
              >
                + Add experience
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Independent projects */}
        <section className="mt-12 sm:mt-16">
          <SectionHead index="03" title="Independent projects" span={spanOf(data.projects)} />

          <div className="mt-8 space-y-8 sm:space-y-10">
            {data.projects.map((project, index) => {
              const showLogo = Boolean(project.logoUrl || project.projectUrl) || isEditing;

              return (
                <div
                  key={project.id}
                  className={cn(
                    "group/entry grid gap-x-5",
                    showLogo ? "grid-cols-1 sm:grid-cols-[40px_1fr]" : "grid-cols-1"
                  )}
                >
                  {showLogo && (
                    <div className="hidden sm:block">
                      <Logo
                        imgUrl={project.logoUrl}
                        linkUrl={project.projectUrl}
                        isEditing={isEditing}
                      />
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 sm:items-baseline">
                      <LinkedName
                        value={project.name}
                        onChange={(val) => mutateAt("projects", index, (item) => { item.name = val; })}
                        isEditing={isEditing}
                        href={project.projectUrl ? withProtocol(project.projectUrl) : undefined}
                        className="text-[15px] font-semibold text-foreground"
                        leadingIcon={<InlineMark imgUrl={project.logoUrl} linkUrl={project.projectUrl} />}
                      />
                      <Dates
                        value={`${project.startDate} - ${project.endDate}`}
                        onChange={(val) => {
                          const parts = val.split(" - ");
                          if (parts.length !== 2) return;
                          mutateAt("projects", index, (item) => {
                            item.startDate = parts[0].trim();
                            item.endDate = parts[1].trim();
                          });
                        }}
                        isEditing={isEditing}
                      />
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:items-baseline">
                      <EditableField
                        value={project.role}
                        onChange={(val) => mutateAt("projects", index, (item) => { item.role = val; })}
                        isEditing={isEditing}
                        className={META}
                      />
                    </div>

                    {project.links && project.links.length > 0 && <DestinationLinks links={project.links} />}

                    {isEditing && (
                      <div className="flex items-center gap-4 pt-2 opacity-40 transition-opacity focus-within:opacity-100">
                        <EditMetaInput
                          icon={<ImageIcon className="h-3 w-3 text-muted-foreground" />}
                          value={project.logoUrl || ""}
                          placeholder="Paste logo URL..."
                          onChange={(val) => mutateAt("projects", index, (item) => { item.logoUrl = val; })}
                        />
                        <EditMetaInput
                          icon={<LinkIcon className="h-3 w-3 text-muted-foreground" />}
                          value={project.projectUrl || ""}
                          placeholder="Paste project URL..."
                          onChange={(val) => mutateAt("projects", index, (item) => { item.projectUrl = val; })}
                        />
                      </div>
                    )}

                    <Bullets
                      items={project.bullets}
                      onChange={(bulletIndex, val) =>
                        mutateAt("projects", index, (item) => { item.bullets[bulletIndex] = val; })
                      }
                      onAdd={() =>
                        mutateAt("projects", index, (item) => { item.bullets.push("New detail..."); })
                      }
                      isEditing={isEditing}
                    />
                  </div>
                </div>
              );
            })}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    projects: [
                      ...prev.projects,
                      {
                        id: Math.random().toString(),
                        startDate: "2025",
                        endDate: "Present",
                        role: "Founder",
                        name: "Project Name",
                        bullets: ["Describe project here"],
                      },
                    ],
                  }))
                }
              >
                + Add project
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Education */}
        <section className="mt-12 sm:mt-16">
          <SectionHead index="04" title="Education" span={spanOf(data.education)} />

          <div className="mt-8 space-y-8">
            {data.education.map((edu, index) => (
              <div key={edu.id} className="grid grid-cols-1 gap-x-5 sm:grid-cols-[40px_1fr]">
                {/* Keeps the text column aligned with the entries above */}
                <div aria-hidden="true" className="hidden sm:block" />

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 sm:items-baseline">
                    <EditableField
                      value={edu.degree}
                      onChange={(val) => mutateAt("education", index, (item) => { item.degree = val; })}
                      isEditing={isEditing}
                      className="text-[15px] font-semibold text-foreground"
                    />
                    <Dates
                      value={`${edu.startDate} - ${edu.endDate}`}
                      onChange={(val) => {
                        const parts = val.split(" - ");
                        if (parts.length !== 2) return;
                        mutateAt("education", index, (item) => {
                          item.startDate = parts[0].trim();
                          item.endDate = parts[1].trim();
                        });
                      }}
                      isEditing={isEditing}
                    />
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:items-baseline">
                    <EditableField
                      value={edu.institution}
                      onChange={(val) => mutateAt("education", index, (item) => { item.institution = val; })}
                      isEditing={isEditing}
                      className={META}
                    />
                    {edu.location && (
                      <EditableField
                        value={edu.location}
                        onChange={(val) => mutateAt("education", index, (item) => { item.location = val; })}
                        isEditing={isEditing}
                        className={cn(META, "italic")}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    education: [
                      ...prev.education,
                      {
                        id: Math.random().toString(),
                        startDate: "2015",
                        endDate: "2019",
                        degree: "New Degree",
                        institution: "Institution",
                        location: "Location",
                      },
                    ],
                  }))
                }
              >
                + Add education
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Skills */}
        <section className="mt-12 sm:mt-16">
          <SectionHead index="05" title="Skills" />

          <div className="mt-8 space-y-6">
            {data.skills.map((skillGroup, index) => (
              <div key={skillGroup.id} className="grid grid-cols-1 gap-x-5 sm:grid-cols-[40px_1fr]">
                <div aria-hidden="true" className="hidden sm:block" />

                <div className="min-w-0">
                  <EditableField
                    value={skillGroup.category}
                    onChange={(val) => mutateAt("skills", index, (item) => { item.category = val; })}
                    isEditing={isEditing}
                    className="text-[15px] font-semibold text-foreground"
                  />

                  <div className="mt-2">
                    {Array.isArray(skillGroup.items) ? (
                      <div className="space-y-2.5">
                        {skillGroup.items.map((item, itemIdx) => (
                          <div key={itemIdx} className="relative pl-4">
                            <span
                              aria-hidden="true"
                              className="absolute left-0 top-[0.62em] h-[5px] w-[5px] rounded-full bg-muted-foreground/40"
                            />
                            <EditableField
                              as="div"
                              value={item}
                              onChange={(val) =>
                                mutateAt("skills", index, (entry) => {
                                  (entry.items as string[])[itemIdx] = val;
                                })
                              }
                              isEditing={isEditing}
                              multiline
                              className={cn(META, "leading-[1.65] [text-wrap:pretty]")}
                            />
                          </div>
                        ))}

                        {isEditing && (
                          <div className="pl-4">
                            <button
                              onClick={() =>
                                mutateAt("skills", index, (entry) => {
                                  (entry.items as string[]).push("New skill detail");
                                })
                              }
                              className={cn(
                                "rounded text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground",
                                FOCUS_RING
                              )}
                            >
                              + Add item
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <SkillItems
                        items={skillGroup.items}
                        onChange={(val) => mutateAt("skills", index, (item) => { item.items = val; })}
                        isEditing={isEditing}
                      />
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isEditing && (
              <AddSectionButton
                onClick={() =>
                  setData((prev) => ({
                    ...prev,
                    skills: [
                      ...prev.skills,
                      { id: Math.random().toString(), category: "New category", items: "Skill, Skill" },
                    ],
                  }))
                }
              >
                + Add category
              </AddSectionButton>
            )}
          </div>
        </section>

        {/* Closing mark: a hairline asterism, the way a typeset page ends.
            Pure decoration, so it is hidden from assistive tech. */}
        <div aria-hidden="true" className="mt-16 flex items-center gap-4 sm:mt-20">
          <div className="h-px flex-1 bg-border/70" />
          <div className="flex items-center gap-1.5">
            <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/40" />
            <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/40" />
            <span className="h-[3px] w-[3px] rounded-full bg-muted-foreground/40" />
          </div>
          <div className="h-px flex-1 bg-border/70" />
        </div>
      </div>
    </div>
  );
}

function EditMetaInput({
  icon,
  value,
  placeholder,
  onChange,
}: {
  icon: React.ReactNode;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {icon}
      <input
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-24 border-b border-transparent bg-transparent text-xs outline-none transition-[width,border-color] placeholder:text-muted-foreground focus:w-48 focus:border-border"
      />
    </div>
  );
}
