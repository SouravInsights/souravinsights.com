"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useFeedback } from "@/hooks/useFeedback";

/**
 * A real switch for the cover style: a track with a spring-loaded thumb and a
 * label that swaps in place. The invisible label locks the width so the text
 * change never reflows the control.
 */
export function CoverToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const feedback = useFeedback();

  return (
    <button
      type="button"
      onClick={() => {
        feedback.select();
        onChange(!checked);
      }}
      aria-pressed={checked}
      className="group inline-flex shrink-0 items-center gap-2.5 rounded-full border border-border px-3 py-1.5 transition-colors hover:bg-foreground/5"
    >
      <span
        className={`relative h-[18px] w-8 shrink-0 rounded-full transition-colors duration-300 ${
          checked ? "bg-green-500/30" : "bg-muted-foreground/25"
        }`}
      >
        <motion.span
          className={`absolute top-[2px] h-3.5 w-3.5 rounded-full transition-colors duration-300 ${
            checked ? "bg-green-500" : "bg-muted-foreground/60"
          }`}
          animate={{ left: checked ? 16 : 2 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </span>

      <span className="relative">
        <span className="type-caption invisible whitespace-nowrap" aria-hidden="true">
          Generative covers
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={checked ? "generative" : "original"}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="type-caption absolute left-0 top-0 whitespace-nowrap text-muted-foreground transition-colors group-hover:text-foreground"
          >
            {checked ? "Original covers" : "Generative covers"}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}