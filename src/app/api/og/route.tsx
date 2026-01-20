import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    // Get all parameters with safe defaults
    const title = searchParams.get("title")?.slice(0, 100) || "Blog Post";
    const excerpt = searchParams.get("excerpt")?.slice(0, 150) || "Interactive tutorials, stories, deep dives on startups, movies, human behavior, and whatever random thing I get curious about at 2 AM 🦉";
    const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
    const readingTime = searchParams.get("readingTime") || "5 min read";
    const isDraft = searchParams.get("draft") === "true";
    const tags = searchParams.get("tags")?.split(",").slice(0, 3) || [];

    // Format date nicely
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
            justifyContent: "space-between",
            padding: "80px",
            backgroundColor: "#ffffff",
          }}
        >
          {/* Top Bar: Brand & Tags */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ fontSize: 32 }}>🦉</div>
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#374151" }}>Notes & Essays</div>
            </div>
            
            {tags.length > 0 && (
              <div style={{ display: "flex", gap: "12px" }}>
                {tags.map((tag, i) => (
                  <div key={i} style={{ 
                    padding: "8px 16px", 
                    backgroundColor: "#dcfce7", 
                    color: "#166534", 
                    borderRadius: "20px",
                    fontSize: 18 
                  }}>
                    {tag}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Center: Title & Excerpt */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "20px" }}>
             {isDraft && (
              <div style={{ 
                padding: "8px 20px", 
                backgroundColor: "#fffbeb", 
                color: "#b45309", 
                borderRadius: "20px", 
                border: "2px solid #fcd34d",
                fontSize: 16,
                marginBottom: 10
              }}>
                ⚠️ DRAFT
              </div>
            )}
            
            <div style={{ fontSize: 64, fontWeight: "900", color: "#111827", lineHeight: 1.1 }}>
              {title}
            </div>
            
            <div style={{ fontSize: 30, color: "#6b7280", lineHeight: 1.4, maxWidth: "80%" }}>
              {excerpt}
            </div>
          </div>

          {/* Bottom: Meta Info */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", color: "#9ca3af", fontSize: 20 }}>
            <div>{formattedDate}</div>
            <div>•</div>
            <div>{readingTime}</div>
          </div>
          
          {/* Simple Green Brand Bar at Bottom */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "12px", backgroundColor: "#22c55e" }} />
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: any) {
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
