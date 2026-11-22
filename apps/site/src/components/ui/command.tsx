"use client";

import * as React from "react";
import { type DialogProps } from "@radix-ui/react-dialog";
import { Command as CommandPrimitive } from "cmdk";
import { MagnifyingGlass } from "@phosphor-icons/react";

import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * shadcn's Command, on this site's tokens.
 *
 * The structure is the registry's verbatim — the same parts, the same `cmdk-*`
 * hooks, the same prop names — so anything written against the documented
 * component works here unchanged. Only the look is ours: the sheet takes the
 * reader's 14px radius and border, the rows take the row radius and text tier,
 * and the group headings take the label tier.
 */

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden bg-background text-foreground",
      className,
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

function CommandDialog({
  children,
  className,
  label = "Command palette",
  ...props
}: DialogProps & { className?: string; label?: string }) {
  return (
    <Dialog {...props}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          "flex max-h-[min(80svh,34rem)] w-[min(92vw,34rem)] max-w-none flex-col gap-0 overflow-hidden rounded-[14px] border border-border bg-background p-0 shadow-2xl [&>button]:hidden",
          className,
        )}
      >
        <DialogTitle className="sr-only">{label}</DialogTitle>
        <Command
          className="
          [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-2.5
          [&_[cmdk-group-heading]]:font-mono [&_[cmdk-group-heading]]:text-[11px]
          [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase
          [&_[cmdk-group-heading]]:tracking-[0.14em] [&_[cmdk-group-heading]]:text-muted-foreground
          [&_[cmdk-input-wrapper]_svg]:h-4 [&_[cmdk-input-wrapper]_svg]:w-4
          [&_[cmdk-input]]:h-11
        "
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
}

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, children, ...props }, ref) => (
  <div
    className="flex h-11 shrink-0 items-center gap-2.5 border-b border-border px-4"
    cmdk-input-wrapper=""
  >
    <MagnifyingGlass aria-hidden="true" className="h-4 w-4 shrink-0 text-faint-foreground" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        "min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-faint-foreground disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
    {children}
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn(
      "max-h-[min(56svh,20rem)] overflow-y-auto overflow-x-hidden overscroll-contain p-1.5",
      className,
    )}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className={cn("px-3 py-10 text-center type-caption text-muted-foreground", className)}
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn("overflow-hidden text-foreground", className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn("-mx-1.5 my-1 h-px bg-border", className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex h-9 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2.5 text-[13px] leading-none text-muted-foreground outline-none transition-colors duration-100",
      "data-[selected=true]:bg-foreground/[0.06] data-[selected=true]:text-foreground",
      "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
      "[&_svg]:pointer-events-none [&_svg]:shrink-0",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

function CommandShortcut({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn("ml-auto shrink-0 tabular-nums text-[12px] text-faint-foreground", className)}
      {...props}
    />
  );
}
CommandShortcut.displayName = "CommandShortcut";

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
};
