/**
 * What a question is allowed to look like.
 *
 * The endpoint is public and the whole conversation is sent on every turn, so
 * without limits a single request can carry an arbitrarily large prompt. That is
 * not a conversation, it is a lever on someone else's bill.
 */

import type { UIMessage } from "ai";

/** More than this in one body is not a conversation; refuse it. */
export const MAX_MESSAGES = 100;
/** What actually reaches the model: the recent turns, not the whole session. */
export const KEEP_MESSAGES = 12;
/** One message of prose, longer than any question or answer needs. */
export const MAX_TEXT_PER_MESSAGE = 2000;

/**
 * The recent turns, with each text part capped.
 *
 * Trimming rather than refusing: a long conversation is legitimate, and the
 * older turns have already been read. What the model needs is what happened
 * recently, which is also what keeps the prompt a predictable size.
 */
export function trimHistory(messages: UIMessage[]): UIMessage[] {
  return messages.slice(-KEEP_MESSAGES).map((message) => ({
    ...message,
    parts: message.parts.map((part) => {
      const text = part as { type: string; text?: string };
      return text.type === "text" && typeof text.text === "string"
        ? ({ ...part, text: text.text.slice(0, MAX_TEXT_PER_MESSAGE) } as UIMessage["parts"][number])
        : part;
    }),
  }));
}

/**
 * Only our own pages may ask.
 *
 * Checked by comparing the request's origin to the host it arrived on, so it
 * works on the deployed domain, a preview URL and localhost without a list of
 * allowed hosts. Browsers send Origin on a same-origin POST; `curl` sends
 * nothing, which is exactly the case this turns away. It is friction, not
 * security: a header is trivial to forge. It makes casual scripting not worth
 * the trouble, which is all it is for.
 */
export function isFromOurOwnPages(request: {
  headers: Headers;
}): boolean {
  const source =
    request.headers.get("origin") ?? request.headers.get("referer") ?? "";
  if (!source) return false;
  try {
    const from = new URL(source).host;
    const host = request.headers.get("host") ?? "";
    return Boolean(host) && from === host;
  } catch {
    return false;
  }
}
