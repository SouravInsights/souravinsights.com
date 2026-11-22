import type { WeatherSlug } from "@/lib/weather";

/**
 * Every weather icon we can render, as two emitted URLs each: the animated
 * Meteocons SVG and its static twin (SMIL stripped) for reduced motion.
 *
 * The imports are explicit on purpose. A dynamic `import()` with a templated
 * slug makes webpack build a context over all 475 icons and bundle the lot.
 */
import clearDay from "@meteocons/svg/fill/clear-day.svg";
import clearDayStill from "@meteocons/svg-static/fill/clear-day.svg";
import clearNight from "@meteocons/svg/fill/clear-night.svg";
import clearNightStill from "@meteocons/svg-static/fill/clear-night.svg";
import partlyCloudyDay from "@meteocons/svg/fill/partly-cloudy-day.svg";
import partlyCloudyDayStill from "@meteocons/svg-static/fill/partly-cloudy-day.svg";
import partlyCloudyNight from "@meteocons/svg/fill/partly-cloudy-night.svg";
import partlyCloudyNightStill from "@meteocons/svg-static/fill/partly-cloudy-night.svg";
import cloudy from "@meteocons/svg/fill/cloudy.svg";
import cloudyStill from "@meteocons/svg-static/fill/cloudy.svg";
import overcast from "@meteocons/svg/fill/overcast.svg";
import overcastStill from "@meteocons/svg-static/fill/overcast.svg";
import haze from "@meteocons/svg/fill/haze.svg";
import hazeStill from "@meteocons/svg-static/fill/haze.svg";
import dust from "@meteocons/svg/fill/dust.svg";
import dustStill from "@meteocons/svg-static/fill/dust.svg";
import windDust from "@meteocons/svg/fill/wind-dust.svg";
import windDustStill from "@meteocons/svg-static/fill/wind-dust.svg";
import mist from "@meteocons/svg/fill/mist.svg";
import mistStill from "@meteocons/svg-static/fill/mist.svg";
import smoke from "@meteocons/svg/fill/smoke.svg";
import smokeStill from "@meteocons/svg-static/fill/smoke.svg";
import fog from "@meteocons/svg/fill/fog.svg";
import fogStill from "@meteocons/svg-static/fill/fog.svg";
import drizzle from "@meteocons/svg/fill/drizzle.svg";
import drizzleStill from "@meteocons/svg-static/fill/drizzle.svg";
import rain from "@meteocons/svg/fill/rain.svg";
import rainStill from "@meteocons/svg-static/fill/rain.svg";
import extremeRain from "@meteocons/svg/fill/extreme-rain.svg";
import extremeRainStill from "@meteocons/svg-static/fill/extreme-rain.svg";
import sleet from "@meteocons/svg/fill/sleet.svg";
import sleetStill from "@meteocons/svg-static/fill/sleet.svg";
import extremeSleet from "@meteocons/svg/fill/extreme-sleet.svg";
import extremeSleetStill from "@meteocons/svg-static/fill/extreme-sleet.svg";
import snow from "@meteocons/svg/fill/snow.svg";
import snowStill from "@meteocons/svg-static/fill/snow.svg";
import extremeSnow from "@meteocons/svg/fill/extreme-snow.svg";
import extremeSnowStill from "@meteocons/svg-static/fill/extreme-snow.svg";
import windSnow from "@meteocons/svg/fill/wind-snow.svg";
import windSnowStill from "@meteocons/svg-static/fill/wind-snow.svg";
import hail from "@meteocons/svg/fill/hail.svg";
import hailStill from "@meteocons/svg-static/fill/hail.svg";
import extremeHail from "@meteocons/svg/fill/extreme-hail.svg";
import extremeHailStill from "@meteocons/svg-static/fill/extreme-hail.svg";
import thunderstormsDay from "@meteocons/svg/fill/thunderstorms-day.svg";
import thunderstormsDayStill from "@meteocons/svg-static/fill/thunderstorms-day.svg";
import thunderstormsNight from "@meteocons/svg/fill/thunderstorms-night.svg";
import thunderstormsNightStill from "@meteocons/svg-static/fill/thunderstorms-night.svg";
import thunderstormsRain from "@meteocons/svg/fill/thunderstorms-rain.svg";
import thunderstormsRainStill from "@meteocons/svg-static/fill/thunderstorms-rain.svg";
import thunderstormsSnow from "@meteocons/svg/fill/thunderstorms-snow.svg";
import thunderstormsSnowStill from "@meteocons/svg-static/fill/thunderstorms-snow.svg";

/**
 * A static SVG import resolves to `{ src, height, width }` under webpack and to
 * the URL string itself under Turbopack (Next 16). Normalize both so the icon
 * renders under either bundler.
 */
const url = (icon: string | { src: string }): string =>
  typeof icon === "string" ? icon : icon.src;

export const METEOCONS: Record<WeatherSlug, { animated: string; still: string }> = {
  "clear-day": { animated: url(clearDay), still: url(clearDayStill) },
  "clear-night": { animated: url(clearNight), still: url(clearNightStill) },
  "partly-cloudy-day": { animated: url(partlyCloudyDay), still: url(partlyCloudyDayStill) },
  "partly-cloudy-night": { animated: url(partlyCloudyNight), still: url(partlyCloudyNightStill) },
  "cloudy": { animated: url(cloudy), still: url(cloudyStill) },
  "overcast": { animated: url(overcast), still: url(overcastStill) },
  "haze": { animated: url(haze), still: url(hazeStill) },
  "dust": { animated: url(dust), still: url(dustStill) },
  "wind-dust": { animated: url(windDust), still: url(windDustStill) },
  "mist": { animated: url(mist), still: url(mistStill) },
  "smoke": { animated: url(smoke), still: url(smokeStill) },
  "fog": { animated: url(fog), still: url(fogStill) },
  "drizzle": { animated: url(drizzle), still: url(drizzleStill) },
  "rain": { animated: url(rain), still: url(rainStill) },
  "extreme-rain": { animated: url(extremeRain), still: url(extremeRainStill) },
  "sleet": { animated: url(sleet), still: url(sleetStill) },
  "extreme-sleet": { animated: url(extremeSleet), still: url(extremeSleetStill) },
  "snow": { animated: url(snow), still: url(snowStill) },
  "extreme-snow": { animated: url(extremeSnow), still: url(extremeSnowStill) },
  "wind-snow": { animated: url(windSnow), still: url(windSnowStill) },
  "hail": { animated: url(hail), still: url(hailStill) },
  "extreme-hail": { animated: url(extremeHail), still: url(extremeHailStill) },
  "thunderstorms-day": { animated: url(thunderstormsDay), still: url(thunderstormsDayStill) },
  "thunderstorms-night": { animated: url(thunderstormsNight), still: url(thunderstormsNightStill) },
  "thunderstorms-rain": { animated: url(thunderstormsRain), still: url(thunderstormsRainStill) },
  "thunderstorms-snow": { animated: url(thunderstormsSnow), still: url(thunderstormsSnowStill) },
};
