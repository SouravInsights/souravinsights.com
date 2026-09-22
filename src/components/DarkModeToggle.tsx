"use client";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";
import useSound from "use-sound";

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [playClick] = useSound("/sounds/click.mp3", { volume: 0.25 });

  const handleOnClick = () => {
    toggleDarkMode();
    playClick();
  };

  return (
    <button
      onClick={handleOnClick}
      aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent"
    >
      {/* CSS-driven so the icon is correct on the very first paint. */}
      <Sun size={16} className="hidden dark:block" />
      <Moon size={16} className="block dark:hidden" />
    </button>
  );
}
