"use client";

import { useEffect } from "react";

/**
 * Segment-level error boundary. Without this, a client error bubbles all the
 * way out and Next shows its raw "missing required error components" message.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-5xl flex-col items-center justify-center px-5 text-center">
      <h1 className="type-title mb-2">Something went wrong</h1>
      <p className="type-body mb-6 max-w-md text-muted-foreground">
        The page hit an unexpected error. Trying again usually fixes it.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 type-caption font-medium text-foreground transition-colors hover:bg-foreground/5"
      >
        Try again
      </button>
    </div>
  );
}