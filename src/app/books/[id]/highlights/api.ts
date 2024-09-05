const READWISE_API_TOKEN = process.env.READWISE_API_TOKEN;

export async function getHighlights(
  bookId: string,
  page: number = 1,
  sort: "date" | "location" = "date"
) {
  // Construct the API URL with query parameters
  let url = `https://readwise.io/api/v2/highlights/?book_id=${bookId}&page=${page}`;

  // Add sorting parameter to the URL
  if (sort === "location") {
    url += "&order_by=location";
  } else {
    url += "&order_by=-created_at"; // The minus sign means descending order
  }

  try {
    // Fetch highlights from Readwise API
    const response = await fetch(url, {
      headers: {
        Authorization: `Token ${READWISE_API_TOKEN}`,
      },
      next: { revalidate: 3600 }, // Revalidate cache every hour
    });

    if (!response.ok) {
      throw new Error("Failed to fetch highlights");
    }

    // Parse and return the JSON response
    return response.json();
  } catch (error) {
    console.error("Error fetching highlights:", error);
    throw error;
  }
}
