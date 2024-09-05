import { NextResponse } from "next/server";

const READWISE_API_TOKEN = process.env.READWISE_API_TOKEN;

export async function GET() {
  try {
    const response = await fetch("https://readwise.io/api/v2/books/", {
      headers: {
        Authorization: `Token ${READWISE_API_TOKEN}`,
      },
    });
    console.log("response from api route:", response);

    if (!response.ok) {
      throw new Error("Failed to fetch books from Readwise");
    }

    const data = await response.json();
    console.log("data from api route:", data);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching books from Readwise:", error);
    return NextResponse.json(
      { error: "Failed to fetch books" },
      { status: 500 }
    );
  }
}
