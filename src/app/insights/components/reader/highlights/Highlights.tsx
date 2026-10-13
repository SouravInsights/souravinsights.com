"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Eraser } from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from "react";
import {
  HUES,
  cut,
  paint,
  snap,
  type Highlight,
  type Paint,
} from "./hues";
import { CLEAR, drawBars, playWave, type Under } from "./wave";

/*
 * Highlights for the reader — a port of the palette, the bars and the wave
 * from github.com/SanyamPunia/www components/labs/highlight-wave, driven over
 * the rendered article rather than a fixed notes list.
 *
 * State lives here; paragraphs are rebuilt wholesale per change, exactly like
 * the original: overlapping marks are recomputed (`cut`) and the paragraph's
 * mark spans redrawn from state. New marks render instantly — persistence is
 * a background call that never blocks the wave.
 */

const ENTER = { duration: 0.2, ease: [0.23, 1, 0.32, 1] } as const;
const LEAVE = { duration: 0.12, ease: [0.4, 0, 1, 1] } as const;

const LIFT = [
  "0 1px 2px rgb(0 0 0 / 0.06)",
  "0 8px 16px -6px rgb(0 0 0 / 0.1)",
  "0 20px 40px -16px rgb(0 0 0 / 0.14)",
].join(", ");

const GAP = 12;
const EDGE = 8;

interface Anchor {
  x: number;
  top: number;
  bottom: number;
}

type Pop =
  | { kind: "new"; para: number; start: number; end: number; anchor: Anchor }
  | { kind: "edit"; id: number; viaKey: boolean };

interface WaveRequest {
  id: number;
  from: Paint;
  under: Under[];
  hue: number;
  nonce: number;
}

/** a mark plus its server row id once persistence has answered */
interface Mark extends Highlight {
  rowId?: number;
}

export interface CreatePayload {
  quote: string;
  prefix: string;
  suffix: string;
  occurrence: number;
  hue: number;
}

interface Props {
  /** the element whose <p> children may be highlighted */
  containerRef: RefObject<HTMLElement | null>;
  /** admin sees the palette; visitors only see the marks */
  admin: boolean;
  /** marks already stored, located into the paragraphs on mount */
  initialMarks: { id: number; quote: string; occurrence: number; hue: number }[];
  onCreate: (payload: CreatePayload) => Promise<number | null>;
  onRecolor: (rowId: number, hue: number) => void;
  onDelete: (rowId: number) => void;
}

function bounds(rects: DOMRect[], stage: DOMRect): Anchor | null {
  let l = Number.POSITIVE_INFINITY;
  let r = Number.NEGATIVE_INFINITY;
  let t = Number.POSITIVE_INFINITY;
  let b = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    if (rect.width < 1) continue;
    l = Math.min(l, rect.left);
    r = Math.max(r, rect.right);
    t = Math.min(t, rect.top);
    b = Math.max(b, rect.bottom);
  }
  if (!Number.isFinite(l)) return null;
  return { x: (l + r) / 2 - stage.left, top: t - stage.top, bottom: b - stage.top };
}

