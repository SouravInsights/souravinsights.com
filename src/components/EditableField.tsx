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
  href?: string;
  placeholder?: string;
}

export function EditableField({
  value,
  onChange,
  isEditing,
  className,
  multiline = false,
  as: Component = "span",
  href,
  placeholder,
}: EditableFieldProps) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current && !isEditing) {
      ref.current.innerText = value;
    }
  }, [value, isEditing]);

  if (!isEditing) {
    if (href) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, "<br />") }}
        />
      );
    }
    return (
      <Component className={className} dangerouslySetInnerHTML={{ __html: value.replace(/\n/g, "<br />") }} />
    );
  }

  return (
    <>
      <style>{`
        [data-editable-placeholder]:empty:before {
          content: attr(data-editable-placeholder);
          color: color-mix(in srgb, currentColor 30%, transparent);
          pointer-events: none;
        }
      `}</style>
      <Component
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        data-editable-placeholder={value ? undefined : placeholder}
        className={cn(
          "outline-none transition-all rounded-[4px] px-1 -mx-1",
          "focus:bg-muted/80 focus:ring-1 focus:ring-border",
          "hover:bg-muted/50 cursor-text",
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
    </>
  );
}
