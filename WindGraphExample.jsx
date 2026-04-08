import WindGraph from "./WindGraph";

/**
 * Example usage of the WindGraph component.
 * Replace sample data with your actual KNMI / TimescaleDB / Supabase data.
 *
 * - forecastWind/forecastGust: 24 hourly values (index 0 = 00:00)
 * - actualWind/actualGust: same shape, null for hours not yet measured
 * - nowIndex: current hour (drives the "Now" dashed line)
 */

const SAMPLE_FORECAST_WIND = [
  8, 9, 7, 6, 6, 9, 11, 14, 17, 20, 23, 26, 28, 29, 28, 26, 24, 22, 19, 16,
  14, 12, 11, 10,
];

const SAMPLE_FORECAST_GUST = [
  12, 13, 10, 9, 10, 13, 16, 19, 23, 27, 30, 33, 35, 35, 34, 32, 30, 28, 25,
  22, 19, 17, 15, 13,
];

const SAMPLE_ACTUAL_WIND = [
  8, 8, 7, 5, 6, 10, 12, 15, 18, 22, 25, 28, 30, 29, 27, 25, 24, 21, null,
  null, null, null, null, null,
];

const SAMPLE_ACTUAL_GUST = [
  11, 11, 10, 8, 9, 14, 16, 20, 24, 28, 31, 34, 36, 35, 33, 31, 29, 27, null,
  null, null, null, null, null,
];

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <WindGraph
        spotName="IJmuiden"
        currentWind={24}
        currentGust={31}
        currentDirDeg={225}
        threshold={17}
        yMax={40}
        forecastWind={SAMPLE_FORECAST_WIND}
        forecastGust={SAMPLE_FORECAST_GUST}
        actualWind={SAMPLE_ACTUAL_WIND}
        actualGust={SAMPLE_ACTUAL_GUST}
        nowIndex={17}
      />
    </div>
  );
}