/** characters of text in `root` before a DOM position */
function offsetIn(root: Node, node: Node, offset: number): number {
  const range = document.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

const isDark = () => document.documentElement.classList.contains("dark");

export function Highlights({
  containerRef,
  admin,
  initialMarks,
  onCreate,
  onRecolor,
  onDelete,
}: Props): ReactElement | null {
  const reduce = useReducedMotion();
  const paras = useRef<HTMLElement[]>([]);
  const layers = useRef<HTMLElement[]>([]);
  const pop = useRef<HTMLDivElement>(null);

  const [marks, setMarks] = useState<Mark[]>([]);
  const [open, setOpen] = useState<Pop | null>(null);
  const [wave, setWave] = useState<WaveRequest | null>(null);
  const [dark, setDark] = useState(false);
  const [said, setSaid] = useState("");

  const nextId = useRef(1);
  const played = useRef(0);
  const nonce = useRef(0);
  const live = useRef({ marks, open });
  live.current = { marks, open };

  const textOf = (para: number) => paras.current[para]?.textContent ?? "";

  // Theme flips repaint every mark's ink/wash.
  useEffect(() => {
    const update = () => setDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  /*
   * Paragraph registry: every <p> in the article gets ko-rning off (so a run
   * split into characters sets at exactly the width it had as plain text) and
   * an absolutely positioned layer behind its text for the bars.
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    paras.current = Array.from(container.querySelectorAll<HTMLElement>("p"));
    layers.current = paras.current.map((p) => {
      p.classList.add("relative", "isolate", "reader-kern-off");
      const layer = document.createElement("span");
      layer.setAttribute("aria-hidden", "true");
      layer.className = "-z-10 pointer-events-none absolute inset-0";
      p.appendChild(layer);
      return layer;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const base = (para: number): string => {
    const el = paras.current[para];
    return el ? getComputedStyle(el).color : "currentColor";
  };

  /* ---------------- mark DOM, built from state ------------------ */

  /** unwrap a mark back to plain text, keeping its characters */
  const unmark = (para: HTMLElement, id: number) => {
    for (const segment of Array.from(
      para.querySelectorAll<HTMLElement>(`[data-hl="${id}"]`)
    )) {
      segment.replaceWith(document.createTextNode(segment.textContent ?? ""));
    }
    para.normalize();
  };

  /**
   * Wrap the [start,end) run in [data-hl] spans whose words hold [data-ch]
   * characters, the wave's grid. Segment per existing text node so inline
   * elements (links, emphasis) stay intact under the mark.
   */
  const markDom = (para: HTMLElement, mark: Highlight) => {
    const walker = document.createTreeWalker(para, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    let n: Node | null;
    while ((n = walker.nextNode())) nodes.push(n as Text);

    const p = paint(mark.hue, isDark());
    let offset = 0;
    const segments: { node: Text; from: number; to: number; at: number }[] = [];
    for (const node of nodes) {
      const next = offset + node.data.length;
      const from = Math.max(offset, mark.start);
      const to = Math.min(next, mark.end);
      if (from < to) segments.push({ node, from: from - offset, to: to - offset, at: from });
      if (next >= mark.end) break;
      offset = next;
    }

    // Wrap last-to-first so earlier offsets stay valid.
    for (const seg of [...segments].reverse()) {
      const range = document.createRange();
      range.setStart(seg.node, seg.from);
      range.setEnd(seg.node, seg.to);
      const span = document.createElement("span");
      span.dataset.hl = String(mark.id);
      span.dataset.wash = p.wash;
      span.style.color = p.ink;
      span.className =
        "cursor-pointer rounded-[0.22em] outline-none focus-visible:outline-2 focus-visible:outline-current focus-visible:outline-offset-2";
      span.setAttribute("role", "button");
      span.setAttribute("tabIndex", "0");
      span.setAttribute("aria-label", `Highlight in ${HUES[mark.hue].name}`);
      range.surroundContents(span);

      // Words hold whole, characters are inline blocks the wave can move.
      const text = span.textContent ?? "";
      span.textContent = "";
      let cursor = seg.at;
      for (const part of text.split(/(\s+)/)) {
        if (!part) continue;
        if (/^\s+$/.test(part)) {
          span.appendChild(document.createTextNode(part));
          cursor += part.length;
          continue;
        }
        const word = document.createElement("span");
        word.className = "whitespace-nowrap";
        Array.from(part).forEach((ch, j) => {
          const c = document.createElement("span");
          c.dataset.ch = "";
          c.dataset.at = String(cursor + j);
          c.className = "inline-block origin-[50%_70%]";
          // set on the character, never inherited (Chrome keeps the colour an
          // element had while animating otherwise)
          c.style.color = p.ink;
          c.textContent = ch;
          word.appendChild(c);
        });
        span.appendChild(word);
        cursor += part.length;
      }
    }
  };

  /** rebuild one paragraph's mark DOM wholesale from state */
  const rebuildParagraph = (para: number) => {
    const p = paras.current[para];
    const layer = layers.current[para];
    if (!p || !layer) return;
    for (const m of Array.from(p.querySelectorAll<HTMLElement>("[data-hl]"))) {
      m.replaceWith(document.createTextNode(m.textContent ?? ""));
    }
    p.normalize();
    for (const m of live.current.marks.filter((m) => m.para === para)) {
      markDom(p, m);
    }
    drawBars(p, layer);
  };

  /*
   * The bars are redrawn from the marks on every change and every resize, and
   * a pending wave plays on the bars this pass has just drawn.
   */
  useLayoutEffect(() => {
    paras.current.forEach((p, i) => {
      const layer = layers.current[i];
      if (p && layer) drawBars(p, layer);
    });

    if (!wave || wave.nonce === played.current) return;
    played.current = wave.nonce;
    if (reduce) return;
    const mark = live.current.marks.find((m) => m.id === wave.id);
    const p = mark ? paras.current[mark.para] : null;
    const layer = mark ? layers.current[mark.para] : null;
    if (!mark || !p || !layer) return;
    playWave(p, layer, mark.id, wave.from, paint(wave.hue, dark), HUES[wave.hue].swatch, false, wave.under);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, wave, dark]);

  // Rebuild DOM when React state changes (single source of truth).
  useLayoutEffect(() => {
    const dirty = new Set(live.current.marks.map((m) => m.para));
    // paragraphs that LOST all their marks need a rebuild too — tracked simply
    for (let i = 0; i < paras.current.length; i++) {
      const hasDom = paras.current[i]?.querySelector("[data-hl]");
      if (dirty.has(i) || hasDom) rebuildParagraph(i);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, dark]);

  // Bars follow the panel's own size (the resize handle moves the text).
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => {
      paras.current.forEach((p, i) => {
        const layer = layers.current[i];
        if (p && layer) drawBars(p, layer);
      });
    });
    observer.observe(container);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- locating stored marks ------------------ */

  // Server anchors (quote + occurrence in full article text) → para + offsets.
  useEffect(() => {
    const full = paras.current.map((_, i) => textOf(i)).join("");
    const located: Mark[] = [];
    for (const stored of initialMarks) {
      const index = nthIndexOf(full, stored.quote, stored.occurrence);
      if (index === -1) continue; // anchor lost — stays hidden, never deleted
      // which paragraph holds this index
      let acc = 0;
      for (let para = 0; para < paras.current.length; para++) {
        const len = textOf(para).length;
        if (index < acc + len) {
          located.push({
            id: stored.id,
            rowId: stored.id,
            para,
            start: index - acc,
            end: index - acc + stored.quote.length,
            hue: stored.hue,
          });
          break;
        }
        acc += len;
      }
    }
    nextId.current = Math.max(1, ...initialMarks.map((m) => m.id)) + 1;
    setMarks(located);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------- reading a selection ------------------ */

  const read = useCallback((): Pop | null => {
    const container = containerRef.current;
    const sel = window.getSelection();
    if (!container || !sel || sel.rangeCount === 0 || sel.isCollapsed) return null;
    const range = sel.getRangeAt(0);

    const para = paras.current.findIndex(
      (p) => p.contains(range.startContainer) && p.contains(range.endContainer)
    );
    const el = paras.current[para];
    if (!el) return null;
    const text = textOf(para);

    const s = offsetIn(el, range.startContainer, range.startOffset);
    const e = offsetIn(el, range.endContainer, range.endOffset);
    const [start, end] = snap(text, Math.min(s, e), Math.max(s, e));
    if (end <= start) return null;

    const same = live.current.marks.find(
      (m) => m.para === para && m.start === start && m.end === end
    );
    if (same) return { kind: "edit", id: same.id, viaKey: false };

    const anchor = bounds(
      Array.from(range.getClientRects()),
      container.getBoundingClientRect()
    );
    if (!anchor) return null;
    return { kind: "new", para, start, end, anchor };
  }, [containerRef]);

  /* The same pointup/selectionchange pairing as the original. */
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !admin) return;
    let pressing = false;
    let timer = 0;

    const check = () => {
      const next = read();
      if (next) setOpen(next);
    };
    const down = (e: PointerEvent) => {
      const t = e.target as Element;
      if (pop.current?.contains(t)) return;
      if (live.current.open) setOpen(null);
      pressing = container.contains(t);
    };
    const up = () => {
      if (!pressing) return;
      pressing = false;
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 0);
    };
    const changed = () => {
      if (pressing) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(check, 180);
    };

    document.addEventListener("pointerdown", down, true);
    window.addEventListener("pointerup", up);
    document.addEventListener("selectionchange", changed);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", down, true);
      window.removeEventListener("pointerup", up);
      document.removeEventListener("selectionchange", changed);
    };
  }, [admin, containerRef, read]);

  const close = useCallback((restore: boolean) => {
    const was = live.current.open;
    setOpen(null);
    if (restore && was?.kind === "edit" && was.viaKey) {
      paras.current[
        live.current.marks.find((m) => m.id === was.id)?.para ?? -1
      ]
        ?.querySelector<HTMLElement>(`[data-hl="${was.id}"]`)
        ?.focus({ preventScroll: true });
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, close]);

  // Palette positioning, written to the node (needs the palette's own size).
  useLayoutEffect(() => {
    const el = pop.current;
    const container = containerRef.current;
    if (!open || !el || !container) return;
    const box = container.getBoundingClientRect();

    let at: Anchor | null = null;
    if (open.kind === "new") at = open.anchor;
    else {
      const mark = container.querySelector<HTMLElement>(`[data-hl="${open.id}"]`);
      if (mark) at = bounds(Array.from(mark.getClientRects()), box);
    }
    if (!at) return;

    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const above = at.top - GAP - h >= EDGE;
    const top = above ? at.top - GAP - h : at.bottom + GAP;
    const left = Math.min(Math.max(at.x - w / 2, EDGE), Math.max(box.width - w - EDGE, EDGE));
    const ax = Math.min(Math.max(at.x - left, 16), w - 16);

    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    el.style.transformOrigin = `${ax}px ${above ? "100%" : "0%"}`;
    el.style.setProperty("--ax", `${ax}px`);
    el.dataset.side = above ? "top" : "bottom";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, marks]);

  /* ---------------- actions ------------------ */

  const request = (id: number, from: Paint, hue: number, under: Under[] = []) => {
    nonce.current += 1;
    setWave({ id, from, under, hue, nonce: nonce.current });
  };

  const pick = (hue: number) => {
    const current = live.current.open;
    if (!current) return;

    if (current.kind === "new") {
      const { para, start, end } = current;
      const text = textOf(para);
      const quote = text.slice(start, end);
      const id = nextId.current++;
      const under = live.current.marks
        .filter((m) => m.para === para && m.start < end && m.end > start)
        .map((m) => ({
          start: Math.max(m.start, start),
          end: Math.min(m.end, end),
          paint: paint(m.hue, dark),
        }));

      // article-wide occurrence, for the stored anchor
      const full = paras.current.map((_, i) => textOf(i)).join("");
      const startGlobal =
        paras.current
          .slice(0, para)
          .reduce((n, _, i) => n + textOf(i).length, 0) + start;
      const occurrence = full.slice(0, startGlobal).split(quote).length - 1;

      window.getSelection()?.removeAllRanges();
      setMarks((all) => [
        ...cut(all, para, text, start, end, () => nextId.current++),
        { id, para, start, end, hue },
      ]);
      request(id, { ink: base(para), wash: CLEAR }, hue, under);
      setOpen({ kind: "edit", id, viaKey: false });

      // Persistence never blocks the wave; the row id lands when it lands.
      const before = text.slice(Math.max(0, start - 40), start);
      const after = text.slice(end, end + 40);
      onCreate({ quote, prefix: before, suffix: after, occurrence, hue }).then(
        (rowId) => {
          if (rowId === null) return;
          setMarks((all) => all.map((m) => (m.id === id ? { ...m, rowId } : m)));
        }
      );
    } else {
      const mark = live.current.marks.find((m) => m.id === current.id);
      if (!mark) return;
      setMarks((all) => all.map((m) => (m.id === mark.id ? { ...m, hue } : m)));
      request(mark.id, paint(mark.hue, dark), hue);
      if (mark.rowId) onRecolor(mark.rowId, hue);
    }
    setSaid(`Highlighted in ${HUES[hue].name}`);
  };

  const remove = () => {
    if (open?.kind !== "edit") return;
    const mark = live.current.marks.find((m) => m.id === open.id);
    if (!mark) return;
    close(false);
    setSaid("Highlight removed");
    const drop = () => {
      setMarks((all) => all.filter((m) => m.id !== mark.id));
      if (mark.rowId) onDelete(mark.rowId);
    };
    const p = paras.current[mark.para];
    const layer = layers.current[mark.para];
    if (reduce || !p || !layer) return drop();
    const ms = playWave(
      p,
      layer,
      mark.id,
      paint(mark.hue, dark),
      { ink: base(mark.para), wash: CLEAR },
      HUES[mark.hue].swatch,
      true
    );
    window.setTimeout(drop, ms);
  };

  const openMark = (id: number, viaKey: boolean) => {
    if (!admin) return;
    if (!viaKey && !window.getSelection()?.isCollapsed) return;
    setOpen({ kind: "edit", id, viaKey });
  };

  // Clicks on marks open the palette on them (event delegation on the stage).
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !admin) return;
    const click = (e: MouseEvent) => {
      const target = (e.target as Element).closest<HTMLElement>("[data-hl]");
      if (target) openMark(Number(target.dataset.hl), false);
    };
    const key = (e: Event) => {
      const ke = e as globalThis.KeyboardEvent;
      if (ke.key !== "Enter" && ke.key !== " ") return;
      const target = (ke.target as Element).closest<HTMLElement>("[data-hl]");
      if (target) {
        ke.preventDefault();
        openMark(Number(target.dataset.hl), true);
      }
    };
    container.addEventListener("click", click);
    container.addEventListener("keydown", key);
    return () => {
      container.removeEventListener("click", click);
      container.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, containerRef, marks, open]);

  // A palette opened from the keyboard takes focus to its current colour.
  useEffect(() => {
    if (open?.kind !== "edit" || !open.viaKey) return;
    pop.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
  }, [open]);

  const focusPara =
    open?.kind === "new"
      ? open.para
      : open
        ? (marks.find((m) => m.id === open.id)?.para ?? null)
        : null;

  // Dim non-focused paragraphs while a palette is open.
  useEffect(() => {
    paras.current.forEach((p, i) => {
      p.classList.toggle(
        "opacity-35",
        focusPara !== null && focusPara !== i
      );
      p.classList.toggle("transition-opacity", true);
      p.classList.toggle("duration-200", true);
    });
  }, [focusPara]);

  const current = open?.kind === "edit" ? marks.find((m) => m.id === open.id) : undefined;
  const ordered = [...marks].sort((a, b) => a.para - b.para || a.start - b.start);

  if (!admin && ordered.length === 0) return null;

  return (
    <>
      <style>{`
        .reader-kern-off { font-kerning: none; font-variant-ligatures: none; }
      `}</style>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={pop}
            key="palette"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1, transition: ENTER }}
            exit={{ opacity: 0, scale: 0.98, transition: LEAVE }}
            onPointerDown={(e) => e.preventDefault()}
            className="group absolute z-20 flex select-none items-stretch gap-3 rounded-xl border border-border bg-background p-3 max-sm:gap-2 max-sm:p-2.5"
            style={{ boxShadow: LIFT }}
          >
            <span
              aria-hidden="true"
              className="absolute size-2.5 -translate-x-1/2 rotate-45 border-border bg-background group-data-[side=top]:-bottom-1.5 group-data-[side=top]:border-b group-data-[side=top]:border-r group-data-[side=bottom]:-top-1.5 group-data-[side=bottom]:border-l group-data-[side=bottom]:border-t"
              style={{ left: "var(--ax, 50%)" }}
            />

            <fieldset className="m-0 grid min-w-0 grid-cols-3 content-start gap-4 border-0 p-0 max-sm:gap-1.5">
              <legend className="sr-only">Highlight colour</legend>
              {HUES.map((hue, i) => (
                <button
                  key={hue.name}
                  type="button"
                  aria-label={hue.name}
                  title={hue.name}
                  aria-pressed={current?.hue === i}
                  onClick={() => pick(i)}
                  style={{ backgroundColor: hue.swatch, "--hue": hue.swatch } as CSSProperties}
                  className="relative size-6 cursor-pointer rounded-full outline-2 outline-transparent outline-offset-2 transition-[outline-color] duration-150 hover:outline-[color-mix(in_srgb,var(--hue)_35%,transparent)] aria-pressed:outline-(--hue) focus-visible:outline-(--hue) max-sm:size-9"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full ring-1 ring-foreground/10 ring-inset"
                  />
                </button>
              ))}
              <button
                type="button"
                aria-label="Remove highlight"
                title="Remove highlight"
                disabled={!current}
                onClick={remove}
                className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-border text-muted-foreground transition-all duration-150 hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent max-sm:size-9"
              >
                <Eraser aria-hidden="true" className="size-3.5" />
              </button>
            </fieldset>

            <span aria-hidden="true" className="w-px shrink-0 bg-border" />

            <div className="flex w-32 min-w-0 flex-col gap-0.5 sm:w-40">
              {ordered.length === 0 ? (
                <p className="px-2 py-1 type-caption text-muted-foreground">
                  No highlights yet
                </p>
              ) : (
                <ul className="-mr-1 flex max-h-28 flex-col gap-0.5 overflow-y-auto pr-1">
                  {ordered.map((m) => (
                    <li key={m.id}>
                      <button
                        type="button"
                        onClick={() => {
                          window.getSelection()?.removeAllRanges();
                          setOpen({ kind: "edit", id: m.id, viaKey: false });
                          request(m.id, paint(m.hue, dark), m.hue);
                        }}
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-left type-caption transition-all duration-150 hover:bg-foreground/5 hover:text-foreground ${
                          m.id === current?.id
                            ? "bg-foreground/5 text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className="h-3 w-0.5 shrink-0 rounded-full"
                          style={{ backgroundColor: HUES[m.hue].swatch }}
                        />
                        <span className="truncate">
                          {textOf(m.para).slice(m.start, m.end)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <p aria-live="polite" className="sr-only">
        {said}
      </p>
    </>
  );
}

/** index of the `occurrence`-th appearance of `quote` in `text`, or -1 */
function nthIndexOf(text: string, quote: string, occurrence: number): number {
  let seen = 0;
  let at = -1;
  while (seen <= occurrence) {
    at = text.indexOf(quote, at + 1);
    if (at === -1) return -1;
    seen++;
  }
  return at;
}
