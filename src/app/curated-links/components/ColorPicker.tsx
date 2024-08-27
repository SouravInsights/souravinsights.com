import React from "react";
import { HexColorPicker } from "react-colorful";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import posthog from "posthog-js";

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label: string;
}

export default function ColorPicker({
  color,
  onChange,
  label,
}: ColorPickerProps) {
  const handleLinkClick = () => {
    posthog.capture("color_picker_used", { color, label });
  };
  return (
    <div className="flex flex-col items-center">
      <Label className="mb-1 text-sm font-medium text-gray-700">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            className="w-12 h-12 rounded-md border-2 border-gray-300 hover:border-gray-400 transition-colors duration-200"
            style={{ background: color }}
            aria-label={`Select ${label} color`}
          />
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3">
          <HexColorPicker
            color={color}
            onChange={onChange}
            onClick={handleLinkClick}
          />
          <div className="mt-2 text-center font-mono text-sm">{color}</div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
