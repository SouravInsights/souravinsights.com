"use client";

import { useState } from "react";
import {
  ColorPicker,
  ColorPickerBrightness,
  ColorPickerHex,
  ColorPickerSide,
  ColorPickerWheel,
} from "@/components/ui/color-picker";

export function ColorPickerDemo() {
  const [value, setValue] = useState("#8fc4e3");

  return (
    <ColorPicker value={value} onChange={setValue}>
      <ColorPickerWheel />
      <ColorPickerSide>
        <ColorPickerBrightness />
        <ColorPickerHex />
      </ColorPickerSide>
    </ColorPicker>
  );
}
