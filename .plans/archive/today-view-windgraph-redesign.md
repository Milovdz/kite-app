# Replace TodayView chart with WindGraph designer component

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

A designer produced `WindGraph.jsx` and `WindGraphExample.jsx` in the repo root — a polished Chart.js-based wind chart with a header showing current speed/gust/direction, a legend, and a 24-hour line chart overlaying forecast vs actual wind and gusts. The goal is to replace the existing Recharts-based `TodayView.tsx` chart and header section with the WindGraph component, so the Today tab shows this improved design.

After implementation, running the dev server (`npm run dev` from `frontend/`) and visiting `http://localhost:5173` should show the Today tab with the new WindGraph layout: a coloured wind speed badge, gust reading, rotating direction arrow, legend row, and a Chart.js line chart with kiteable-zone shading, a "Now" dashed line, and actual vs forecast lines.

## Progress

- [ ] Copy WindGraph.jsx into the frontend component tree as WindGraph.tsx (or .jsx)
- [ ] Install chart.js in the frontend package
- [ ] Wire TodayView.tsx to render WindGraph, mapping today.json fields to WindGraph props
- [ ] Remove the old Recharts chart markup from TodayView
- [ ] Verify the app builds and the Today tab renders correctly

## Surprises & Discoveries

_None yet._

## Decision Log

- Decision: Keep TodayView.tsx as the wrapper rather than replacing it with WindGraph directly.
  Rationale: App.tsx renders `<TodayView />` with no props; preserving that interface avoids touching App.tsx. TodayView becomes a thin adapter that reads today.json and passes props to WindGraph.
  Date/Author: 2026-04-08 / planning

- Decision: Use WindGraph.jsx as-is (plain JSX) rather than converting fully to TypeScript.
  Rationale: The file is self-contained with no TS-specific features; Vite handles JSX natively. Converting adds churn without benefit.
  Date/Author: 2026-04-08 / planning

## Outcomes & Retrospective

_To be filled in after implementation._

## Context and Orientation

**Repository layout** — the app lives under `frontend/` from the repo root (`/Users/milovanderzanden/Desktop/Kite app 2.0/kite-app/frontend/`). All `npm` commands must be run from that directory.

**Key files:**

- `frontend/src/components/TodayView.tsx` — current Today tab component; 156 lines; uses Recharts and reads `../data/today.json` directly.
- `frontend/src/data/today.json` — static JSON with fields: `spot` (string), `current.speed` (number, knots), `current.gusts` (number), `current.direction` (degrees), and `hourly[]` (24 objects with `hour`, `forecastSpeed`, `forecastGusts`, `actualSpeed|null`, `actualGusts|null`).
- `WindGraph.jsx` (repo root, not yet in frontend) — the designer's Chart.js component. Accepts these props:

      spotName       : string
      currentWind    : number   // knots
      currentGust    : number   // knots
      currentDirDeg  : number   // degrees
      threshold      : number   // kiteable threshold, default 17
      yMax           : number   // y-axis max, default 40
      forecastWind   : number[] // 24 values, index = hour
      forecastGust   : number[] // 24 values
      actualWind     : (number|null)[] // 24 values, null = future
      actualGust     : (number|null)[] // 24 values
      nowIndex       : number   // current hour 0-23

- `WindGraphExample.jsx` (repo root) — example usage; useful reference but does not need to be imported by the app.
- `frontend/src/index.css` — defines CSS custom properties (`--bg`, `--bg-surface`, etc.) for the light theme. WindGraph uses its own inline styles, so these don't conflict.
- `frontend/package.json` — current dependencies include `recharts` but not `chart.js`.

**Libraries:**
- Recharts (existing) — used by old TodayView; can remain installed but will no longer be used in TodayView after this change.
- Chart.js — used by WindGraph via `require("chart.js/auto")`; must be added to frontend deps.

## Plan of Work

**Step 1 — Add chart.js to frontend dependencies.**

From `frontend/`, run:

    npm install chart.js

This adds `chart.js` to `package.json` and `node_modules`. WindGraph's `require("chart.js/auto")` resolves via this package.

**Step 2 — Copy WindGraph.jsx into the component tree.**

Copy `/Users/milovanderzanden/Desktop/Kite app 2.0/kite-app/WindGraph.jsx` to `frontend/src/components/WindGraph.jsx`. No changes to the file are needed — Vite handles JSX without TypeScript. Do not rename to `.tsx` as that would require adding type annotations.

**Step 3 — Rewrite TodayView.tsx.**

Replace the entire file with a thin adapter. The new TodayView:

1. Imports `WindGraph` from `./WindGraph`.
2. Imports `todayData` from `../data/today.json`.
3. Derives `nowIndex` from `new Date().getHours()`.
4. Extracts the 24 `forecastSpeed`, `forecastGust`, `actualSpeed`, `actualGust` arrays from `hourly[]` using `Array.prototype.map`.
5. Renders `<WindGraph>` with all props mapped from today.json.

