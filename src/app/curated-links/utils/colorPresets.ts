export interface ColorPreset {
  name: string;
  startColor: string;
  endColor: string;
}

export const colorPresets: ColorPreset[] = [
  { name: "Ocean Breeze", startColor: "#a5f3fc", endColor: "#0ea5e9" },
  { name: "Sunset Glow", startColor: "#fecaca", endColor: "#f87171" },
  { name: "Forest Mist", startColor: "#bbf7d0", endColor: "#22c55e" },
  { name: "Lavender Dream", startColor: "#e9d5ff", endColor: "#a855f7" },
  { name: "Golden Hour", startColor: "#fef3c7", endColor: "#f59e0b" },
  { name: "Mint Cream", startColor: "#ccfbf1", endColor: "#14b8a6" },
  { name: "Cherry Blossom", startColor: "#fce7f3", endColor: "#ec4899" },
  { name: "Slate Gray", startColor: "#f1f5f9", endColor: "#64748b" },
];
