"use client";

import Image from "next/image";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  BookOpen,
  BookText,
  BookmarkCheck,
  Boxes,
  Braces,
  Clapperboard,
  Code,
  Gamepad2,
  Github,
  Home,
  Linkedin,
  Mail,
  MoreHorizontal,
  PanelLeftClose,
  Sparkles,
  Twitter,
  X,
  type LucideIcon,
} from "lucide-react";
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
  icon: LucideIcon;
  /** Gets a slot on the phone's tab bar; the rest live behind More. */
  tab?: boolean;
}

/** The sections. */
const destinations: Destination[] = [
  { name: "Home", path: "/", icon: Home, tab: true },
  { name: "Projects", path: "/projects", icon: Boxes },
  { name: "Blog", path: "/blog", icon: BookText, tab: true },
  { name: "Books", path: "/books", icon: BookOpen },
  { name: "Insights", path: "/insights", icon: BookmarkCheck, tab: true },
  { name: "Curio", path: "/curio", icon: Sparkles, tab: true },
];

/** The toys and the paper trail: real pages, not sections. */
const elsewhere: Destination[] = [
  { name: "Game", path: "/play", icon: Gamepad2 },
  { name: "Movies", path: "/movies", icon: Clapperboard },
  { name: "Docs", path: "/docs", icon: Braces },
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

  // While the sheet is open: Escape closes it, and the page behind can't scroll.
  useEffect(() => {
    if (!menuOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [menuOpen]);

  const press = () => feedback.press();

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

/** The rail's foot carries what the footer used to: the socials and a way to
    write. Icons with a title, because they are never words. */
const socials = [
  { href: "https://github.com/souravinsights", label: "GitHub", icon: Github },
  {
    href: "https://linkedin.com/in/souravinsights",
    label: "LinkedIn",
    icon: Linkedin,
  },
  { href: "https://twitter.com/souravinsights", label: "Twitter", icon: Twitter },
  { href: "mailto:souravinsights@gmail.com", label: "Email me", icon: Mail },
  {
    href: "https://github.com/SouravInsights/souravinsights.com",
    label: "Source code",
    icon: Code,
  },
];

function SiteRail({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate: () => void;
}) {
  const rail = useRail();
  const { open, toggleSidebar } = useSidebar();

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
          and the whole 76px column is the target. */}
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              onClick={() => {
                onNavigate();
                toggleSidebar();
              }}
              tooltip="Expand navigation"
              aria-expanded={open}
              aria-label={open ? "Collapse navigation" : "Expand navigation"}
              className="gap-2.5 group-data-[collapsible=icon]:mx-auto group-data-[collapsible=icon]:!size-9 group-data-[collapsible=icon]:!p-1"
            >
              <Image
                src="/si-logo.png"
                alt=""
                width={56}
                height={56}
                priority
                /* Pixel art: without `pixelated` the browser invents shades
                   between the blocks and the face turns to mush at 28px. The
                   ring is for dark mode, where a light-backed mark would sit
                   on the card with no edge to hold it. */
                className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-black/10 [image-rendering:pixelated] dark:ring-white/15"
              />
              <span className="truncate font-mono transition-opacity shell-transition group-data-[collapsible=icon]:opacity-0">
                Sourav
              </span>
              <PanelLeftClose
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
        {/* The socials wrap among themselves. The two switches used to sit at the
            end of this same flow, so in the open rail the seventh icon — the
            theme toggle — dropped onto a line of its own, under nothing in
            particular. */}
        <div className="flex flex-wrap items-center justify-center gap-0.5">
          {socials.map((social) => (
            <Button
              key={social.label}
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
                title={social.label}
              >
                <social.icon />
              </a>
            </Button>
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
        >
          <item.icon />
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
              "flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] outline-none transition-colors focus-visible:bg-accent",
              active
                ? "text-green-700 dark:text-green-500"
                : "text-muted-foreground"
            )}
          >
            <item.icon size={18} />
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
          "flex flex-1 flex-col items-center justify-center gap-1 font-mono text-[10px] outline-none transition-colors focus-visible:bg-accent",
          menuOpen ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <MoreHorizontal size={18} />
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
  const reduceMotion = useReducedMotion();
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34 };
  const rest = destinations.filter((item) => !item.tab);

  return (
    <AnimatePresence initial={false}>
      {open && (
        <>
          <motion.div
            key="scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          />

          {/* Sits directly on top of the tab bar, so the band the panel gives
              up is the band the sheet uses: `bottom` is the same variable. */}
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-label="More pages"
            style={{ bottom: "var(--tabbar-space)" }}
            initial={{ y: reduceMotion ? 0 : 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: reduceMotion ? 0 : 24, opacity: 0 }}
            transition={spring}
            className="fixed inset-x-0 z-50 rounded-t-lg border-t border-border bg-card p-2 shadow-lg md:hidden"
          >
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="type-caption text-faint-foreground">More</span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                <X size={16} />
              </button>
            </div>

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
                      "flex items-center gap-2.5 rounded-lg px-3 py-2.5 font-mono text-sm transition-colors",
                      active
                        ? "bg-secondary text-green-700 dark:text-green-500"
                        : "text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon size={16} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
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
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

