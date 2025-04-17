import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { emailId, scheduleDate } = await request.json();

    if (!emailId) {
      return NextResponse.json({ error: "Email ID required" }, { status: 400 });
    }

    if (!scheduleDate) {
      return NextResponse.json(
        { error: "Schedule date required" },
        { status: 400 }
      );
    }

    // Convert date string to ISO format if needed
    const publishDate = new Date(scheduleDate).toISOString();

    // Schedule the draft in ButtonDown
    const buttondownResponse = await fetch(
      `https://api.buttondown.com/v1/emails/${emailId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "scheduled",
          publish_date: publishDate,
        }),
      }
    );

    if (!buttondownResponse.ok) {
      const errorData = await buttondownResponse.json();
      console.error("ButtonDown API error:", errorData);
      throw new Error(`Failed to schedule email: ${JSON.stringify(errorData)}`);
    }

    return NextResponse.json({
      success: true,
      message: "Newsletter scheduled successfully",
      scheduledDate: publishDate,
    });
  } catch (error) {
    console.error("Error scheduling newsletter:", error);
    return NextResponse.json(
      { error: "Failed to schedule newsletter" },
      { status: 500 }
    );
  }
}
