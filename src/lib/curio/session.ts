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
