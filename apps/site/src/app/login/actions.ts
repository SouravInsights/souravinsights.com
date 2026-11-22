"use server";

import { headers } from "next/headers";
import { loginAdmin, logoutAdmin } from "@/lib/admin-auth";
import { adminLoginLimiter, clientIp } from "@/lib/links/ratelimit";

/** Compares the secret server-side and, on success, starts a session. */
export async function login(
  secret: string
): Promise<{ ok: boolean; error?: string }> {
  const rate = await adminLoginLimiter.limit(clientIp(headers()));
  if (!rate.success) {
    return { ok: false, error: "Too many attempts. Try again in a few minutes." };
  }

  const ok = await loginAdmin(secret);
  return ok ? { ok: true } : { ok: false, error: "Incorrect password." };
}

export async function logout(): Promise<void> {
  logoutAdmin();
}
