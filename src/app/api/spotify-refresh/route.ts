import { NextResponse } from "next/server";

export async function GET() {
  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing Spotify API configuration");
    }

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
      "base64"
    );

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Spotify token");
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      expiresIn: data.expires_in,
    });
  } catch (error) {
    console.error("Error refreshing Spotify token:", error);
    return NextResponse.json(
      { error: "Failed to refresh Spotify token" },
      { status: 500 }
    );
  }
}
