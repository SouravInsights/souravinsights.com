"use client";

/** UI-only: whether to render admin controls. Authorises nothing. */
export function hasAdminHint(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie
    .split("; ")
    .some((cookie) => cookie === "admin_ui=1");
}
