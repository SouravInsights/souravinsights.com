"use client";

import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { BookOpen, BookOpenText, BookmarkSimple, Stack, BracketsCurly, FilmSlate, FilmStrip, GameController, GithubLogo, House, LinkedinLogo, EnvelopeSimple, DotsThree, SidebarSimple, Sparkle, XLogo, type Icon as PhosphorIcon } from "@phosphor-icons/react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SoundToggle } from "@/components/SoundToggle";
import Oneko from "@/components/oneko";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CopyButton } from "@/components/CopyButton";
import { STICKERS } from "@/components/stickers/stickers";
import { useFeedback } from "@/hooks/useFeedback";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";
import { useRail } from "./use-rail";

/**
 * The app shell.
 *
 * What it replaced: a floating pill, fixed at the top, centred, hiding on
 * scroll, 714px wide at every window size — 93% of a 768px screen, and wider
 * with every section added. Being an overlay, it also made every full-height
 * screen reserve its band by hand, and one of them was 2px short.
 *
 * So the chrome is a frame now, and it sits where the room is:
 *   md+  a left rail — vertical, so it costs no horizontal room at all
 *   <md  a bottom tab bar — the thumb zone, one tap per destination
 *
 * Both never hide, and the frame is the same at every breakpoint: the panel
 * below only ever subtracts --rail and --tabbar-space, which globals.css owns.
 * A frame that ducks away as you scroll is a website telling you it is one.
 */

interface Destination {
  name: string;
  path: string;
  icon: PhosphorIcon;
  /** Gets a slot on the phone's tab bar; the rest live behind More. */
  tab?: boolean;
}

/** The sections. */
const destinations: Destination[] = [
  { name: "Home", path: "/", icon: House, tab: true },
  { name: "Projects", path: "/projects", icon: Stack },
  { name: "Gallery", path: "/gallery", icon: FilmStrip },
  { name: "Blog", path: "/blog", icon: BookOpenText, tab: true },
  { name: "Books", path: "/books", icon: BookOpen },
  { name: "Insights", path: "/insights", icon: BookmarkSimple, tab: true },
  { name: "Curio", path: "/curio", icon: Sparkle, tab: true },
];

/** The toys and the paper trail: real pages, not sections. */
const elsewhere: Destination[] = [
  { name: "Game", path: "/play", icon: GameController },
  { name: "Movies", path: "/movies", icon: FilmSlate },
  { name: "Docs", path: "/docs", icon: BracketsCurly },
];

const tabs = destinations.filter((item) => item.tab);

