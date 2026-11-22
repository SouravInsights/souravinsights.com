import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { v4 as uuidv4 } from "uuid";

// This proxy sets a visitor ID cookie for anonymous analytics
export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  // Check if the visitor ID cookie already exists
  if (!request.cookies.has("visitor_id")) {
    // Generate a unique ID for this visitor
    const visitorId = uuidv4();

    // Set the cookie (expiration: 1 year)
    response.cookies.set({
      name: "visitor_id",
      value: visitorId,
      httpOnly: true,
      sameSite: "strict",
      expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      path: "/",
    });
  }

  return response;
}

// Only apply the proxy to blog pages
export const config = {
  matcher: ["/blog/:path*"],
};
