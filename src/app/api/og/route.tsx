import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.has("title")
      ? searchParams.get("title")?.slice(0, 100)
      : "Blog Post";
    const excerpt = searchParams.has("excerpt")
      ? searchParams.get("excerpt")?.slice(0, 150)
      : "Interactive tutorials, stories, deep dives on startups, movies, human behavior, and whatever random thing I get curious about at 2 AM 🦉";
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const readingTime = searchParams.get("readingTime") || "5 min read";
    const isDraft = searchParams.get("draft") === "true";

    // Format date
    const formattedDate = new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return new ImageResponse(
      (
        <div
          style={{
            height: "100%",
            width: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#ffffff",
            backgroundImage:
              "radial-gradient(circle at 25px 25px, #f3f4f6 2px, transparent 0), radial-gradient(circle at 75px 75px, #f3f4f6 2px, transparent 0)",
            backgroundSize: "100px 100px",
            position: "relative",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          {/* Background gradient overlay */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background:
                "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
            }}
          />

          {/* Main content container */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "80px 60px",
              maxWidth: "1000px",
              textAlign: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            {/* Site branding */}
            <div
              style={{
                position: "absolute",
                top: "60px",
                left: "60px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  backgroundColor: "#22c55e",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <span
                  style={{
                    color: "white",
                    fontSize: "20px",
                    fontWeight: "bold",
                  }}
                >
                  🦉
                </span>
              </div>
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Notes & Essays
              </span>
            </div>

            {/* Draft badge */}
            {isDraft && (
              <div
                style={{
                  position: "absolute",
                  top: "60px",
                  right: "60px",
                  backgroundColor: "#fef3c7",
                  border: "1px solid #fcd34d",
                  borderRadius: "20px",
                  padding: "8px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    color: "#d97706",
                    fontSize: "14px",
                    fontWeight: "500",
                  }}
                >
                  ⚠️ Draft
                </span>
              </div>
            )}

            {/* Title */}
            <h1
              style={{
                fontSize: "56px",
                fontWeight: "800",
                color: "#111827",
                lineHeight: "1.1",
                marginBottom: "24px",
                maxWidth: "800px",
              }}
            >
              {title}
            </h1>

            {/* Excerpt */}
            <p
              style={{
                fontSize: "20px",
                color: "#6b7280",
                lineHeight: "1.4",
                marginBottom: "32px",
                maxWidth: "700px",
              }}
            >
              {excerpt}
            </p>

            {/* Meta info */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                fontSize: "16px",
                color: "#9ca3af",
              }}
            >
              <span>{formattedDate}</span>
              <span>•</span>
              <span>{readingTime}</span>
            </div>

            {/* Read article button */}
            <div
              style={{
                marginTop: "40px",
                backgroundColor: "#22c55e",
                color: "white",
                padding: "12px 24px",
                borderRadius: "25px",
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              Read article
            </div>
          </div>

          {/* Decorative elements */}
          <div
            style={{
              position: "absolute",
              bottom: "40px",
              right: "40px",
              width: "100px",
              height: "100px",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              borderRadius: "50%",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "40px",
              right: "200px",
              width: "60px",
              height: "60px",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: "50%",
            }}
          />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    console.log(`${e.message}`);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
