// src/app/api/newsletter/draft/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { curatedLinks } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get("Authorization");
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { linkIds, emailSubject } = await request.json();

    if (!linkIds || !Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json({ error: "Link IDs required" }, { status: 400 });
    }

    if (!emailSubject) {
      return NextResponse.json(
        { error: "Email subject required" },
        { status: 400 }
      );
    }

    // Get the selected links
    const selectedLinks = await db
      .select()
      .from(curatedLinks)
      .where(inArray(curatedLinks.id, linkIds));

    if (selectedLinks.length === 0) {
      return NextResponse.json(
        { error: "No links found with provided IDs" },
        { status: 404 }
      );
    }

    // Group links by category
    const linksByCategory: Record<string, typeof selectedLinks> = {};

    selectedLinks.forEach((link) => {
      if (!linksByCategory[link.category]) {
        linksByCategory[link.category] = [];
      }
      linksByCategory[link.category].push(link);
    });

    // Generate Markdown content
    let emailBody = `# Curated Links\n\nHere are some resources I thought you might find interesting:\n\n`;

    // Add links by category
    for (const [category, links] of Object.entries(linksByCategory)) {
      // Format category name nicely
      const formattedCategory = category
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      emailBody += `## ${formattedCategory}\n\n`;

      for (const link of links) {
        // Title with link
        emailBody += `- **[${link.title}](${link.url})**\n`;

        // Notes if available
        if (link.notes) {
          emailBody += `  ${link.notes}\n`;
        }

        // Twitter handle if available
        if (link.creatorTwitter) {
          emailBody += `  By [@${link.creatorTwitter}](https://twitter.com/${link.creatorTwitter})\n`;
        }

        // Add extra space between items
        emailBody += `\n`;
      }
    }

    // Add footer
    emailBody += `---\n\nWant to share interesting resources you've found? Reply to this email!\n`;

    // Create draft in ButtonDown
    const buttondownResponse = await fetch(
      "https://api.buttondown.com/v1/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${process.env.BUTTONDOWN_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: emailSubject,
          body: emailBody,
          status: "draft",
        }),
      }
    );

    if (!buttondownResponse.ok) {
      const errorData = await buttondownResponse.json();
      console.error("ButtonDown API error:", errorData);
      throw new Error(
        `Failed to create ButtonDown draft: ${JSON.stringify(errorData)}`
      );
    }

    const buttondownData = await buttondownResponse.json();
    const emailId = buttondownData.id;

    // Update links with email ID
    for (const linkId of linkIds) {
      await db
        .update(curatedLinks)
        .set({
          newsletterStatus: "scheduled",
          buttondownEmailId: emailId,
          updatedAt: new Date(),
        })
        .where(eq(curatedLinks.id, linkId));
    }

    return NextResponse.json({
      success: true,
      emailId,
      message: "Newsletter draft created in ButtonDown",
    });
  } catch (error) {
    console.error("Error creating newsletter draft:", error);
    return NextResponse.json(
      { error: "Failed to create newsletter draft" },
      { status: 500 }
    );
  }
}
