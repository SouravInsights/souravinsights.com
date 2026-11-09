/**
 * WeatherAPI.com condition code → Meteocons slug.
 *
 * The numeric code is the only stable signal. `condition.text` is prose that
 * WeatherAPI reworded over time, and substring matching on it put drizzle on a
 * fog icon; a code is a fixed meaning. Every one of the 60 documented codes is
 * mapped, including the day/night split (`current.is_day`) where Meteocons
 * draws a sun or a moon.
 *
 * Intensity is coarse on purpose: light/moderate/heavy rain and their showers
 * collapse onto `rain` / `extreme-rain`. The banner is one 16px glyph — fourteen
 * near-identical rain drawings would be noise, not detail.
 *
 * `@meteocons/svg` renders one file per slug, so this must stay in sync with
 * the slugs imported in `@/components/icons/weather/meteocons`.
 */
export const WEATHER_SLUGS = [
  "clear-day",
  "clear-night",
  "partly-cloudy-day",
  "partly-cloudy-night",
  "cloudy",
  "overcast",
  "haze",
  "dust",
  "wind-dust",
  "mist",
  "smoke",
  "fog",
  "drizzle",
  "rain",
  "extreme-rain",
  "sleet",
  "extreme-sleet",
  "snow",
  "extreme-snow",
  "wind-snow",
  "hail",
  "extreme-hail",
  "thunderstorms-day",
  "thunderstorms-night",
  "thunderstorms-rain",
  "thunderstorms-snow",
] as const;

export type WeatherSlug = (typeof WEATHER_SLUGS)[number];

export function weatherSlug(code: number, isDay: boolean): WeatherSlug {
  switch (code) {
    // Clear / partly cloudy — the only codes that depend on the sun.
    case 1000:
      return isDay ? "clear-day" : "clear-night";
    case 1003:
      return isDay ? "partly-cloudy-day" : "partly-cloudy-night";
    // Cloud
    case 1006:
      return "cloudy";
    case 1009:
      return "overcast";
    // Haze / smoke / smog
    case 1012:
    case 1036:
    case 1039:
      return "haze";
    // Dust — calm, then wind-borne
    case 1015:
    case 1045:
    case 1048:
      return "dust";
    case 1018:
    case 1021:
    case 1024:
    case 1027:
      return "wind-dust";
    case 1033:
      return "smoke";
    // Mist / fog / freezing fog / severe smog
    case 1030:
      return "mist";
    case 1042:
    case 1135:
    case 1147:
      return "fog";
    // Drizzle, incl. freezing drizzle
    case 1072:
    case 1150:
    case 1153:
      return "drizzle";
    case 1168:
    case 1198:
      return "sleet";
    case 1171:
    case 1201:
      return "extreme-sleet";
    // Rain, incl. showers
    case 1063:
    case 1180:
    case 1183:
    case 1186:
    case 1189:
    case 1240:
      return "rain";
    case 1192:
    case 1195:
    case 1243:
    case 1246:
      return "extreme-rain";
    // Sleet / ice pellets
    case 1069:
    case 1204:
    case 1237:
    case 1249:
      return "sleet";
    case 1207:
    case 1252:
      return "extreme-sleet";
    // Snow, incl. showers
    case 1066:
    case 1210:
    case 1213:
    case 1216:
    case 1219:
    case 1255:
      return "snow";
    case 1222:
    case 1225:
    case 1258:
      return "extreme-snow";
    // Blowing snow / blizzard
    case 1114:
    case 1117:
      return "wind-snow";
    // Ice-pellet showers
    case 1261:
      return "hail";
    case 1264:
      return "extreme-hail";
    // Thundery outbreaks possible
    case 1087:
      return isDay ? "thunderstorms-day" : "thunderstorms-night";
    // Rain with thunder
    case 1273:
    case 1276:
      return "thunderstorms-rain";
    // Snow with thunder
    case 1279:
    case 1282:
      return "thunderstorms-snow";
    default:
      return "cloudy";
  }
}
