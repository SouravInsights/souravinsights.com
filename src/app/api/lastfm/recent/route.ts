import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type LastFmTrack = {
  name: string;
  url: string;
  artist: { "#text": string };
  "@attr"?: { nowplaying?: string };
};

/**
 * The most recent track, via Last.fm.
 *
 * Spotify's Web API is Premium-gated, so the scrobble feed is the source.
 * `getRecentTracks` returns the latest scrobble whether or not it is playing;
 * the `nowplaying` attribute is what says which. The banner always shows the
 * track, so a visitor who arrives between songs still sees the last one — and
 * the element is not wasted on the days nobody is listening.
 */
export async function GET() {
  const apiKey = process.env.LASTFM_API_KEY;
  const user = process.env.LASTFM_USERNAME;

  if (!apiKey || !user) {
    return NextResponse.json(
      { error: "Missing Last.fm configuration" },
      { status: 500 }
    );
  }

  const url = new URL("https://ws.audioscrobbler.com/2.0/");
  url.searchParams.set("method", "user.getRecentTracks");
  url.searchParams.set("user", user);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json(
      { error: `Last.fm error: ${response.status}` },
      { status: 502 }
    );
  }

  const data = await response.json();
  const raw = data?.recenttracks?.track;
  const track: LastFmTrack | undefined = Array.isArray(raw) ? raw[0] : raw;

  if (!track) {
    return NextResponse.json({ isPlaying: false, songInfo: null });
  }

  const artist = track.artist?.["#text"] ?? "";

  return NextResponse.json({
    isPlaying: track["@attr"]?.nowplaying === "true",
    songInfo: {
      name: track.name,
      artist,
      // Last.fm has no Spotify id, so the banner's Spotify icon points at a
      // search for the track instead.
      url: `https://open.spotify.com/search/${encodeURIComponent(
        `${artist} ${track.name}`.trim()
      )}`,
    },
  });
}
