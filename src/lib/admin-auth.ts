import { cookies } from "next/headers";

/**
 * Single source of truth for admin authentication across all pages.
 *
 * Uses one env var: ADMIN_SECRET
 * (set in .env as ADMIN_SECRET=<your-password>)
 *
 * Session stored in httpOnly cookie "admin_session".
 */

const COOKIE_NAME = "admin_session";

export function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET;
}

/** Returns true if the current request has a valid admin session cookie. */
export function isAdminAuthenticated(): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  const session = cookies().get(COOKIE_NAME);
  return session?.value === secret;
}

/**
 * Validates the given secret and sets the session cookie if correct.
 * Returns true on success.
 */
export async function loginAdmin(secret: string): Promise<boolean> {
  const expected = getAdminSecret();
  if (!expected || secret !== expected) return false;

  cookies().set(COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return true;
}
