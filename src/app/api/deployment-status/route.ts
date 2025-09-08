import { NextResponse } from "next/server";

export const dynamic = "force-dynamic"; // Never cache this route
export const revalidate = 0;

export async function GET() {
  try {
    // Fetch the latest deployment from Vercel API
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;
    if (!vercelToken || !vercelProjectId) {
      throw new Error("Missing Vercel API configuration");
    }

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
      throw new Error("Failed to fetch deployment data from Vercel");
    }

    const deploymentJson = await deploymentRes.json();
    const latest = deploymentJson.deployments?.[0];

    // Prefer the "ready" timestamp (when it went live), then fallback
    const deployedAtMs =
      latest?.ready ?? latest?.readyAt ?? latest?.created ?? null;

    // Fetch weather data from WeatherAPI.com API (free tier)
    const weatherApiKey = process.env.WEATHERAPI_KEY;
    // Prefer lat,lon via WEATHER_Q; otherwise a city name via WEATHER_CITY
    const weatherQ = process.env.WEATHER_Q || process.env.WEATHER_CITY || "";

    let weatherInfo: null | {
      description: string;
      temperature: number;
      city: string;
    } = null;

    if (weatherApiKey && weatherQ) {
      const weatherResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${encodeURIComponent(
          weatherQ
        )}&aqi=no`,
        { cache: "no-store" }
      );
      if (weatherResponse.ok) {
        const weatherJson = await weatherResponse.json();
        weatherInfo = {
          description: weatherJson?.current?.condition?.text ?? "",
          temperature: Number(weatherJson?.current?.temp_c ?? 0),
          city: weatherJson?.location?.name ?? String(weatherQ),
        };
      }
    }

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
