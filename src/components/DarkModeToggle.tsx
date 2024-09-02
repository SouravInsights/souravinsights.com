"use client";
import React from "react";
import { useTheme } from "@/context/ThemeContext";
import { Moon, Sun } from "lucide-react";

export function DarkModeToggle() {
  const { isDarkMode, toggleDarkMode } = useTheme();

  return (
    <button
      onClick={toggleDarkMode}
      className="p-2 rounded-full bg-green-400 text-gray-800"
    >
      {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
    </button>
  );
}