const isActivePath = (pathname: string | null, path: string) =>
  pathname === path || (path !== "/" && !!pathname?.startsWith(path));

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const feedback = useFeedback();
  // The rail's breakpoint, and therefore the cat's: below md there is no rail
  // for it to walk. A media query and not a CSS wrapper, because the cat mounts
  // itself on document.body — see the note where it renders. It resolves one
  // tick after hydration, which is when the cat walks in either way.
  const hasRail = useMediaQuery("(min-width: 768px)");

  // A menu that survives navigation is a menu that lies about where you are.
  useEffect(() => setMenuOpen(false), [pathname]);

  // The sheet is phone-only, so close it when the rail comes back.
  useEffect(() => {
    if (hasRail) setMenuOpen(false);
  }, [hasRail]);

  // The sheet is non-modal (see MoreSheet), so block the page's own scroll
  // while it is open. Touch is handled by `touch-none`; this catches wheels.
  useEffect(() => {
    if (!menuOpen) return;

    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) event.preventDefault();
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [menuOpen]);

  const press = () => feedback.press();

  /**
   * A shared conversation is a public document, not a screen of the app.
   *
   * It gets none of the chrome: no rail, no tab bar, no roaming cat. Someone
   * following a link from a timeline is visiting a page, and the navigation of
   * somebody else's site around it is noise. `/curio` itself keeps the shell,
   * since that is the app screen for asking.
   */
  const isSharedConversation =
    pathname !== "/curio" && Boolean(pathname?.startsWith("/curio/"));

  if (isSharedConversation) return <>{children}</>;

  return (
    <>
      {/* The shell is shadcn's Sidebar. It owns open/collapsed — the cookie, ⌘B,
          its trigger, its edge rail — and reads both its widths from CSS, so the
          only thing left to wire is the width itself: the provider points
          --sidebar-width at --rail-user, which use-rail.ts writes while a reader
          drags. A drag therefore beats the breakpoint default without React ever
          owning the pixels. */}
      <SidebarProvider
        className="app-shell flex-1"
        style={
          {
            "--sidebar-width": "var(--rail-user, var(--rail-default))",
            // The collapsed width, which shadcn reads in its icon mode instead
            // of --sidebar-width. use-rail.ts overrides it for the length of a
            // drag so a drag that starts on a collapsed rail has something to
            // move; otherwise this is shadcn's own 4.75rem, to the pixel.
            "--sidebar-width-icon": "var(--rail-icon-user, 4.75rem)",
          } as React.CSSProperties
        }
      >
        <SiteRail pathname={pathname} onNavigate={press} />

        {/* The content panel. Only the tab bar's band is padding now: the rail's
            offset is the gap the Sidebar leaves in the flow, which is why no
            screen has to subtract a rail width of its own any more. */}
        <div className="app-panel flex min-w-0 flex-1 flex-col pb-[var(--tabbar-space)]">
          {children}
        </div>
      </SidebarProvider>

      {/* The cat used to roam the footer, which is gone. A fixed overlay has to
          be somewhere, and the rail is the one strip of the page that is always
          on screen — so it walks the chrome now.

          Desktop only, and by media query rather than a `hidden md:block`
          wrapper: Oneko mounts itself on document.body, so a wrapper can hide
          nothing, and on a phone there is no rail for it to walk — its wander
          zone resolves to nothing and it sat asleep in the middle of the page.

          It keeps chasing the pointer. What it does not do is stand on the
          control under the pointer — that rule lives in Oneko's pointer aim, so
          it applies to every control, not to the two switches the footer's
          keep-out happens to cover. */}
      {hasRail && (
        <Oneko
          skin="classic"
          meow={false}
          zIndex={45}
          persistPosition={false}
          wander={{ selector: '[data-sidebar="sidebar"]', padding: 4 }}
          bubbleChance={0.3}
        />
      )}

      <TabBar
        pathname={pathname}
        menuOpen={menuOpen}
        onNavigate={press}
        onMore={() => {
          press();
          setMenuOpen(true);
        }}
      />

      <MoreSheet
        open={menuOpen}
        pathname={pathname}
        onClose={() => setMenuOpen(false)}
        onNavigate={press}
      />

    </>
  );
}

interface Social {
  href: string;
  /** What the copy control writes. The email copies the bare address, because
      a pasted `mailto:` is not what anyone wants in a chat or a form. */
  copy: string;
  label: string;
  icon: PhosphorIcon;
}

/** The rail's foot carries what the footer used to: the socials and a way to
    write. Icons with a title, because they are never words. */
const socials: Social[] = [
  {
    href: "https://github.com/souravinsights",
    copy: "https://github.com/souravinsights",
    label: "GitHub",
    icon: GithubLogo,
  },
  {
    href: "https://linkedin.com/in/souravinsights",
    copy: "https://linkedin.com/in/souravinsights",
    label: "LinkedIn",
    icon: LinkedinLogo,
  },
  {
    href: "https://twitter.com/souravinsights",
    copy: "https://twitter.com/souravinsights",
    label: "Twitter",
    icon: XLogo,
  },
  {
    href: "mailto:souravinsights@gmail.com",
    copy: "souravinsights@gmail.com",
    label: "Email",
    icon: EnvelopeSimple,
  },
];

/**
 * One social link. Its copy control lives in the tooltip, because the rail has
 * no room for a second control beside a 32px icon and a chip on the icon's
 * corner covers the link it belongs to. Radix keeps the tooltip alive while the
 * pointer crosses the gap to that control.
 */
