import SpotOverview from "./SpotOverview";

/**
 * Example usage of the SpotOverview component.
 * Replace sample data with your Supabase / KNMI forecast data.
 *
 * Each spot has 7 days, each day has:
 *   - date: ISO date string
 *   - hours: array of 6 wind values [06, 09, 12, 15, 18, 21] in knots
 *   - dir: (optional) dominant wind direction string for the session pill
 */

const SAMPLE_SPOTS = [
  {
    name: "IJmuiden",
    days: [
      { date: "2026-04-10", hours: [10, 15, 23, 22, 20, 18], dir: "SW" },
      { date: "2026-04-11", hours: [9, 13, 18, 19, 16, 12], dir: "SW" },
      { date: "2026-04-12", hours: [7, 9, 14, 17, 15, 10], dir: "W" },
      { date: "2026-04-13", hours: [7, 7, 9, 9, 7, 6], dir: "N" },
      { date: "2026-04-14", hours: [6, 8, 12, 14, 12, 8], dir: "NW" },
      { date: "2026-04-15", hours: [7, 9, 11, 12, 9, 7], dir: "W" },
      { date: "2026-04-16", hours: [12, 17, 22, 24, 20, 17], dir: "NW" },
    ],
  },
  {
    name: "Wijk aan Zee",
    days: [
      { date: "2026-04-10", hours: [9, 14, 18, 19, 17, 15], dir: "SW" },
      { date: "2026-04-11", hours: [8, 12, 17, 18, 15, 11], dir: "SW" },
      { date: "2026-04-12", hours: [6, 8, 12, 14, 12, 8], dir: "W" },
      { date: "2026-04-13", hours: [6, 6, 8, 8, 6, 5], dir: "N" },
      { date: "2026-04-14", hours: [5, 7, 11, 13, 11, 7], dir: "NW" },
      { date: "2026-04-15", hours: [6, 8, 10, 11, 8, 6], dir: "W" },
      { date: "2026-04-16", hours: [10, 15, 20, 22, 18, 15], dir: "NW" },
    ],
  },
  {
    name: "Schellinkhout",
    days: [
      { date: "2026-04-10", hours: [7, 9, 14, 15, 13, 9], dir: "SW" },
      { date: "2026-04-11", hours: [5, 7, 12, 13, 11, 8], dir: "SW" },
      { date: "2026-04-12", hours: [8, 12, 17, 18, 14, 9], dir: "W" },
      { date: "2026-04-13", hours: [5, 6, 8, 7, 6, 5], dir: "N" },
      { date: "2026-04-14", hours: [5, 6, 8, 9, 8, 5], dir: "NW" },
      { date: "2026-04-15", hours: [5, 7, 9, 10, 7, 5], dir: "W" },
      { date: "2026-04-16", hours: [10, 14, 18, 20, 17, 13], dir: "NW" },
    ],
  },
  {
    name: "Kijkduin",
    days: [
      { date: "2026-04-10", hours: [14, 20, 24, 25, 21, 18], dir: "SW" },
      { date: "2026-04-11", hours: [12, 17, 22, 21, 17, 12], dir: "SW" },
      { date: "2026-04-12", hours: [9, 13, 18, 20, 15, 10], dir: "W" },
      { date: "2026-04-13", hours: [8, 9, 12, 12, 9, 7], dir: "N" },
      { date: "2026-04-14", hours: [6, 8, 13, 15, 12, 7], dir: "NW" },
      { date: "2026-04-15", hours: [7, 9, 13, 14, 11, 8], dir: "W" },
      { date: "2026-04-16", hours: [11, 17, 22, 25, 21, 16], dir: "NW" },
    ],
  },
];

export default function App() {
  return (
    <div style={{ padding: 16 }}>
      <SpotOverview
        spots={SAMPLE_SPOTS}
        threshold={17}
        yMax={35}
      />
    </div>
  );
}
