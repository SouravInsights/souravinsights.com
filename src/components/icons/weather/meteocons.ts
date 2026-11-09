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

export const METEOCONS: Record<WeatherSlug, { animated: string; still: string }> = {
  "clear-day": { animated: clearDay.src, still: clearDayStill.src },
  "clear-night": { animated: clearNight.src, still: clearNightStill.src },
  "partly-cloudy-day": { animated: partlyCloudyDay.src, still: partlyCloudyDayStill.src },
  "partly-cloudy-night": { animated: partlyCloudyNight.src, still: partlyCloudyNightStill.src },
  "cloudy": { animated: cloudy.src, still: cloudyStill.src },
  "overcast": { animated: overcast.src, still: overcastStill.src },
  "haze": { animated: haze.src, still: hazeStill.src },
  "dust": { animated: dust.src, still: dustStill.src },
  "wind-dust": { animated: windDust.src, still: windDustStill.src },
  "mist": { animated: mist.src, still: mistStill.src },
  "smoke": { animated: smoke.src, still: smokeStill.src },
  "fog": { animated: fog.src, still: fogStill.src },
  "drizzle": { animated: drizzle.src, still: drizzleStill.src },
  "rain": { animated: rain.src, still: rainStill.src },
  "extreme-rain": { animated: extremeRain.src, still: extremeRainStill.src },
  "sleet": { animated: sleet.src, still: sleetStill.src },
  "extreme-sleet": { animated: extremeSleet.src, still: extremeSleetStill.src },
  "snow": { animated: snow.src, still: snowStill.src },
  "extreme-snow": { animated: extremeSnow.src, still: extremeSnowStill.src },
  "wind-snow": { animated: windSnow.src, still: windSnowStill.src },
  "hail": { animated: hail.src, still: hailStill.src },
  "extreme-hail": { animated: extremeHail.src, still: extremeHailStill.src },
  "thunderstorms-day": { animated: thunderstormsDay.src, still: thunderstormsDayStill.src },
  "thunderstorms-night": { animated: thunderstormsNight.src, still: thunderstormsNightStill.src },
  "thunderstorms-rain": { animated: thunderstormsRain.src, still: thunderstormsRainStill.src },
  "thunderstorms-snow": { animated: thunderstormsSnow.src, still: thunderstormsSnowStill.src },
};
