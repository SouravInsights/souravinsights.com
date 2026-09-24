"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Menu,
  X,
  Home,
  BookOpen,
  BookmarkCheck,
  BookText,
  Boxes,
} from "lucide-react";
import { DarkModeToggle } from "@/components/DarkModeToggle";
import { SoundToggle } from "@/components/SoundToggle";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { useFeedback } from "@/hooks/useFeedback";

const navItems = [
  { name: "Home", path: "/", icon: Home },
  { name: "Projects", path: "/projects", icon: Boxes },
  { name: "Blog", path: "/blog", icon: BookText },
  { name: "Books", path: "/books", icon: BookOpen },
  { name: "Insights", path: "/curated-links", icon: BookmarkCheck },
];

const isActivePath = (pathname: string | null, path: string) =>
  pathname === path || (path !== "/" && !!pathname?.startsWith(path));

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const feedback = useFeedback();

  // The navbar gets out of the way on the way down so a page's own sticky bar
  // (the Insights tabs) can own the top edge, then returns on the way up.
  const direction = useScrollDirection();
  const [atTop, setAtTop] = useState(true);
  const [subBarStuck, setSubBarStuck] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setAtTop(window.scrollY < 96);

      // A page-level sticky sub-bar (e.g. the Insights tabs) owns the top edge
      // while it's pinned. Keep the navbar hidden until it unpins so the two
      // never overlap on scroll-up.
      const subBar = document.querySelector<HTMLElement>(".sticky-tabs");
      setSubBarStuck(!!subBar && subBar.getBoundingClientRect().top <= 1);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const navHidden = subBarStuck || (direction === "down" && !atTop);

  useEffect(() => {
    document.documentElement.dataset.nav = navHidden ? "hidden" : "visible";
  }, [navHidden]);

  // A menu that survives navigation is a menu that lies about where you are.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // While the menu is open: Escape closes it, and the page behind can't scroll.
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const currentItem =
    navItems.find((item) => isActivePath(pathname, item.path)) ?? navItems[0];
  const CurrentIcon = currentItem.icon;

  const quick = reduceMotion ? { duration: 0 } : { duration: 0.15 };
  const spring = reduceMotion
    ? { duration: 0 }
    : { type: "spring" as const, stiffness: 380, damping: 34 };

  return (
    <>
      {/* Desktop Navbar */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 hidden md:block">
        <motion.div
          className="flex items-center space-x-2 bg-card p-2 rounded-lg shadow-lg border border-border"
          initial={false}
          animate={{ y: navHidden ? -120 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {navItems.map((item) => (
            <Link
              href={item.path}
              key={item.name}
              onClick={() => feedback.press()}
            >
              <motion.div
                className={`px-3 py-1.5 rounded-md flex items-center space-x-2 font-mono text-sm ${
                  isActivePath(pathname, item.path)
                    ? "bg-secondary text-green-700 dark:text-green-500"
                    : "text-foreground hover:bg-accent"
                }`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <item.icon size={16} />
                <span>{item.name}</span>
              </motion.div>
            </Link>
          ))}
          <div className="flex items-center border-l border-border pl-2">
            <SoundToggle />
            <DarkModeToggle />
          </div>
        </motion.div>
      </nav>

      {/* Scrim — tapping anywhere outside the pill closes it */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={quick}
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Navbar — the same floating pill, condensed. Collapsed it shows
          where you are; opened, the menu drops out of the pill itself. */}
      <nav className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 md:hidden">
        <motion.div
          initial={false}
          animate={{ y: navHidden ? -160 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          <div className="flex items-center gap-1 p-1.5">
            <button
              type="button"
              onClick={() => {
                feedback.press();
                setIsOpen((open) => !open);
              }}
              aria-label={isOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={isOpen}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground transition-colors hover:bg-accent"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={isOpen ? "close" : "menu"}
                  initial={{ rotate: reduceMotion ? 0 : -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: reduceMotion ? 0 : 90, opacity: 0 }}
                  transition={quick}
                  className="flex items-center justify-center"
                >
                  {isOpen ? <X size={20} /> : <Menu size={20} />}
                </motion.span>
              </AnimatePresence>
            </button>

            <div className="flex items-center gap-2 px-2 font-mono text-sm">
              <CurrentIcon
                size={16}
                className="shrink-0 text-green-700 dark:text-green-500"
              />
              <span className="truncate">{currentItem.name}</span>
            </div>

            <SoundToggle />
            <DarkModeToggle />
          </div>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={spring}
                className="overflow-hidden border-t border-border"
              >
                <div className="flex flex-col p-1.5">
                  {navItems.map((item) => (
                    <Link
                      key={item.name}
                      href={item.path}
                      onClick={() => {
                        feedback.press();
                        setIsOpen(false);
                      }}
                    >
                      <div
                        className={`flex items-center gap-2.5 rounded-md px-3 py-2.5 font-mono text-sm transition-colors ${
                          isActivePath(pathname, item.path)
                            ? "bg-secondary text-green-700 dark:text-green-500"
                            : "text-foreground hover:bg-accent"
                        }`}
                      >
                        <item.icon size={16} />
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </nav>
    </>
  );
};

export default Navbar;
