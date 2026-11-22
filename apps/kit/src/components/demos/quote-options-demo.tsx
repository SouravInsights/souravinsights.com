"use client";

import { useMemo, useState } from "react";
import { QuoteOptions } from "@/components/quote/options";
import { resolveOptions, type Overrides } from "@/components/quote/render";
import { THEMES } from "@/components/quote/themes";

export function QuoteOptionsDemo() {
  const theme = THEMES[0];
  const variant = theme.variants[0];
  const [overrides, setOverrides] = useState<Overrides>({});
  const [quote, setQuote] = useState("The best interfaces disappear.");
  const [title, setTitle] = useState("Disappearing interfaces");
  const [publication, setPublication] = useState("souravinsights.com");

  const content = useMemo(
    () => ({ quote, title, publication, context: "" }),
    [quote, title, publication]
  );
  const options = useMemo(
    () => resolveOptions(theme, variant, overrides, content),
    [theme, variant, overrides, content]
  );

  return (
    <div className="w-72 px-4 pb-5">
      <QuoteOptions
        theme={theme}
        variant={variant}
        options={options}
        overrides={overrides}
        set={(patch) => setOverrides((all) => ({ ...all, ...patch }))}
        clear={(key) =>
          setOverrides((all) => {
            const next = { ...all };
            delete next[key];
            return next;
          })
        }
        reset={() => setOverrides({})}
        quote={quote}
        setQuote={setQuote}
        title={title}
        setTitle={setTitle}
        publication={publication}
        setPublication={setPublication}
        onDone={() => undefined}
        scrolled={false}
      />
    </div>
  );
}
