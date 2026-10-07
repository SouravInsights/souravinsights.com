import { NextResponse } from "next/server";
import { getOpenApiDocument } from "@/lib/links/openapi";

export function GET() {
  return NextResponse.json(getOpenApiDocument(), {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
