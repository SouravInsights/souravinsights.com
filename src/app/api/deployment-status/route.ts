import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch the latest deployment from Vercel API
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !vercelProjectId) {
      throw new Error("Missing Vercel API configuration");
    }

    const deploymentResponse = await fetch(
      `https://api.vercel.com/v6/deployments?&projectId=${vercelProjectId}&limit=1&state=READY`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
        },
      }
    );

    if (!deploymentResponse.ok) {
      throw new Error("Failed to fetch deployment data from Vercel");
    }

    const deploymentData = await deploymentResponse.json();
    const latestDeployment = deploymentData.deployments[0];

    // Fetch weather data from WeatherAPI.com API (free tier)
    const weatherApiKey = process.env.WEATHERAPI_KEY;
    const city = process.env.WEATHER_CITY || "Cuttack";
    let weatherData = null;

    if (weatherApiKey) {
      const weatherResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${weatherApiKey}&q=${city}&aqi=no`
      );

      if (weatherResponse.ok) {
        const weatherJson = await weatherResponse.json();
        weatherData = {
          description: weatherJson.current.condition.text,
          temperature: weatherJson.current.temp_c,
          city: weatherJson.location.name,
        };
      }
    }

    return NextResponse.json({
      deploymentInfo: latestDeployment
        ? {
            createdAt: latestDeployment.created,
            url: latestDeployment.url,
          }
        : null,
      weatherInfo: weatherData,
    });
  } catch (error) {
    console.error("Error fetching status data:", error);
    return NextResponse.json(
      { error: "Failed to fetch status data" },
      { status: 500 }
    );
  }
}
