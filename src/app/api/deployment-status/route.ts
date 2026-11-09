import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Never cache this route
export const revalidate = 0;

type WeatherInfo = {
  description: string;
  temperature: number;
  city: string;
  code: number;
  isDay: boolean;
};

/** One hourly row from WeatherAPI's history response. */
type WeatherHour = {
  time_epoch: number;
  temp_c: number;
  is_day: number;
  condition: { text: string; code: number };
};

/**
 * Weather at the deploy timestamp.
 *
 * The banner reads "It was …", so it must show the sky when the site went
 * live, not today's. History is hourly and carries `time_epoch`, so the match
 * is a nearest-hour search; no timezone arithmetic.
 *
 * History is keyed on the location's local date while the deploy timestamp is
 * UTC, so the two can straddle midnight. When the nearest hour is more than
 * an hour out, the adjacent local day is fetched and matched.
 *
 * No deploy timestamp means there is no "then" to report, so current
 * conditions are used and the banner's "It is" branch applies.
 */
async function fetchWeatherAtDeploy(
  baseUrl: string,
  apiKey: string,
  query: string,
  deployedAtMs: number | null
): Promise<WeatherInfo | null> {
  const q = encodeURIComponent(query);

  const toInfo = (
    row: WeatherHour,
    location: { name?: string }
  ): WeatherInfo => ({
    description: row?.condition?.text ?? "",
    temperature: Number(row?.temp_c ?? 0),
    city: location?.name ?? String(query),
    // The code, not the prose: it is what the icon maps on. `is_day` picks
    // sun vs moon for the clear and thundery codes.
    code: Number(row?.condition?.code ?? 1006),
    isDay: Number(row?.is_day ?? 1) === 1,
  });

  if (deployedAtMs === null) {
    const response = await fetch(
      `${baseUrl}/current.json?key=${apiKey}&q=${q}&aqi=no`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const json = await response.json();
    return toInfo(json.current, json.location);
  }

  const deployEpoch = Math.floor(deployedAtMs / 1000);
  const utcDate = new Date(deployedAtMs).toISOString().slice(0, 10);

  const dayOn = async (date: string) => {
    const response = await fetch(
      `${baseUrl}/history.json?key=${apiKey}&q=${q}&dt=${date}`,
      { cache: "no-store" }
    );
    if (!response.ok) return null;
    const json = await response.json();
    const hours: WeatherHour[] =
      json?.forecast?.forecastday?.[0]?.hour ?? [];
    return hours.length ? { hours, location: json.location } : null;
  };

  const nearest = (hours: WeatherHour[]) =>
    hours.reduce((best, row) =>
      Math.abs(row.time_epoch - deployEpoch) <
      Math.abs(best.time_epoch - deployEpoch)
        ? row
        : best
    );

  let day = await dayOn(utcDate);
  if (!day) return null;
  let hour = nearest(day.hours);

  // More than an hour out means the deploy fell on the neighbouring local
  // date, so ask for that day and match against it.
  if (Math.abs(hour.time_epoch - deployEpoch) > 3600) {
    const after = deployEpoch > day.hours[day.hours.length - 1].time_epoch;
    const adjacent = new Date(
      Date.parse(`${utcDate}T00:00:00Z`) + (after ? 86_400_000 : -86_400_000)
    )
      .toISOString()
      .slice(0, 10);
    const next = await dayOn(adjacent);
    if (next) {
      day = next;
      hour = nearest(next.hours);
    }
  }

  return toInfo(hour, day.location);
}

export async function GET() {
  try {
    // Fetch the latest deployment from Vercel API
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    let latest = null;
    let deployedAtMs = null;

    try {
      if (!vercelToken || !vercelProjectId) {
        console.warn("Missing Vercel API configuration");
      } else {
        // the latest **production** deployment and disable fetch caching
        const params = new URLSearchParams({
          projectId: vercelProjectId,
          limit: "1",
          state: "READY",
          target: "production",
        });
        const deploymentRes = await fetch(
          `https://api.vercel.com/v6/deployments?${params.toString()}`,
          {
            headers: { Authorization: `Bearer ${vercelToken}` },
            cache: "no-store",
          }
        );

        if (!deploymentRes.ok) {
          const errorText = await deploymentRes.text();
          console.error(`Failed to fetch deployment data from Vercel: ${deploymentRes.status}`, errorText);
        } else {
          const deploymentJson = await deploymentRes.json();
          latest = deploymentJson.deployments?.[0];
          
          // Prefer the "ready" timestamp (when it went live), then fallback
          deployedAtMs = latest?.ready ?? latest?.readyAt ?? latest?.created ?? null;
        }
      }
    } catch (e) {
      console.error("Error fetching Vercel deployment:", e);
    }

    // Weather at the deploy, not the weather now. See fetchWeatherAtDeploy.
    const weatherApiKey = process.env.WEATHERAPI_KEY;
    // Prefer lat,lon via WEATHER_Q; otherwise a city name via WEATHER_CITY
    const weatherQ = process.env.WEATHER_Q || process.env.WEATHER_CITY || "";

    const weatherInfo: WeatherInfo | null =
      weatherApiKey && weatherQ
        ? await fetchWeatherAtDeploy(
            "https://api.weatherapi.com/v1",
            weatherApiKey,
            weatherQ,
            deployedAtMs
          )
        : null;

    // Build response
    const deploymentInfo = latest
      ? {
          createdAt: deployedAtMs ?? latest.created,
          url: latest.url,
        }
      : null;

    return new NextResponse(JSON.stringify({ deploymentInfo, weatherInfo }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    });
  } catch (error) {
    console.error("Error fetching status data:", error);
    return NextResponse.json(
      { error: "Failed to fetch status data" },
      { status: 500 }
    );
  }
}
