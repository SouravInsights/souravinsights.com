import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Security check - only allow revalidation with correct secret
    if (body.secret !== process.env.REVALIDATE_SECRET) {
      return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
    }

    // Trigger revalidation of the curated-links page
    revalidatePath("/curated-links");

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Error revalidating:", error);
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}
