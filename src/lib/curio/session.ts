import type { UIMessage } from "ai";

/**
 * The tab's copy of the conversation.
 *
 * Curio has no accounts, so nothing is stored on the server until a
 * conversation is shared. But losing everything to a stray refresh is not a
 * design, it is a bug: a reload, a rotation, an accidental back gesture. The
 * session lives in `sessionStorage` so it survives those, dies with the tab, and
 * never leaves the visitor's own browser.
 */

const KEY = "curio:session";

export interface CurioSession {
  messages: UIMessage[];
  /** The link already made for this conversation, if any. */
  shareId?: string;
  /** How long the conversation was when that link was made. */
  shareCount?: number;
  /**
   * The shared conversation this one was continued from, if it was. Lets a
   * shared page carry on in the reader's tab without touching the snapshot it
   * came from.
   */
  seedId?: string;
}

export function readSession(): CurioSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CurioSession;
    return Array.isArray(parsed?.messages) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session: CurioSession): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // A full or blocked sessionStorage is not worth breaking a conversation
    // over: the session simply does not persist.
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    // Same reasoning as above.
  }
}

/**
 * The links this browser has made.
 *
 * A visitor has no account, so "your past conversations" can only mean what
 * their own browser remembers. The session above is per tab; this list is per
 * device, because a link you made yesterday is still yours today. It holds ids
 * and titles, never content: opening one reads it from the server.
 */
const SHARES_KEY = "curio:shares";
const MAX_SHARES = 20;

export interface RememberedShare {
  id: string;
  title: string;
  createdAt: string;
}

export function readShares(): RememberedShare[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SHARES_KEY);
    const parsed = raw ? (JSON.parse(raw) as RememberedShare[]) : [];
    return Array.isArray(parsed)
      ? parsed.filter((share) => Boolean(share?.id)).slice(0, MAX_SHARES)
      : [];
  } catch {
    return [];
  }
}

/** Put a link at the top of the list, newest first, without duplicates. */
export function rememberShare(share: RememberedShare): RememberedShare[] {
  const next = [
    share,
    ...readShares().filter((existing) => existing.id !== share.id),
  ].slice(0, MAX_SHARES);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(SHARES_KEY, JSON.stringify(next));
    } catch {
      // Same reasoning as the session: a blocked store is not worth breaking.
    }
  }
  return next;
}
