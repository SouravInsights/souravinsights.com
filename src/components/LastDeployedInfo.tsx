"use client";

import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Calendar,
  Headphones,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudDrizzle,
  Cloud,
  Sun,
} from "lucide-react";

interface DeploymentInfo {
  createdAt: string;
  url: string;
}

interface SongInfo {
  name: string;
  artist: string;
  url: string;
}

interface WeatherInfo {
  description: string;
  temperature: number;
  city: string;
}

export default function DeploymentStatus() {
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(
    null
  );
  const [songInfo, setSongInfo] = useState<SongInfo | null>(null);
  const [weatherInfo, setWeatherInfo] = useState<WeatherInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch deployment status
        const deploymentResponse = await fetch("/api/deployment-status");
        if (deploymentResponse.ok) {
          const data = await deploymentResponse.json();
          setDeploymentInfo(data.deploymentInfo);
          setWeatherInfo(data.weatherInfo);
        }

        // Fetch Spotify separately
        const spotifyResponse = await fetch("/api/spotify/now-playing");
        if (spotifyResponse.ok) {
          const data = await spotifyResponse.json();
          if (data.isPlaying && data.songInfo) {
            setSongInfo(data.songInfo);
          }
        }
      } catch (err) {
        console.error("Error fetching status data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-4 animate-pulse">
        Loading latest site info...
      </div>
    );
  }

  if (!deploymentInfo) {
    return null; // Don't show anything if there's no deployment info
  }

  // Format the deployment date
  const formattedDate = format(
    new Date(deploymentInfo.createdAt),
    "MMMM d, yyyy"
  );
  const formattedTime = format(new Date(deploymentInfo.createdAt), "h:mm a");

  // Get the appropriate weather icon based on the description
  const getWeatherIcon = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("rain") || desc.includes("shower"))
      return (
        <CloudRain size={16} className="inline-block ml-1 text-blue-500" />
      );
    if (desc.includes("snow"))
      return (
        <CloudSnow size={16} className="inline-block ml-1 text-blue-200" />
      );
    if (desc.includes("thunder") || desc.includes("lightning"))
      return (
        <CloudLightning
          size={16}
          className="inline-block ml-1 text-yellow-500"
        />
      );
    if (desc.includes("drizzl"))
      return (
        <CloudDrizzle size={16} className="inline-block ml-1 text-blue-400" />
      );
    if (desc.includes("cloud") || desc.includes("overcast"))
      return <Cloud size={16} className="inline-block ml-1 text-gray-400" />;
    if (desc.includes("mist") || desc.includes("fog"))
      return <Cloud size={16} className="inline-block ml-1 text-gray-300" />;
    if (desc.includes("clear") || desc.includes("sunny"))
      return <Sun size={16} className="inline-block ml-1 text-yellow-500" />;
    return <Cloud size={16} className="inline-block ml-1 text-gray-400" />;
  };

  // Get a more relatable weather description
  const getWeatherDescription = (description: string) => {
    const desc = description.toLowerCase();
    if (desc.includes("mist") || desc.includes("fog")) return "foggy";
    if (desc.includes("rain") && desc.includes("heavy")) return "pouring";
    if (desc.includes("rain")) return "rainy";
    if (desc.includes("drizzl")) return "drizzling";
    if (desc.includes("snow")) return "snowing";
    if (desc.includes("thunder")) return "stormy";
    if (desc.includes("cloud") || desc.includes("overcast")) return "cloudy";
    if (desc.includes("clear") || desc.includes("sunny")) return "sunny";
    return description.toLowerCase();
  };

  return (
    <div className="text-sm text-gray-600 dark:text-gray-300 mt-4 leading-relaxed italic border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-start">
        <Calendar className="w-4 h-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0 mr-2" />
        <span>
          This site was last deployed on {formattedDate} at {formattedTime}
          {songInfo && (
            <span>
              {" while listening to "}
              <a
                href={songInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 dark:text-green-400 hover:underline font-medium"
              >
                {songInfo.name}
              </a>{" "}
              <span className="whitespace-nowrap">
                by {songInfo.artist}{" "}
                <Headphones size={14} className="inline-block -mt-0.5" />
              </span>
            </span>
          )}
          {weatherInfo && (
            <span>
              {songInfo ? "." : ","} The weather was{" "}
              {getWeatherDescription(weatherInfo.description)}
              {getWeatherIcon(weatherInfo.description)}
              {" at "}
              <span className="font-medium">
                {Math.round(weatherInfo.temperature)}°C
              </span>
              {" in "}
              <span className="font-medium">{weatherInfo.city}</span>
              {"."}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
