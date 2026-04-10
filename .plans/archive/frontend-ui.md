# Build the Kite Wind Forecast App — Frontend UI

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

The approved design spec lives at `docs/superpowers/specs/2026-04-08-frontend-ui-design.md` from the repository root. All design decisions referenced below originate from that document.


## Purpose / Big Picture

After this plan is complete, opening a browser at `http://localhost:5173` will show a working kitesurf wind forecast app for IJmuiden. Two tabs — **Today** and **7 Days** — switch between a 24-hour wind graph and a 7-day forecast table. The Today graph shows both observed (actual) wind lines for past hours and forecast shaded areas for future hours, divided by a vertical "now" marker. The table shows 8 rows of data (wind speed, gusts, direction, wave height, wave period, tide placeholder, temperature, precipitation) across 3-hour time slots, with cells colour-coded by wind strength. Both views use a dark theme with a consistent wind-strength colour scale.

This is a purely frontend milestone. All data is served from static mock JSON files that mirror the shape the real API will eventually provide. Observed wind values are mocked (non-null for hours 0 up to the current hour). No backend, no live HTTP calls, no authentication.


## Progress

- [x] Milestone 1: Scaffold the React + Vite + TypeScript project
- [x] Milestone 2: Implement design tokens, global styles, and wind strength colour utility
- [x] Milestone 3: Build the top navigation bar with Today / 7 Days tabs
- [x] Milestone 4: Build the Today view — spot header and 24h wind graph
- [x] Milestone 5: Build the 7-Day table view — scrollable table with all 8 rows
- [x] Milestone 6: Wire mock data through the component tree and verify full render


## Surprises & Discoveries

(None yet — update as work proceeds.)


## Decision Log

- Decision: Use React + Vite + TypeScript as the frontend stack.
  Rationale: React is widely understood, Vite provides instant dev server startup with HMR, TypeScript prevents common runtime bugs in data-heavy UIs. The project has no existing frontend so there is no migration cost. Alternatives considered: plain HTML/JS (too verbose for component reuse across spots), Vue (equivalent capability but less community tooling for charting).
  Date/Author: 2026-04-08 / brainstorming session

- Decision: Use Recharts for the Today graph.
  Rationale: Recharts is a React-native charting library built on D3. It supports area charts, reference lines, and custom SVG overlays natively — exactly what the Today graph needs (shaded forecast areas, "now" dashed line, background wind-strength bands). It is composable via JSX, which makes the component easy to read and extend. Alternatives considered: Chart.js (imperative API, harder to compose with React state), Visx (more powerful but much higher complexity for this use case), plain D3 (full control but significant boilerplate).
  Date/Author: 2026-04-08 / brainstorming session

- Decision: Mock data via static JSON files in `src/data/`.
  Rationale: Keeps the frontend completely decoupled from backend concerns. The JSON shape is defined here and will serve as the contract for the real API later.
  Date/Author: 2026-04-08 / brainstorming session

- Decision: Observed (actual) wind data is included in this plan as mock values.
  Rationale: The user wants to see the full Today graph — forecast areas plus actual wind lines — from the start. The real-time observation source is TBD for the backend, but the frontend should render both series fully. The mock `today.json` will populate `actualSpeed` and `actualGusts` with plausible non-null values for hours 0 through the current hour, and null for future hours. The graph component conditionally renders the actual lines only for entries where actual values are non-null.
  Date/Author: 2026-04-08 / user request during plan review


## Outcomes & Retrospective

(Fill in at completion.)


## Context and Orientation

The project root is `/Users/milovanderzanden/Desktop/Kite app 2.0/`. It currently contains only a Python `.venv` (used by the existing wind-fetch script at `.claude/skills/fetch-wind-data/scripts/fetch_wind.py`) and a `docs/` folder. There is no existing frontend code.

After this plan, the frontend will live in a new `frontend/` subdirectory at the project root. All `npm` and `npx` commands below must be run from inside `frontend/`.

Key terms used in this plan:

