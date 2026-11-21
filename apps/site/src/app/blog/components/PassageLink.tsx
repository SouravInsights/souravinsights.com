"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, LinkSimple } from "@phosphor-icons/react";
import { paint } from "@/lib/highlight-palette";
import { useTheme } from "@/context/ThemeContext";
import {
  CONTAINER_ID,
  blockAt,
  blocksOf,
  copyText,
  parseHash,
  type Span,
} from "../utils/passage";

/**
 * Passage permalinks.
 *
 * `#L12-L18` marks a run of top-level blocks in the article body (1-based, DOM
 * order) and scrolls the first into view — the prose equivalent of GitHub's
 * line range. Selecting prose gets the highlight palette, which carries the
 * same link action; other blocks get this chip.
 *
 * The mark is a CSS Custom Highlight over a Range, not a tinted box: the paint
 * follows the text's own line boxes, so it reads as a highlighter across the
 * passage instead of a card behind it. Nothing in the React tree is touched,
 * and the mark reflows with the text for free.
 *
 * The chip is portalled to the body and positioned in document coordinates, so
 * it scrolls with the text it belongs to. A fixed chip would have to chase the
 * selection on every scroll frame, and hiding it on scroll loses the action the
 * reader just revealed.
 *
 * Blocks are counted from `#mdx-content-container`'s element children at read
 * time, so both ends of a link agree with no build-time marking. Like GitHub's
 * line links, the range shifts if earlier blocks are added or removed.
 */

const HIGHLIGHT = "passage";
/** The reader's amber, so a mark reads the same on both surfaces. */
const PASSAGE_HUE = 2;

const canHighlight =
  typeof CSS !== "undefined" && typeof CSS.highlights !== "undefined";

export default function PassageLink() {
  const [menu, setMenu] = useState<{
    left: number;
    top: number;
    above: boolean;
    span: Span;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number | null>(null);
  const out = useRef<number | null>(null);
  const { isDarkMode } = useTheme();

  // Publish the palette's ink/wash for this theme onto the prose container, so
  // `::highlight(passage)` paints from the same values reader mode uses.
  useEffect(() => {
    const root = document.getElementById(CONTAINER_ID);
    if (!root) return;
    const dark = document.documentElement.classList.contains("dark");
    const { wash, ink } = paint(PASSAGE_HUE, dark);
    root.style.setProperty("--passage-wash", wash);
    root.style.setProperty("--passage-ink", ink);
  }, [isDarkMode]);

  const show = useCallback((span: Span | null) => {
    const root = document.getElementById(CONTAINER_ID);
    if (!root) return;
    const clear = () => {
      if (canHighlight) CSS.highlights.delete(HIGHLIGHT);
    };
    if (!span) {
      clear();
      return;
    }
    const blocks = blocksOf(root);
    const start = Math.max(1, span.start);
    const end = Math.min(blocks.length, span.end);
    if (start > blocks.length) {
      clear();
      return;
    }
    const first = blocks[start - 1];
    const last = blocks[end - 1];
    if (canHighlight) {
      const range = document.createRange();
      range.setStartBefore(first);
      range.setEndAfter(last);
      CSS.highlights.set(HIGHLIGHT, new Highlight(range));
    }
    // Scroll even without highlight support: the link still has to land.
    const top = window.scrollY + first.getBoundingClientRect().top - 72;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
  }, []);

  // URL hash -> highlight.
  useEffect(() => {
    const sync = () => show(parseHash(window.location.hash));
    sync();
    window.addEventListener("hashchange", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      if (canHighlight) CSS.highlights.delete(HIGHLIGHT);
    };
  }, [show]);

  // Selection -> "Copy link" chip. A short settle keeps it from flickering
  // while the pointer is still dragging the selection.
  useEffect(() => {
    let settle = 0;

    const measure = () => {
      const root = document.getElementById(CONTAINER_ID);
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setMenu(null);
        return;
      }
      const range = selection.getRangeAt(0);
      if (!root || !root.contains(range.commonAncestorContainer)) {
        setMenu(null);
        return;
      }
      const from = blockAt(root, range.startContainer);
      const to = blockAt(root, range.endContainer);
      const box = range.getBoundingClientRect();
      if (!from || !to || (box.width === 0 && box.height === 0)) {
        setMenu(null);
        return;
      }
      // Prose selections belong to the highlight palette, which carries the
      // same "Copy link" action. Two chips over one selection is one too many.
      const inProse = !!(
        range.startContainer.parentElement?.closest("p") ??
        range.endContainer.parentElement?.closest("p")
      );
      if (inProse) {
        setMenu(null);
        return;
      }
      // Vertical placement uses the whole selection box so the chip never lands
      // on a selected line. Horizontal follows the cursor end: on a
      // multi-paragraph selection the box centre is nowhere near the pointer.
      let cursorX = box.left + box.width / 2;
      if (selection.focusNode) {
        const caret = document.createRange();
        caret.setStart(selection.focusNode, selection.focusOffset);
        caret.collapse(true);
        const caretRect = caret.getBoundingClientRect();
        if (caretRect.width || caretRect.height) {
          cursorX = caretRect.left + caretRect.width / 2;
        }
      }
      const above = box.top > 64;
      const x = Math.min(Math.max(cursorX, 88), window.innerWidth - 88);
      const y = above ? box.top - 8 : box.bottom + 8;
      setCopied(false);
      setClosing(false);
      setMenu({
        // Document coordinates: the chip is absolute, so it rides the page.
        left: window.scrollX + x,
        top: window.scrollY + y,
        above,
        span: { start: Math.min(from, to), end: Math.max(from, to) },
      });
    };

    const onSelectionChange = () => {
      window.clearTimeout(settle);
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setMenu(null);
        return;
      }
      settle = window.setTimeout(measure, 120);
    };

    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.clearTimeout(settle);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (out.current) window.clearTimeout(out.current);
    },
    []
  );

  const copy = useCallback(async () => {
    if (!menu) return;
    const { origin, pathname } = window.location;
    await copyText(`${origin}${pathname}#L${menu.span.start}-L${menu.span.end}`);
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    if (out.current) window.clearTimeout(out.current);
    timer.current = window.setTimeout(() => {
      setClosing(true);
      out.current = window.setTimeout(() => setMenu(null), 120);
    }, 1400);
  }, [menu]);

  if (!menu) return null;

  return createPortal(
    <button
      type="button"
      // Keep the selection alive through the click.
      onMouseDown={(event) => event.preventDefault()}
      onClick={copy}
      style={{ left: menu.left, top: menu.top }}
      data-placement={menu.above ? "above" : "below"}
      data-closing={closing ? "true" : undefined}
      aria-label={copied ? "Link copied" : "Copy link to this passage"}
      className="passage-chip absolute z-50 flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-sm font-medium text-background shadow-lg"
    >
      {copied ? (
        <Check size={14} weight="bold" />
      ) : (
        <LinkSimple size={14} weight="bold" />
      )}
      <span>{copied ? "Copied" : "Copy link"}</span>
    </button>,
    document.body
  );
}
