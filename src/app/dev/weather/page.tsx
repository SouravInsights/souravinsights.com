import { notFound } from "next/navigation";
import { METEOCONS, WeatherIcon } from "@/components/icons/weather";
import {
  DeployStatusLine,
  type DeploymentInfo,
  type SongInfo,
} from "@/components/LastDeployedInfo";
import { WEATHER_SLUGS, weatherSlug } from "@/lib/weather";

/**
 * A dev-only contact sheet for the weather icons and the banner copy.
 *
 * Visit `/dev/weather` under `yarn dev`. It 404s in a production build, so it
 * never ships a page — but it lives in the repo as the place to eyeball a new
 * slug, a remapping, a copy change, or the reduced-motion twins without waiting
 * on the WeatherAPI response.
 */
const ALL_CODES = [
  1000, 1003, 1006, 1009, 1012, 1015, 1018, 1021, 1024, 1027, 1030, 1033, 1036,
  1039, 1042, 1045, 1048, 1063, 1066, 1069, 1072, 1087, 1114, 1117, 1135, 1147,
  1150, 1153, 1168, 1171, 1180, 1183, 1186, 1189, 1192, 1195, 1198, 1201, 1204,
  1207, 1210, 1213, 1216, 1219, 1222, 1225, 1237, 1240, 1243, 1246, 1249, 1252,
  1255, 1258, 1261, 1264, 1273, 1276, 1279, 1282,
];

const codesFor = (slug: (typeof WEATHER_SLUGS)[number], isDay: boolean) =>
  ALL_CODES.filter((code) => weatherSlug(code, isDay) === slug);

const DEPLOY: DeploymentInfo = {
  createdAt: "2025-03-03T16:32:00.000Z",
  url: "https://souravinsights.com",
};

const SONG: SongInfo = {
  name: "Everlong",
  url: "https://open.spotify.com/track/0",
  isPlaying: true,
};

/**
 * Real `condition.text` / `condition.code` pairs, chosen to hit every branch of
 * `weatherDescription`. Anything the copy does not recognise falls through to
 * the raw lowercased prose, which is the thing this sheet is here to catch.
 */
const CONDITIONS: { code: number; text: string; isDay?: boolean }[] = [
  { code: 1000, text: "Sunny" },
  { code: 1000, text: "Clear", isDay: false },
  { code: 1003, text: "Partly cloudy" },
  { code: 1006, text: "Cloudy" },
  { code: 1009, text: "Overcast" },
  { code: 1012, text: "Haze" },
  { code: 1030, text: "Mist" },
  { code: 1135, text: "Fog" },
  { code: 1147, text: "Freezing fog" },
  { code: 1033, text: "Smoke" },
  { code: 1039, text: "Smog" },
  { code: 1042, text: "Severe smog" },
  { code: 1048, text: "Dust" },
  { code: 1153, text: "Light drizzle" },
  { code: 1171, text: "Heavy freezing drizzle" },
  { code: 1237, text: "Ice pellets" },
  { code: 1183, text: "Light rain" },
  { code: 1189, text: "Moderate rain" },
  { code: 1195, text: "Heavy rain" },
  { code: 1246, text: "Torrential rain shower" },
  { code: 1087, text: "Thundery outbreaks possible" },
  { code: 1276, text: "Moderate or heavy rain with thunder" },
  { code: 1207, text: "Moderate or heavy sleet" },
  { code: 1219, text: "Moderate snow" },
  { code: 1225, text: "Heavy snow" },
  { code: 1117, text: "Blizzard" },
];

export default function WeatherPlayground() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="type-label">Weather — dev</h1>
      <p className="type-caption mt-2">
        The exact banner copy, then the icons: animated against the static twin,
        then at the banner&apos;s real 24px.
      </p>

      <h2 className="type-label mt-12">Banner copy</h2>
      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {CONDITIONS.map((condition) => (
          <li key={`${condition.code}-${condition.isDay ?? true}`} className="p-4">
            <div className="type-label text-faint-foreground">
              {condition.code} · {condition.text}
              {condition.isDay === false ? " · night" : ""}
            </div>
            <DeployStatusLine
              deploymentInfo={DEPLOY}
              songInfo={SONG}
              weatherInfo={{
                description: condition.text,
                temperature: 27,
                city: "Bengaluru",
                code: condition.code,
                isDay: condition.isDay ?? true,
              }}
            />
          </li>
        ))}
        <li className="p-4">
          <div className="type-label text-faint-foreground">
            weather only — no deploy, no song (the common case)
          </div>
          <DeployStatusLine
            deploymentInfo={null}
            songInfo={null}
            weatherInfo={{
              description: "Partly cloudy",
              temperature: 31,
              city: "Bengaluru",
              code: 1003,
              isDay: true,
            }}
          />
        </li>
        <li className="p-4">
          <div className="type-label text-faint-foreground">
            deploy + weather — nothing playing
          </div>
          <DeployStatusLine
            deploymentInfo={DEPLOY}
            songInfo={null}
            weatherInfo={{
              description: "Light rain",
              temperature: 24,
              city: "Bengaluru",
              code: 1183,
              isDay: false,
            }}
          />
        </li>
      </ul>

      <h2 className="type-label mt-12">Icons</h2>
      <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
        {WEATHER_SLUGS.map((slug) => {
          const day = codesFor(slug, true);
          const night = codesFor(slug, false);
          return (
            <li
              key={slug}
              className="flex items-center gap-5 rounded-lg border border-border p-4"
            >
              <div className="flex items-end gap-3">
                <WeatherIcon slug={slug} size={48} />
                {/* eslint-disable-next-line @next/next/no-img-element -- the
                    static twin, shown beside the animated one for comparison. */}
                <img
                  src={METEOCONS[slug].still}
                  alt=""
                  width={48}
                  height={48}
                  aria-hidden
                />
                <WeatherIcon slug={slug} size={24} />
              </div>
              <div className="min-w-0">
                <div className="type-label">{slug}</div>
                <div className="type-caption mt-1 tabular-nums">
                  {day.join(", ")}
                  {night.length > 0 && (
                    <span className="text-faint-foreground">
                      {" · night "}
                      {night.join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
