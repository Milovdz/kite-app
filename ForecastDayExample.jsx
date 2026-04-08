import ForecastDay from "./ForecastDay";

/**
 * Example usage of the ForecastDay component.
 * Replace the sample data with your actual API data from
 * TimescaleDB / Supabase / KNMI EDR.
 */

const SAMPLE_SLOTS = [
  { hour: 6,  windKn: 21, gustKn: 28, dirDeg: 225, waveM: 0.9, tempC: 14,   rainMm: 0 },
  { hour: 9,  windKn: 21, gustKn: 27, dirDeg: 225, waveM: 1.1, tempC: 13.1, rainMm: 0 },
  { hour: 12, windKn: 23, gustKn: 27, dirDeg: 225, waveM: 1.2, tempC: 14.6, rainMm: 0.5 },
  { hour: 15, windKn: 22, gustKn: 29, dirDeg: 225, waveM: 1.1, tempC: 13.1, rainMm: 0 },
  { hour: 18, windKn: 20, gustKn: 28, dirDeg: 210, waveM: 1.0, tempC: 12.1, rainMm: 0 },
  { hour: 21, windKn: 19, gustKn: 25, dirDeg: 210, waveM: 0.8, tempC: 10.9, rainMm: 0.2 },
];

const SAMPLE_TIDES = [
  { time: "06:12", heightM: 0.3, type: "low" },
  { time: "12:28", heightM: 1.8, type: "high" },
  { time: "18:41", heightM: 0.4, type: "low" },
  { time: "00:52", heightM: 1.7, type: "high" },
];

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <ForecastDay
        date="2026-04-08"
        spotName="IJmuiden"
        slots={SAMPLE_SLOTS}
        tides={SAMPLE_TIDES}
        rideableMin={16}
        pumpingMin={22}
      />
    </div>
  );
}