- **Knots (kn):** unit of wind speed. 1 knot ≈ 1.852 km/h. All wind values in this app are in knots.
- **Forecast data:** predicted future wind values from the Open-Meteo API.
- **Actual data:** observed (measured) wind values from a real-time station. Out of scope for this plan; the data shape includes it as an empty array.
- **Wind strength colour scale:** the mapping from wind speed to colour used throughout the app: <15 kn = grey, 16–20 = yellow, 21–25 = orange, 26–32 = red, 32+ = purple. Within each band the colour darkens proportionally with speed.
- **HMR:** Hot Module Replacement — Vite's ability to update the browser instantly when a source file changes, without a full page reload.
- **Recharts:** a React charting library. Each chart element (area, line, axis, reference line) is a React component placed inside a `<ComposedChart>` parent.


## Plan of Work

The work is divided into six milestones. Each milestone ends in a verifiable browser state.

**Milestone 1 — Scaffold** creates the Vite project with React and TypeScript, installs dependencies (Recharts, a CSS reset), and confirms the dev server starts.

**Milestone 2 — Tokens and colour utility** establishes the dark-theme CSS custom properties and a `windColour(knots: number): string` function that maps a wind speed to its hex colour. This function is used everywhere cells and graph bands are coloured. Getting this right early means every subsequent milestone can rely on it.

**Milestone 3 — Navigation bar** produces the fixed top bar with the app name, IJmuiden spot label, and two tab buttons. Clicking a tab sets a React state value (`'today' | 'week'`) that controls which view is rendered. No routing library is needed — a single state variable is sufficient for two views.

**Milestone 4 — Today view** builds the spot header (spot name, current speed badge) and the 24h ComposedChart. The chart has: two `<Area>` series (forecast wind, forecast gusts), two `<Line>` series (actual wind, actual gusts — rendered only when data is non-empty), a vertical `<ReferenceLine>` for "now", and a set of `<ReferenceArea>` rectangles spanning y-axis bands for the wind strength zones. The x-axis shows 0–23 with labels every 3 hours.

**Milestone 5 — 7-Day table** builds the horizontally scrollable table component. The left column of row labels is `position: sticky; left: 0` to stay fixed during horizontal scroll. Day headers span their time-slot columns using `colspan`. A toggle button above the table switches between 3-hourly and hourly column sets. Each wind-speed and gust cell gets an inline `background-color` from `windColour()`. Wind direction cells render a Unicode arrow (↑) rotated via CSS `transform: rotate(Xdeg)` to the correct bearing.

**Milestone 6 — Mock data and wiring** creates two static JSON files in `src/data/`: `today.json` (24 hourly entries with forecast speed, gusts, direction, and empty actual arrays) and `week.json` (168 hourly entries — 7 days × 24h — with speed, gusts, direction, wave height, wave period, temperature, precipitation). Both components import their respective JSON directly. The tide row in the table shows "—" for every cell.


## Concrete Steps

Run all commands from inside the `frontend/` directory unless otherwise noted.

**Step 1 — Create the Vite project**

From the project root (`/Users/milovanderzanden/Desktop/Kite app 2.0/`):

    npm create vite@latest frontend -- --template react-ts

Accept all prompts. Then:

    cd frontend
    npm install
    npm install recharts
    npm install --save-dev @types/recharts

Confirm the dev server starts:

    npm run dev

Expected output includes a line like:

    ➜  Local:   http://localhost:5173/

Open that URL in a browser and confirm the default Vite + React page loads.

**Step 2 — Clean up scaffold, add global styles**

Delete the default scaffold content: remove `src/App.css` contents, replace `src/index.css` with the global styles below, clear `src/App.tsx` to a minimal shell.

