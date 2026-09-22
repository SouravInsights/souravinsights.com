"use client";

/**
 * Root error boundary. It replaces the whole document, so it renders its own
 * html/body and can't rely on the app's stylesheet — hence inline styles.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: "#0d0f11",
          color: "#eceff1",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>
          The page hit an unexpected error.
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            border: "1px solid rgba(255,255,255,0.2)",
            background: "transparent",
            color: "inherit",
            borderRadius: 8,
            padding: "8px 16px",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}