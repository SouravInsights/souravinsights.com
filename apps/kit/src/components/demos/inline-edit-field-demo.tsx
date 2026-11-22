"use client";

import { useState } from "react";
import { InlineEditField } from "@/components/ui/inline-edit-field";

export function InlineEditFieldDemo() {
  const [value, setValue] = useState("Disappearing interfaces");

  return (
    <div className="w-64">
      <InlineEditField label="Title" value={value} onChange={setValue} />
    </div>
  );
}
