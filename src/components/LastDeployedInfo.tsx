"use client";

import { useEffect, useState } from "react";
import type { SVGProps } from "react";
import { format } from "date-fns";
import { RocketLaunch } from "@phosphor-icons/react";
import { WeatherIcon } from "@/components/icons/weather";
import { weatherDescription, weatherSlug } from "@/lib/weather";

export interface DeploymentInfo {
  createdAt: string;
  url: string;
}

export interface SongInfo {
  name: string;
  url: string;
}

export interface WeatherInfo {
  /** WeatherAPI's own prose. Kept in the payload, but the copy is drawn from
      `code` so the words and the icon can never disagree. */
  description: string;
  temperature: number;
  city: string;
  code: number;
  isDay: boolean;
}

const Spotify = (props: SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 256 256"
    width="1em"
    height="1em"
    xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid"
    {...props}
  >
    <path
      d="M128 0C57.308 0 0 57.309 0 128c0 70.696 57.309 128 128 128 70.697 0 128-57.304 128-128C256 57.314 198.697.007 127.998.007l.001-.006Zm58.699 184.614c-2.293 3.76-7.215 4.952-10.975 2.644-30.053-18.357-67.885-22.515-112.44-12.335a7.981 7.981 0 0 1-9.552-6.007 7.968 7.968 0 0 1 6-9.553c48.76-11.14 90.583-6.344 124.323 14.276 3.76 2.308 4.952 7.215 2.644 10.975Zm15.667-34.853c-2.89 4.695-9.034 6.178-13.726 3.289-34.406-21.148-86.853-27.273-127.548-14.92-5.278 1.594-10.852-1.38-12.454-6.649-1.59-5.278 1.386-10.842 6.655-12.446 46.485-14.106 104.275-7.273 143.787 17.007 4.692 2.89 6.175 9.034 3.286 13.72v-.001Zm1.345-36.293C162.457 88.964 94.394 86.71 55.007 98.666c-6.325 1.918-13.014-1.653-14.93-7.978-1.917-6.328 1.65-13.012 7.98-14.935C93.27 62.027 168.434 64.68 215.929 92.876c5.702 3.376 7.566 10.724 4.188 16.405-3.362 5.69-10.73 7.565-16.4 4.187h-.006Z"
      fill="#1ED760"
    />
  </svg>
);

/**
 * The sentence itself, with no data of its own. Split out of the fetching
 * component so the exact copy is renderable from fixtures — see the dev sheet
 * at `/dev/weather`.
 */
export function DeployStatusLine({
  deploymentInfo,
  songInfo,
  weatherInfo,
}: {
  deploymentInfo: DeploymentInfo | null;
  songInfo: SongInfo | null;
  weatherInfo: WeatherInfo | null;
}) {
  if (!deploymentInfo && !weatherInfo && !songInfo) return null;

  const formattedDate = deploymentInfo
    ? format(new Date(deploymentInfo.createdAt), "MMMM d, yyyy")
    : null;
  const formattedTime = deploymentInfo
    ? format(new Date(deploymentInfo.createdAt), "h:mm a")
    : null;

  return (
    <div className="type-caption mt-4">
      <div className="rule mb-4" aria-hidden="true" />
      {/**
       * Inline flow, not a flex row. `align-middle` seats both marks on the
       * text's optical centre, which is steadier than nudging a flex child with
       * margins, and it lets the line wrap the whole width instead of hanging
       * off a fixed indent.
       *
       * The block stays a 13px caption under the prose, so it never competes
       * with the argument above it. The marks are sized for legibility, not
       * prominence: the rocket is 16px, the weather illustration 32px.
       * Meteocons pad their 128 viewBox, so a 32px box draws a ~20px cloud —
       * big enough that the SMIL animation is readable in passing, which the
       * old 24px (~15px cloud) was not. Italic is gone for the same reason:
       * 13px italic muted is the least legible text on the page.
       */}
      <p>
        <RocketLaunch
          aria-hidden="true"
          className="mr-1.5 inline-block h-4 w-4 align-middle"
        />
        {deploymentInfo && (
          <>
            This site was last deployed on {formattedDate} at {formattedTime}
          </>
        )}
        {songInfo && (
          <>
            {deploymentInfo ? " while listening to " : "Currently listening to "}
            <a
              href={songInfo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-700 dark:text-green-500 hover:underline font-medium inline-flex items-baseline"
            >
              <Spotify fontSize={18} className="mx-1" />
              {songInfo.name}
            </a>
          </>
        )}
        {weatherInfo && (
          <>
            {deploymentInfo || songInfo ? ". " : ""}
            {deploymentInfo ? "It was " : "It is "}
            {weatherDescription(weatherInfo.code, weatherInfo.isDay)}
            <WeatherIcon
              slug={weatherSlug(weatherInfo.code, weatherInfo.isDay)}
              size={32}
              className="ml-1 inline-block align-middle"
            />
            {" at "}
            <span className="font-medium">
              {Math.round(weatherInfo.temperature)}°C
            </span>
            {" in "}
            <span className="font-medium">{weatherInfo.city}</span>
            {"."}
          </>
        )}
      </p>
    </div>
  );
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
            setSongInfo({
              name: data.songInfo.name,
              url: data.songInfo.url,
            });
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
      <div className="type-caption mt-4 animate-pulse">
        Loading latest site info...
      </div>
    );
  }

  return (
    <DeployStatusLine
      deploymentInfo={deploymentInfo}
      songInfo={songInfo}
      weatherInfo={weatherInfo}
    />
  );
}
