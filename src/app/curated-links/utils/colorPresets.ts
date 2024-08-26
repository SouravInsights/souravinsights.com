export interface ColorPreset {
  name: string;
  lightStart: string;
  lightEnd: string;
  darkStart: string;
  darkEnd: string;
}

export const colorPresets: ColorPreset[] = [
  {
    name: "Ocean Breeze",
    lightStart: "#a5f3fc",
    lightEnd: "#0ea5e9",
    darkStart: "#0369a1",
    darkEnd: "#0c4a6e",
  },
  {
    name: "Sunset Glow",
    lightStart: "#fecaca",
    lightEnd: "#f87171",
    darkStart: "#b91c1c",
    darkEnd: "#7f1d1d",
  },
  {
    name: "Forest Mist",
    lightStart: "#bbf7d0",
    lightEnd: "#22c55e",
    darkStart: "#15803d",
    darkEnd: "#14532d",
  },
  {
    name: "Lavender Dream",
    lightStart: "#e9d5ff",
    lightEnd: "#a855f7",
    darkStart: "#7e22ce",
    darkEnd: "#581c87",
  },
  {
    name: "Golden Hour",
    lightStart: "#fef3c7",
    lightEnd: "#f59e0b",
    darkStart: "#b45309",
    darkEnd: "#78350f",
  },
  {
    name: "Mint Cream",
    lightStart: "#ccfbf1",
    lightEnd: "#14b8a6",
    darkStart: "#0f766e",
    darkEnd: "#134e4a",
  },
  {
    name: "Cherry Blossom",
    lightStart: "#fce7f3",
    lightEnd: "#ec4899",
    darkStart: "#be185d",
    darkEnd: "#831843",
  },
  {
    name: "Slate Gray",
    lightStart: "#f1f5f9",
    lightEnd: "#64748b",
    darkStart: "#475569",
    darkEnd: "#1e293b",
  },
];