`src/index.css` should define:

    :root {
      --bg: #0d1117;
      --bg-surface: #161b22;
      --text-primary: #e6edf3;
      --text-secondary: #8b949e;
      --border: #30363d;
      --teal: #2dd4bf;
      --pink: #f472b6;
      --now-line: #ffffff;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: var(--bg); color: var(--text-primary); font-family: 'Inter', system-ui, sans-serif; }
    .mono { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', 'Fira Code', monospace; }

**Step 3 — Wind colour utility**

Create `src/utils/windColour.ts`:

    export function windColour(knots: number): string {
      if (knots < 15) return interpolate('#4a4a4a', '#6b6b6b', knots, 0, 14)
      if (knots <= 20) return interpolate('#b8860b', '#ffd700', knots, 15, 20)
      if (knots <= 25) return interpolate('#cc5500', '#ff8c00', knots, 21, 25)
      if (knots <= 32) return interpolate('#8b0000', '#dc143c', knots, 26, 32)
      return interpolate('#4b0082', '#800080', knots, 33, 45)
    }

    function interpolate(dark: string, light: string, value: number, min: number, max: number): string {
      const t = Math.min(1, Math.max(0, (value - min) / (max - min)))
      return blendHex(dark, light, t)
    }

    function blendHex(a: string, b: string, t: number): string {
      const parse = (h: string) => [
        parseInt(h.slice(1, 3), 16),
        parseInt(h.slice(3, 5), 16),
        parseInt(h.slice(5, 7), 16),
      ]
      const [ar, ag, ab] = parse(a)
      const [br, bg, bb] = parse(b)
      const r = Math.round(ar + (br - ar) * t)
      const g = Math.round(ag + (bg - ag) * t)
      const bl = Math.round(ab + (bb - ab) * t)
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
    }

Note: the gradient goes from the darker shade (low end of the band) to the lighter shade (high end). This is the opposite of the design intent (darker = stronger). Swap `dark` and `light` arguments in each `interpolate` call if you want stronger wind = darker colour. Adjust to taste.

**Step 4 — Mock data**

Create `src/data/today.json`. It must be an object with a `spot` string and an `hourly` array of 24 objects:

    {
      "spot": "IJmuiden",
      "current": { "speed": 18, "gusts": 24, "direction": 225 },
      "hourly": [
        { "hour": 0,  "forecastSpeed": 12, "forecastGusts": 17, "direction": 220, "actualSpeed": 11, "actualGusts": 16 },
        { "hour": 1,  "forecastSpeed": 13, "forecastGusts": 18, "direction": 222, "actualSpeed": 14, "actualGusts": 19 },
        ...
        { "hour": 14, "forecastSpeed": 18, "forecastGusts": 24, "direction": 230, "actualSpeed": 17, "actualGusts": 23 },
        { "hour": 15, "forecastSpeed": 17, "forecastGusts": 23, "direction": 232, "actualSpeed": null, "actualGusts": null },
        ...
        { "hour": 23, "forecastSpeed": 15, "forecastGusts": 21, "direction": 240, "actualSpeed": null, "actualGusts": null }
      ]
    }

Fill in all 24 entries (hours 0–23) with plausible wind values (10–25 kn speed, gusts 5–8 kn above speed). Set `actualSpeed` and `actualGusts` to non-null numbers for hours 0 up to (but not including) the current hour at the time you write the file — these represent mock observed readings. Set them to `null` for the current hour and all future hours. The graph component uses `null` to determine where the actual line ends and the forecast area takes over.

Create `src/data/week.json`. It must be an object with a `spot` string and a `forecast` array of 168 objects (7 × 24):

    {
      "spot": "IJmuiden",
      "forecast": [
        {
          "iso": "2026-04-08T00:00",
          "speed": 14,
          "gusts": 19,
          "direction": 215,
          "waveHeight": 0.8,
          "wavePeriod": 7,
          "tempC": 12,
          "precipMm": 0.0
        },
        ...
      ]
    }

168 entries, one per hour. Dates run from today (2026-04-08) through 7 days forward. You do not need to fill all 168 by hand — write a short Node.js or Python snippet to generate them, or hand-write the first 8 (one day's worth of 3-hour slots) and duplicate with minor variation.

**Step 5 — Navigation bar (`src/components/NavBar.tsx`)**

    import React from 'react'

    type View = 'today' | 'week'

    interface Props {
      view: View
      onSwitch: (v: View) => void
    }

    export function NavBar({ view, onSwitch }: Props) {
      return (
        <nav style={{ /* fixed top bar styles */ }}>
          <span className="app-name">KiteWind</span>
          <span className="spot-name">IJmuiden</span>
          <div className="tabs">
            <button className={view === 'today' ? 'active' : ''} onClick={() => onSwitch('today')}>Today</button>
            <button className={view === 'week' ? 'active' : ''} onClick={() => onSwitch('week')}>7 Days</button>
          </div>
        </nav>
      )
    }

Style the nav as `position: fixed; top: 0; width: 100%; background: var(--bg-surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 1.5rem; height: 52px; z-index: 100`. Active tab gets a bottom border in teal.

**Step 6 — Today view (`src/components/TodayView.tsx`)**

This component imports `today.json` and renders a spot section containing:

1. A spot header `<div>` showing the spot name, a large current-speed number, a large current-gusts number, and a wind direction arrow (a `↑` character rotated by the direction in degrees). The header background chip uses `windColour(current.speed)`.

2. A `<ComposedChart>` from Recharts. Set `width` to `"100%"` using a `<ResponsiveContainer>` wrapper with `height={300}`.

Inside the ComposedChart:

- Five `<ReferenceArea>` components for the wind strength bands (y1/y2 pairs: 0–15 grey, 15–20 yellow, 20–25 orange, 25–32 red, 32–45 purple). Set `fill` to the band colour with low opacity (e.g. `fillOpacity={0.15}`). These sit behind all other elements.
- `<Area dataKey="forecastSpeed" fill="var(--teal)" stroke="var(--teal)" fillOpacity={0.3} />`
- `<Area dataKey="forecastGusts" fill="var(--pink)" stroke="var(--pink)" fillOpacity={0.2} />`
- `<Line dataKey="actualSpeed" stroke="var(--teal)" dot={false} strokeWidth={2} connectNulls={false} />` — Recharts will break the line at null entries, so it naturally stops at the current hour
- `<Line dataKey="actualGusts" stroke="var(--pink)" dot={false} strokeWidth={2} connectNulls={false} />`
- `<ReferenceLine x={currentHour} stroke="var(--now-line)" strokeDasharray="4 4" label="Now" />` where `currentHour` is `new Date().getHours()`
- `<XAxis dataKey="hour" tickFormatter={(h) => \`${h}:00\`} interval={2} />`
- `<YAxis domain={[0, 40]} />`
- `<Tooltip />`

The `data` prop of ComposedChart receives `todayData.hourly`.

**Step 7 — 7-Day table view (`src/components/WeekView.tsx`)**

This component imports `week.json` and renders a spot section containing only the spot name header plus the table.

Table structure:

    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: 'max-content' }}>
        <thead>
          <tr> {/* Day group headers, each spanning N columns */} </tr>
          <tr> {/* Individual time-slot headers */} </tr>
        </thead>
        <tbody>
          <tr> {/* Wind Speed row */} </tr>
          <tr> {/* Gusts row */} </tr>
          <tr> {/* Wind Direction row */} </tr>
          <tr> {/* Wave Height row */} </tr>
          <tr> {/* Wave Period row */} </tr>
          <tr> {/* Tide row — all cells show "—" */} </tr>
          <tr> {/* Temperature row */} </tr>
          <tr> {/* Precipitation row */} </tr>
        </tbody>
      </table>
    </div>

The first cell of every `<tbody>` row is the row label. Style it as `position: sticky; left: 0; background: var(--bg-surface); z-index: 10; min-width: 160px; padding: 4px 12px; font-size: 0.8rem; color: var(--text-secondary)`.

The toggle control is a `<button>` above the table that switches a local `resolution` state between `'3h'` and `'1h'`. When `'3h'`, filter the forecast array to entries where `new Date(entry.iso).getHours() % 3 === 0`. When `'1h'`, use all entries.

Day group headers: group the (filtered) entries by calendar date. For each group, render a `<th colSpan={group.length}>` with the day label (e.g. "Tue 8 Apr").

Wind speed and gust cells: `<td style={{ backgroundColor: windColour(entry.speed), color: '#fff' }} className="mono">`.

Wind direction cells: render `<span style={{ display: 'inline-block', transform: \`rotate(${entry.direction}deg)\` }}>↑</span>`. The arrow points north (up) at 0° and rotates clockwise with the direction value.

Temperature cells: apply a subtle tint — `backgroundColor: entry.tempC > 18 ? '#3d1f00' : entry.tempC < 8 ? '#001a3d' : 'transparent'`.

Precipitation cells: `backgroundColor: entry.precipMm > 0 ? '#001a3d' : 'transparent'`. Show the number only if > 0, otherwise "—".

**Step 8 — Wire into App.tsx**

    import { useState } from 'react'
    import { NavBar } from './components/NavBar'
    import { TodayView } from './components/TodayView'
    import { WeekView } from './components/WeekView'

    export default function App() {
      const [view, setView] = useState<'today' | 'week'>('today')
      return (
        <>
          <NavBar view={view} onSwitch={setView} />
          <main style={{ marginTop: 52, padding: '1.5rem' }}>
            {view === 'today' ? <TodayView /> : <WeekView />}
          </main>
        </>
      )
    }


## Validation and Acceptance

After completing all steps, run:

    cd frontend
    npm run dev

Then open `http://localhost:5173` in a browser and verify:

1. The top bar shows "KiteWind", "IJmuiden", and two tab buttons ("Today", "7 Days").
2. The Today tab (default) shows a spot header with a large wind speed number, a coloured badge, and a 24-hour chart with: teal and pink shaded forecast areas spanning the full day; solid teal and pink actual-wind lines covering hours 0 to the current hour; and a dashed vertical "now" line where the actual lines end and the forecast areas continue.
3. Clicking "7 Days" shows a table with 8 row labels fixed on the left, day group headers spanning time-slot columns, and wind speed/gust cells with coloured backgrounds. The Tide row shows "—" in all cells.
4. The "3h / 1h" toggle on the 7-day view changes the number of columns (fewer columns in 3h mode, more in 1h mode).
5. Run `npm run build` and confirm it exits with no errors. Expected output ends with:

        ✓ built in Xs

No automated tests are required for this milestone. Visual inspection is the acceptance criterion.


## Idempotence and Recovery

`npm create vite` will fail if the `frontend/` directory already exists. If you need to restart, delete `frontend/` entirely and re-run the scaffold command.

`npm install` is safe to re-run. It will not duplicate packages.

The mock JSON files in `src/data/` can be overwritten freely — they are not committed to the API contract yet.


## Artifacts and Notes

The final file tree under `frontend/src/` should look like:

    src/
      components/
        NavBar.tsx
        TodayView.tsx
        WeekView.tsx
      data/
        today.json
        week.json
      utils/
        windColour.ts
      App.tsx
      index.css
      main.tsx


## Interfaces and Dependencies

Runtime dependencies (install via npm):

- `recharts` — composable React charting library. Version 2.x. Import from `'recharts'`.

Dev dependencies:

- `@types/recharts` — TypeScript types (may be bundled in recharts 2.x — check; skip if already included)
- TypeScript, React, Vite — included in the `react-ts` Vite template

Key function signature that must exist at end of Milestone 2:

    // src/utils/windColour.ts
    export function windColour(knots: number): string

Key component props interfaces that must exist:

    // NavBar.tsx
    interface Props { view: 'today' | 'week'; onSwitch: (v: 'today' | 'week') => void }

    // TodayView.tsx — no props; reads from src/data/today.json directly
    // WeekView.tsx  — no props; reads from src/data/week.json directly

The `today.json` schema (TypeScript equivalent):

    interface TodayData {
      spot: string
      current: { speed: number; gusts: number; direction: number }
      hourly: Array<{
        hour: number
        forecastSpeed: number
        forecastGusts: number
        direction: number
        actualSpeed: number | null
        actualGusts: number | null
      }>
    }

The `week.json` schema:

    interface WeekData {
      spot: string
      forecast: Array<{
        iso: string        // ISO 8601 datetime string, e.g. "2026-04-08T06:00"
        speed: number      // knots
        gusts: number      // knots
        direction: number  // degrees, 0–360, meteorological (0 = from north)
        waveHeight: number // metres
        wavePeriod: number // seconds
        tempC: number      // degrees Celsius
        precipMm: number   // millimetres per hour
      }>
    }
