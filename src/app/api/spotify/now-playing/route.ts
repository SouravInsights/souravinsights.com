import { NextResponse } from "next/server";

async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Spotify credentials");
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
    throw new Error("Failed to refresh token");
  }

  const data = await response.json();
  return data.access_token;
}

export async function GET() {
  try {
    // Get a fresh token on each request
    const accessToken = await getSpotifyToken();

    // Use the fresh token to call Spotify API
    const spotifyResponse = await fetch(
      "https://api.spotify.com/v1/me/player/currently-playing",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // If status is 204, nothing is playing
    if (spotifyResponse.status === 204) {
      return NextResponse.json({ isPlaying: false });
    }

    if (!spotifyResponse.ok) {
      throw new Error(`Spotify API error: ${spotifyResponse.status}`);
    }

    const songData = await spotifyResponse.json();

    return NextResponse.json({
      isPlaying: songData.is_playing,
      songInfo: songData.item
        ? {
            name: songData.item.name,
            artist: songData.item.artists.map((a: any) => a.name).join(", "),
            url: songData.item.external_urls.spotify,
            albumArt: songData.item.album.images[0]?.url,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching Spotify data:", error);
    return NextResponse.json({ isPlaying: false, error: String(error) });
  }
}