function SocialButton({ social }: { social: Social }) {
  const feedback = useFeedback();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
        >
          <a
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
            className="group/social"
          >
            <social.icon
              weight="regular"
              className="transition-transform duration-200 group-hover/social:scale-110 group-hover/social:-translate-y-0.5"
            />
          </a>
        </Button>
      </TooltipTrigger>

      <TooltipContent
        side="right"
        /* No exit animation: moving down the column opens the next tooltip
           before the last has faded, and two tooltips anchored to stacked
           icons read as one welded blob. */
        /* The copy button is taller than a line of text, so the tooltip needs
           less of the default padding to end up the same 34px as the nav's
           label-only tooltips — otherwise it reads as the heavy one. */
        className="flex items-center gap-2 !py-1 data-[state=closed]:!animate-none"
      >
        <span>{social.label}</span>
        <CopyButton
          value={social.copy}
          label={social.label}
          iconOnly
          onCopied={feedback.press}
        />
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * The face in the rail's brand row.
 *
 * One sticker at a time, cycling while the row is held and stopping where the
 * pointer leaves. The rail is the site's chrome, so its one bit of personality
 * lives on the thing the eye lands on first: reaching for the collapse control
 * shuffles the face, and nothing else in the shell moves.
 *
 * Every sticker is mounted and cross-faded rather than swapped by `key`, so a
 * change never flashes a fresh image request. They are `next/image` thumbnails,
 * which matters here: the cut-outs are ~300KB each, and this mark renders on
 * every page of the site.
 */
function BrandMark({ index, reduce }: { index: number; reduce: boolean }) {
  return (
    <span
      className="relative h-11 w-11 shrink-0"
      aria-hidden="true"
    >
      {STICKERS.map((sticker, i) => (
        <motion.span
          key={sticker.src}
          className="absolute inset-0"
          initial={false}
          animate={{
            opacity: i === index ? 1 : 0,
            scale: i === index ? 1 : 0.4,
            rotate: i === index ? 0 : -8,
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { type: "spring", stiffness: 700, damping: 26 }
          }
        >
          <Image
            src={sticker.src}
            alt=""
            width={96}
            height={96}
            className="h-full w-full object-contain"
          />
        </motion.span>
      ))}
    </span>
  );
}

function SiteRail({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate: () => void;
}) {
  const rail = useRail();
  const { open, toggleSidebar } = useSidebar();
  const reduce = useReducedMotion();
  const [face, setFace] = useState(0);
  const [hovering, setHovering] = useState(false);

  // Shuffle the face while the row is held and stop where the pointer leaves.
  // Reduced motion settles on one face instead of cycling.
  useEffect(() => {
    if (!hovering || reduce) return;
    const id = window.setInterval(
      () => setFace((current) => (current + 1) % STICKERS.length),
      400
    );
    return () => window.clearInterval(id);
  }, [hovering, reduce]);

  return (
    <Sidebar collapsible="icon">
      {/* The brand row *is* the collapse control, and that is the whole point:
          the way to close the rail sits where the eye lands first and where a
          reader reaches for it, on the mark itself. It used to be a link home —
          which the Home row one item below already does — while the only toggle
          was a small PanelLeft buried in the footer among five social icons,
          which is a place nobody looks for it.

          One button, not a mark plus a target beside it: a row that does one
          thing cannot be misread, and the chevron is what says which thing. In
          icon mode there is no room for the chevron, so the tooltip carries it
          and the whole 76px column is the target.

          The mark is the sticker set, and while the row is hovered the faces
          cycle. It is the shell's only wink, and it costs nothing: the face is
          decorative, and the button still only toggles. */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => {
                onNavigate();
                toggleSidebar();
              }}
              onPointerEnter={() => {
                setHovering(true);
                setFace((current) => (current + 1) % STICKERS.length);
              }}
              onPointerLeave={() => setHovering(false)}
              tooltip="Expand navigation"
              aria-expanded={open}
              aria-label={open ? "Collapse navigation" : "Expand navigation"}
              className="gap-2.5 hover:!bg-transparent active:!bg-transparent group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-12 group-data-[collapsible=icon]:!p-1"
            >
              <BrandMark index={face} reduce={reduce ?? false} />
              <span className="truncate font-mono transition-opacity shell-transition group-data-[collapsible=icon]:opacity-0">
                Sourav
              </span>
              <SidebarSimple
                aria-hidden="true"
                className="ml-auto shrink-0 text-faint-foreground transition-opacity shell-transition group-data-[collapsible=icon]:opacity-0"
              />
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="no-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {destinations.map((item) => (
                <RailItem
                  key={item.path}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          {/* The one label worth printing: it names the group that is not the
              site's sections. It fades out with the labels when collapsed. */}
          <SidebarGroupLabel>More</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {elsewhere.map((item) => (
                <RailItem
                  key={item.path}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Oneko reads `data-oneko-zone` off the DOM, so the keep-out is declared
          rather than wired: any target inside this box — a wander spot, or the
          cursor itself when you reach for the theme button — is rerouted to the
          nearest point outside it, and the swept collision check stops the cat
          clipping a corner on its way past. So the switches can't be sat on and
          the cat still walks the rail. Only the footer is fenced: a keep-out
          over the nav rows would leave it no rail at all. */}
      <SidebarFooter data-oneko-zone="avoid" className="gap-2 p-2">
        {/* The socials wrap among themselves, each with its copy control in
            the tooltip. The two switches used to sit at the end of this same
            flow, so in the open rail the seventh icon — the theme toggle —
            dropped onto a line of its own, under nothing in particular. */}
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {socials.map((social) => (
            <SocialButton key={social.label} social={social} />
          ))}
        </div>

        {/* Theme and sound are one control, so they share one frame: side by
            side at 144px, stacked in the 76px rail, never separated. The More
            sheet says the same thing in words, "Theme & sound" — this is that
            label, drawn, because a rail this narrow has no room to print it. */}
        <div className="flex justify-center">
          <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5 group-data-[collapsible=icon]:flex-col">
            <SoundToggle />
            <DarkModeToggle />
          </div>
        </div>
      </SidebarFooter>

      {/* shadcn's edge strip: a click collapses (its own handler), a drag sets
          the width (ours). The drag swallows the click it would otherwise
          become, so resizing never collapses by accident — and a press that
          never moved is left alone, so a click is still a click.

          The cursor is overridden because shadcn points it *away* from the
          rail's own edge (its `w-resize` reads as "drag left"), and this strip
          is exactly where a column resizes. */}
      <SidebarRail
        onPointerDown={rail.onResizeStart}
        aria-label="Resize navigation"
        className="!cursor-col-resize"
      />
    </Sidebar>
  );
}

/**
 * One destination. The tooltip is the primitive's own, and it is hidden unless
 * the rail is collapsed — which is why it is passed unconditionally here: a word
 * you can already read never pops a second copy of itself.
 */
function RailItem({
  item,
  pathname,
  onNavigate,
}: {
  item: Destination;
  pathname: string | null;
  onNavigate: () => void;
}) {
  const active = isActivePath(pathname, item.path);

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.name}
        className="font-mono data-[active=true]:text-green-700 group-data-[collapsible=icon]:mx-auto dark:data-[active=true]:text-green-500"
      >
        <Link
          href={item.path}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className="group/nav"
        >
          <item.icon
            weight={active ? "fill" : "regular"}
            className="transition-transform duration-200 group-hover/nav:scale-110"
          />
          {/* shadcn clips this span out of a 32px box the instant the state
              flips, which reads as the word vanishing before the rail has
              moved. Fading it over the same 180ms as the width makes the two
              one motion instead of two. */}
          <span className="transition-opacity shell-transition group-data-[collapsible=icon]:opacity-0">
            {item.name}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
function TabBar({
  pathname,
  menuOpen,
  onNavigate,
  onMore,
}: {
  pathname: string | null;
  menuOpen: boolean;
  onNavigate: () => void;
  onMore: () => void;
}) {
  // The bar's height is `--tabbar-space`, not `--tabbar`: with border-box
  // sizing the home indicator's inset was eating the bar's own height, so on a
  // notched phone a 56px bar had 22px left for an 18px icon and a 10px label.
  // The content keeps its 56px and the inset is added on top of it, exactly as
  // --tabbar-space already promises the panel.
  return (
    <nav
      aria-label="Main"
      className="site-tabbar fixed inset-x-0 bottom-0 z-40 flex h-[var(--tabbar-space)] items-stretch border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {tabs.map((item) => {
        const active = isActivePath(pathname, item.path);

        return (
          <Link
            key={item.path}
            href={item.path}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] outline-none transition-colors focus-visible:bg-accent",
              active
                ? "text-green-700 dark:text-green-500"
                : "text-muted-foreground"
            )}
          >
            <item.icon
              size={18}
              weight={active ? "fill" : "regular"}
              className="transition-transform duration-200 group-hover:scale-110"
            />
            <span>{item.name}</span>
          </Link>
        );
      })}

      <button
        type="button"
        onClick={onMore}
        aria-expanded={menuOpen}
        aria-haspopup="dialog"
        className={cn(
          "group flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] outline-none transition-colors focus-visible:bg-accent",
          menuOpen ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <DotsThree
          size={18}
          weight={menuOpen ? "fill" : "regular"}
          className="transition-transform duration-200 group-hover:scale-110"
        />
        <span>More</span>
      </button>
    </nav>
  );
}

