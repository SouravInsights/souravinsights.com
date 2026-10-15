"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { logout } from "./actions";

export function LogoutButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await logout();
          router.refresh();
        })
      }
      disabled={pending}
      className="h-10 rounded-lg border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-foreground/5 disabled:opacity-40"
    >
      {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
