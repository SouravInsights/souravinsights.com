"use client";

import { useCallback, useEffect, useState } from "react";
import type { UIMessage } from "ai";
import posthog from "posthog-js";
import {
  readSession,
  readShares,
  rememberShare,
  writeSession,
  type RememberedShare,
} from "@/lib/curio/session";

/**
 * Putting a conversation behind a link.
 *
 * One implementation for both places that can do it: the chat, and a shared page
 * that has been continued. The rules are the ones that make a link trustworthy:
 *
 * - Nothing is sent anywhere until this is called, so a conversation is private
 *   by default by not existing.
 * - If nothing has been added since the last share, the button copies the link
 *   that already exists instead of making a second page with the same content.
 * - The links this browser made are remembered locally, because there are no
 *   accounts here to remember them for you.
 */
export function useShareConversation(messages: UIMessage[]) {
  const [shareState, setShareState] = useState<
    "idle" | "working" | "copied" | "failed"
  >("idle");
  const [shareFailure, setShareFailure] = useState("");
  /** The link this conversation already has, if it was shared at this length. */
  const [shared, setShared] = useState<{ id: string; count: number } | null>(
    null
  );
  /** The links this browser has made, newest first. */
  const [shares, setShares] = useState<RememberedShare[]>([]);

  useEffect(() => {
    const session = readSession();
    if (session?.shareId && typeof session.shareCount === "number") {
      setShared({ id: session.shareId, count: session.shareCount });
    }
    setShares(readShares());
  }, []);

  useEffect(() => {
    if (shareState !== "copied" && shareState !== "failed") return;
    const timer = window.setTimeout(() => setShareState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [shareState]);

  /** Put a link on the clipboard, and say so for a moment. */
  const copy = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setShareState("copied");
    } catch {
      setShareFailure("Could not reach the clipboard.");
      setShareState("failed");
    }
  }, []);

  const share = useCallback(async () => {
    if (shareState === "working") return;

    // Nothing has changed since the last share, so this is a copy, not a new
    // snapshot: hand the same link back.
    if (shared && shared.count === messages.length) {
      await copy(`${window.location.origin}/curio/${shared.id}`);
      return;
    }

    setShareState("working");
    try {
      const response = await fetch("/api/curio/share", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages }),
      });
      if (!response.ok) {
        // Keep the reason rather than swallowing it: a 503 here has meant the
        // storage was not ready, which is worth being able to see.
        const detail = (await response.json().catch(() => null)) as
          | { error?: { message?: string } }
          | null;
        setShareFailure(
          detail?.error?.message ?? `Request failed (${response.status})`
        );
        setShareState("failed");
        return;
      }
      const { data } = (await response.json()) as {
        data: { id: string; title: string };
      };
      writeSession({
        messages,
        shareId: data.id,
        shareCount: messages.length,
        seedId: readSession()?.seedId,
      });
      setShared({ id: data.id, count: messages.length });
      setShares(
        rememberShare({
          id: data.id,
          title: data.title,
          createdAt: new Date().toISOString(),
        })
      );
      posthog.capture("curio_shared", { messages: messages.length });
      await copy(`${window.location.origin}/curio/${data.id}`);
    } catch (error) {
      setShareFailure(error instanceof Error ? error.message : "Request failed");
      setShareState("failed");
    }
  }, [copy, messages, shareState, shared]);

  return {
    share,
    copy,
    shareState,
    shareFailure,
    shares,
    /** True when the link already made still describes this conversation. */
    alreadyShared: Boolean(shared && shared.count === messages.length),
  };
}
