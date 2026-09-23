"use client";

import { Dithering } from "@paper-design/shaders-react";
import { useReducedMotion } from "framer-motion";
import { useTheme } from "@/context/ThemeContext";

/**
 * The animated dither shader shown while a screenshot is being fetched. One
 * instance per visible placeholder; nothing renders it for off-screen cards.
 */
export function PreviewLoader() {
  const { isDarkMode } = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <div className="absolute inset-0 overflow-hidden bg-secondary">
      <Dithering
        speed={reduceMotion ? 0 : 0.08}
        shape="dots"
        type="8x8"
        size={2.4}
        scale={1.2}
        fit="cover"
        colorBack="#00000000"
        colorFront={isDarkMode ? "#33383d" : "#d3d3cc"}
        width="100%"
        height="100%"
        className="absolute inset-0"
      />
    </div>
  );
}