function MoreSheet({
  open,
  pathname,
  onClose,
  onNavigate,
}: {
  open: boolean;
  pathname: string | null;
  onClose: () => void;
  onNavigate: () => void;
}) {
  const rest = destinations.filter((item) => !item.tab);

  // Radix's modal lock sets `overflow: hidden` on the body, which relayouts the
  // page and stutters the transition. Non-modal avoids that; the scrim and the
  // card take over the scroll lock with `touch-none` and the wheel guard above.
  return (
    <Sheet modal={false} open={open} onOpenChange={(next) => !next && onClose()}>
      <SheetContent
        side="bottom"
        aria-describedby={undefined}
        overlayClassName="touch-none bg-background/60 backdrop-blur-sm md:hidden"
        className="pointer-events-none z-50 gap-0 border-0 bg-transparent p-0 pb-[var(--tabbar-space)] shadow-none data-[state=closed]:duration-150 data-[state=open]:duration-200 md:hidden [&>button]:pointer-events-auto"
      >
        {/* The card is inset from the sheet's own bottom, so the slide-out can
            clear the tab bar instead of stopping on top of it. */}
        <div className="pointer-events-auto touch-none rounded-t-lg border-t border-border bg-card p-2 shadow-lg">
          <SheetTitle className="px-2 py-1.5 text-left text-[13px] font-normal leading-[1.5] text-faint-foreground">
            More
          </SheetTitle>

          <div className="flex flex-col gap-0.5">
            {[...rest, ...elsewhere].map((item) => {
              const active = isActivePath(pathname, item.path);

              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors",
                    active
                      ? "bg-secondary text-green-700 dark:text-green-500"
                      : "text-foreground hover:bg-accent"
                  )}
                >
                  <item.icon
                    size={16}
                    weight={active ? "fill" : "regular"}
                    className="transition-transform duration-200 group-hover:scale-110"
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* A phone has no rail, so the sheet carries the socials — one row
              of pairs, not a list. The sheet is a menu; five more rows would
              turn it into a page. The link is the action and the copy is the
              afterthought, so the link wears a filled square and the copy is a
              quiet glyph beside it: identical weight and colour read as eight
              buttons of equal rank. */}
          <div className="mt-1 border-t border-border px-2 pt-2.5">
            <span className="type-caption text-faint-foreground">Connect</span>
            <div className="mt-1 flex items-center justify-between">
              {socials.map((social) => (
                <div key={social.label} className="flex items-center gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    className="bg-secondary text-foreground transition-transform active:scale-95"
                  >
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      title={social.label}
                      onClick={onNavigate}
                      className="group/social"
                    >
                      <social.icon
                        size={16}
                        weight="regular"
                        className="transition-transform duration-200 group-hover/social:scale-110"
                      />
                    </a>
                  </Button>
                  <CopyButton
                    value={social.copy}
                    label={social.label}
                    iconOnly
                    onCopied={onNavigate}
                    className="!text-faint-foreground"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-1 flex items-center justify-between border-t border-border px-2 pt-2.5">
            <span className="type-caption text-faint-foreground">
              Theme &amp; sound
            </span>
            <div className="flex items-center gap-1">
              <SoundToggle />
              <DarkModeToggle />
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

