import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Admin auth for every page and API.
 *
 * One env var: `ADMIN_SECRET`, set high entropy. The browser holds a signed,
 * expiring token, never the secret. `admin_session` is HttpOnly, Secure and
 * SameSite=Strict; rotating `ADMIN_SECRET` invalidates every session.
 *
 * `admin_ui` is a non-secret hint cookie so a static page (blog drafts) can
 * show admin controls client-side. It authorises nothing.
 */

const SESSION_COOKIE = "admin_session";
const HINT_COOKIE = "admin_ui";
// Matches the cookie this replaced. Browsers cap lifetime near 400 days.
const SESSION_DAYS = 365;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function getAdminSecret(): string | undefined {
  return process.env.ADMIN_SECRET;
}

/** Constant-time compare; a length mismatch is not itself secret-dependent. */
function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

function sign(expiresAt: number): string {
  const secret = getAdminSecret();
  if (!secret) return "";
  return createHmac("sha256", secret).update(String(expiresAt)).digest("hex");
}

function verifyToken(token: string | undefined): boolean {
  if (!token) return false;
  const [rawExpiry, signature] = token.split(".");
  const expiresAt = Number(rawExpiry);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  return safeEqual(signature ?? "", sign(expiresAt));
}

/** True when the current request carries a valid admin session cookie. */
export function isAdminAuthenticated(): boolean {
  return verifyToken(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * True for an admin write: a Bearer token, or a same-origin request carrying
 * the session cookie. Bearer skips the origin check — a cross-site page can't
 * set that header.
 */
function isAdminRequest(request: NextRequest): boolean {
  const secret = getAdminSecret();
  const header = request.headers.get("authorization");
  if (secret && header && safeEqual(header, `Bearer ${secret}`)) return true;

  if (!isAdminAuthenticated()) return false;

  if (request.method === "GET" || request.method === "HEAD") return true;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** A 401 response for a non-admin write, or null when the caller may proceed. */
export function requireAdmin(request: NextRequest): NextResponse | null {
  if (isAdminRequest(request)) return null;
  return NextResponse.json(
    { error: { code: "unauthorized", message: "Missing or invalid admin key" } },
    { status: 401 }
  );
}

/** Validates the secret and starts a session. Server actions/routes only. */
export async function loginAdmin(secret: string): Promise<boolean> {
  const expected = getAdminSecret();
  if (!expected || !safeEqual(secret, expected)) return false;

  const expiresAt = Date.now() + SESSION_MS;
  const maxAge = SESSION_DAYS * 24 * 60 * 60;
  const jar = cookies();
  jar.set(SESSION_COOKIE, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  jar.set(HINT_COOKIE, "1", {
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge,
  });
  return true;
}

export function logoutAdmin(): void {
  const jar = cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete(HINT_COOKIE);
}
