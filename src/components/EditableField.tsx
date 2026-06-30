"use client";

import React, { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface EditableFieldProps {
  value: string;
  onChange: (val: string) => void;
  isEditing: boolean;
  className?: string;
  multiline?: boolean;
  as?: React.ElementType;
}

export function EditableField({
  value,
  onChange,
  isEditing,
  className,
  multiline = false,
  as: Component = "span",
}: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && !isEditing) {
      ref.current.innerText = value;
    }
  }, [value, isEditing]);

  if (!isEditing) {
    return (
      <Component className={className} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, "<br />") }} />
    );
  }

  return (
    <Component
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={cn(
        "outline-none transition-all border border-transparent rounded px-1 -mx-1",
        "focus:border-white/20 focus:bg-white/5",
        "hover:border-white/20 hover:bg-white/5",
        className
      )}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        onChange(e.currentTarget.innerText);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
        if (!multiline && e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      }}
      dangerouslySetInnerHTML={{ __html: value }}
    />
  );
}
