"use client";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";
import useSound from "use-sound";

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [playClick] = useSound("/sounds/click.mp3", { voluume: 0.25 });

  const handleOnClick = () => {
    toggleDarkMode();
    playClick();
  };

  return (
    <button
      onClick={handleOnClick}
      className="p-2 rounded-full bg-secondary text-foreground shadow-sm"
    >
      {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
    </button>
  );
}
