/*
 * Passage permalinks: `#L12-L18` names top-level blocks in the article body
 * (1-based, DOM order) — the prose equivalent of GitHub's line range.
 *
 * Blocks are counted from `#mdx-content-container`'s element children at read
 * time, so both ends of a link agree with no build-time marking. Like GitHub's
 * line links, the range shifts if earlier blocks are added or removed.
 */

export const CONTAINER_ID = "mdx-content-container";

const HASH = /^#L(\d+)(?:-L?(\d+))?$/i;

export type Span = { start: number; end: number };

export function blocksOf(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children) as HTMLElement[];
}

export function parseHash(hash: string): Span | null {
  const match = HASH.exec(hash);
  if (!match) return null;
  const first = Number(match[1]);
  const last = match[2] ? Number(match[2]) : first;
  if (!Number.isInteger(first) || first < 1) return null;
  return { start: Math.min(first, last), end: Math.max(first, last) };
}

export function blockAt(root: HTMLElement, node: Node | null): number | null {
  if (!node) return null;
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const top = element?.closest(`#${CONTAINER_ID} > *`);
  if (!top) return null;
  const index = blocksOf(root).indexOf(top as HTMLElement);
  return index < 0 ? null : index + 1;
}

/** The block span a selection covers, or null when it is not in the article. */
export function spanOfSelection(range: Range | null): Span | null {
  if (!range) return null;
  const root = document.getElementById(CONTAINER_ID);
  if (!root) return null;
  const from = blockAt(root, range.startContainer);
  const to = blockAt(root, range.endContainer);
  if (!from || !to) return null;
  return { start: Math.min(from, to), end: Math.max(from, to) };
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const ok = document.execCommand("copy");
    field.remove();
    return ok;
  }
}

/** Copy the permalink for the blocks a range (or the live selection) covers. */
export async function copyPassageLink(range: Range | null): Promise<boolean> {
  const live =
    range ??
    (window.getSelection()?.rangeCount ? (window.getSelection()?.getRangeAt(0) ?? null) : null);
  const span = spanOfSelection(live);
  if (!span) return false;
  const { origin, pathname } = window.location;
  return copyText(`${origin}${pathname}#L${span.start}-L${span.end}`);
}
