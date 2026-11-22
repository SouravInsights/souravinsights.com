"use client";

import { useEffect, useState } from "react";
import { cardToBlob, resolveOptions } from "@/components/quote/render";
import { THEMES } from "@/components/quote/themes";

export function QuoteRenderDemo() {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const theme = THEMES[0];
    const options = resolveOptions(theme, theme.variants[0], {}, {
      quote: "The best interfaces disappear.",
      title: "Disappearing interfaces",
      publication: "souravinsights.com",
      context: "",
    });

    void cardToBlob("post", theme, options).then((blob) => {
      if (!blob) return;
      objectUrl = URL.createObjectURL(blob);
      setUrl(objectUrl);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, []);

  if (!url) {
    return <p className="text-sm text-muted-foreground">Rendering…</p>;
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="Rendered quote card" className="w-56 rounded-xl" />;
}