The mapping is straightforward:

    spotName      ← todayData.spot
    currentWind   ← todayData.current.speed
    currentGust   ← todayData.current.gusts
    currentDirDeg ← todayData.current.direction
    threshold     = 17   (constant — kiteable minimum)
    yMax          = 40   (constant — matches current YAxis domain)
    forecastWind  ← hourly.map(h => h.forecastSpeed)
    forecastGust  ← hourly.map(h => h.forecastGusts)
    actualWind    ← hourly.map(h => h.actualSpeed ?? null)
    actualGust    ← hourly.map(h => h.actualGusts ?? null)
    nowIndex      ← new Date().getHours()

The old Recharts imports (`ComposedChart`, `Area`, `Line`, etc.) and all JSX that was the card+chart are removed. The windColour import can also be removed as WindGraph handles its own colour logic.

The resulting file should be around 30 lines.

**Step 4 — Verify build and visual result.**

Run the dev server and inspect the Today tab visually. There are no automated tests; acceptance is visual.

## Concrete Steps

All commands run from `frontend/` unless noted.

    cd "/Users/milovanderzanden/Desktop/Kite app 2.0/kite-app/frontend"

    # Step 1: install chart.js
    npm install chart.js

    # Step 2: copy WindGraph (run from repo root or adjust path)
    cp "../WindGraph.jsx" "src/components/WindGraph.jsx"

    # Step 3: rewrite TodayView.tsx (edit the file as described above)

    # Step 4: start dev server
    npm run dev
    # Open http://localhost:5173 — Today tab should show the new WindGraph layout

    # Optional: confirm build compiles
    npm run build

## Validation and Acceptance

After `npm run dev`, open `http://localhost:5173` in a browser. The Today tab must show:

- A spot name label ("IJmuiden").
- A coloured rectangular badge with the current wind speed (e.g. "24") in white text, followed by "kn", then "G31 kn".
- A wind direction arrow icon (SVG, rotating to reflect the bearing) with a compass label (e.g. "SW").
- A legend row with four items: "Actual wind", "Actual gust", "Forecast wind", "Forecast gust".
- A 280px-tall Chart.js line chart with:
  - Hour labels on x-axis (every 3 hours: 0:00, 3:00, …, 21:00).
  - A green dashed threshold line at 17 kn labelled "17 kn".
  - A light green kiteable zone shading above 17 kn.
  - A vertical dashed "Now" line at the current hour.
  - Teal actual wind/gust lines (solid and dashed).
  - Pink/rose forecast wind/gust lines (solid and dashed).

`npm run build` must complete without TypeScript errors.

## Idempotence and Recovery

Copying `WindGraph.jsx` multiple times is safe (overwrite is idempotent). Re-running `npm install chart.js` is safe. If `npm run build` fails with TypeScript errors related to importing a `.jsx` file, check that `frontend/tsconfig.json` or `vite.config.ts` allows JSX files — Vite supports this by default with the React plugin.

If the chart does not render, check the browser console: a missing `chart.js` module will surface as an import error. Verify `chart.js` appears in `frontend/package.json` dependencies.

## Artifacts and Notes

WindGraph's dark-mode detection reads `window.matchMedia("(prefers-color-scheme: dark)").matches` at render time. Since the app currently has a light theme only, `isDark` will be false and the light-mode palette will apply — this is correct.

WindGraph uses `require("chart.js/auto")` inside a `useEffect` with a try/catch fallback to `window.Chart`. With Vite (ESM), `require` is not available at the module level, but inside a `useEffect` callback it is handled by Vite's CommonJS interop. If this causes issues, the import can be changed to a top-level `import Chart from "chart.js/auto"` at the top of WindGraph.jsx. Record any discovery in this plan.

## Interfaces and Dependencies

In `frontend/src/components/WindGraph.jsx`, the component signature is:

    export default function WindGraph({
      spotName, currentWind, currentGust, currentDirDeg,
      threshold, yMax, forecastWind, forecastGust,
      actualWind, actualGust, nowIndex
    })

In `frontend/src/components/TodayView.tsx`, after the rewrite:

    import WindGraph from './WindGraph'
    import todayData from '../data/today.json'

    const nowIndex = new Date().getHours()

    export function TodayView() {
      const { spot, current, hourly } = todayData
      return (
        <WindGraph
          spotName={spot}
          currentWind={current.speed}
          currentGust={current.gusts}
          currentDirDeg={current.direction}
          threshold={17}
          yMax={40}
          forecastWind={hourly.map(h => h.forecastSpeed)}
          forecastGust={hourly.map(h => h.forecastGusts)}
          actualWind={hourly.map(h => h.actualSpeed ?? null)}
          actualGust={hourly.map(h => h.actualGusts ?? null)}
          nowIndex={nowIndex}
        />
      )
    }
