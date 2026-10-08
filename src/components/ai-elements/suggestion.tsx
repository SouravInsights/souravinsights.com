"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { useCallback } from "react";

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

/**
 * A suggestion chip. `h-8` and `px-3` rather than the `sm` button's `h-9`/`px-4`:
 * these arrive in lanes of three, six at a time, where a 36px pill with 16px of
 * side padding reads as a row of buttons competing with the page. 32px is still
 * a comfortable tap target and is the height the site's own small controls use.
 */
export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("h-8 cursor-pointer rounded-full px-3", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
