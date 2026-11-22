"use client";

import { useState } from "react";
import { QuoteActions } from "@/components/quote/actions";

export function QuoteActionsDemo() {
  const [customize, setCustomize] = useState(false);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");

  return (
    <div className="w-[560px] max-w-full overflow-hidden rounded-b-[14px] border">
      <QuoteActions
        customize={customize}
        onCustomizeChange={setCustomize}
        status={status}
        statusText={status === "done" ? "Image saved" : ""}
        onSave={() => setStatus("done")}
        onCopy={() => setStatus("done")}
      />
    </div>
  );
}
