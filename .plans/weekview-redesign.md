# Redesign WeekView to match ForecastDay card style

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

The current 7-day forecast tab (`WeekView`) is a dense scrollable table — functional but visually inconsistent with the designer-produced `ForecastDay` card style, which is clean, card-based, and kitesurf-focused. After this change the user will see seven stacked day cards, each matching the `ForecastDay` aesthetic: coloured wind tiles, direction arrows, wave/temp/rain rows, a kiteable session banner, and a tide curve — all inside the existing dark-themed single-page app. Acceptance is visual inspection at `http://localhost:5173` on the "7 Days" tab.

## Progress

- [ ] Adapt `ForecastDay.jsx` (plain React JS) into a TypeScript component at `frontend/src/components/ForecastDay.tsx` that accepts the existing `week.json` data shape.
- [ ] Rewrite `WeekView.tsx` to render one `ForecastDay` card per day, replacing the table layout entirely.
- [ ] Reconcile colour tokens: bridge `ForecastDay`'s light-mode CSS vars with the app's dark-mode CSS vars in `index.css`.
- [ ] Validate visually by running the dev server and inspecting the "7 Days" tab.

## Surprises & Discoveries

_(fill in as work proceeds)_

## Decision Log

- Decision: Port `ForecastDay.jsx` to TypeScript rather than keeping it as `.jsx`.
  Rationale: The app is a TypeScript + Vite project; mixing untyped JSX files adds build friction and breaks the `tsc` check in `npm run build`.
  Date/Author: 2026-04-08 / plan author

- Decision: Keep `windColour.ts` alongside the new `ForecastDay` colour logic rather than merging them.
  Rationale: `windColour.ts` is still used by `TodayView`. `ForecastDay` uses its own `windBand` + `COLORS` object which encodes additional semantic bands (RIDE/PUMP/STRONG labels); these serve a different purpose than the gradient interpolation in `windColour.ts`.
  Date/Author: 2026-04-08 / plan author

- Decision: Omit tide data for now — render an empty `tides` array for each day.
  Rationale: `week.json` has no tide entries; the designer's sample data used static dummy tides. Leaving `tides={[]}` suppresses the `TideCurve` gracefully (it returns `null` when the array is empty). Tide data can be wired up in a future plan.
  Date/Author: 2026-04-08 / plan author

## Outcomes & Retrospective

_(fill in at completion)_

---

## Context and Orientation

The app lives under `frontend/`. All commands below run from that directory unless stated otherwise. The entry point is `src/App.tsx`, which conditionally renders `<TodayView />` or `<WeekView />` based on a `view` state string. The nav bar is `src/components/NavBar.tsx`. The relevant files for this plan are:

- `src/components/WeekView.tsx` — the file to rewrite (253 lines, table-based).
- `src/data/week.json` — static mock data; shape described below.
- `src/utils/windColour.ts` — gradient colour helper, untouched by this plan.
- `src/index.css` — CSS custom properties (dark theme); needs two new vars.
- `/Users/milovanderzanden/Desktop/Kite app 2.0/ForecastDay.jsx` — the designer's reference component (356 lines); the full source is the ground truth for visual style.
- `/Users/milovanderzanden/Desktop/Kite app 2.0/ForecastDayExample.jsx` — sample data and usage showing the props the component expects.

### week.json data shape

`week.json` exports an object `{ spot: string, forecast: ForecastEntry[] }` where each `ForecastEntry` is:

    {
      iso: string        // e.g. "2026-04-08T06:00"
      speed: number      // wind speed in knots
      gusts: number      // gust speed in knots
      direction: number  // wind direction in degrees (0–359, meteorological: 0=N, 90=E, etc.)
      waveHeight: number // wave height in metres
      wavePeriod: number // wave period in seconds
      tempC: number      // air temperature in Celsius
      precipMm: number   // precipitation in mm
    }

### ForecastDay slot shape (what the designer's component expects)

Each slot passed to `ForecastDay` is:

    {
      hour: number    // 6, 9, 12, 15, 18, or 21
      windKn: number
      gustKn: number
      dirDeg: number
      waveM: number
      tempC: number
      rainMm: number
    }

The `week.json` entries map onto slots as: `speed → windKn`, `gusts → gustKn`, `direction → dirDeg`, `waveHeight → waveM`, `precipMm → rainMm`.

### How the designer's component works (summary)

`ForecastDay` (from the reference `.jsx` file) renders one day as a vertical card:

1. **Header** — day name + date + spot name.
2. **Session banner** — shown only when any slot has `windKn >= rideableMin`; summarises the kiteable window (start time, end time, avg wind, dominant direction, wave range).
3. **Six time columns** — one for each slot hour (06, 09, 12, 15, 18, 21). Each column shows a coloured wind tile (value, RIDE/PUMP/STRONG label, gust), a direction arrow SVG, wave height, temperature, and optional rain indicator.
4. **Tide curve** — SVG sine-like curve with labelled high/low markers; skipped gracefully when `tides` is an empty array.

Props: `date` (YYYY-MM-DD string), `spotName`, `slots` (array of 6 slot objects), `tides` (array, can be `[]`), `rideableMin` (default 16), `pumpingMin` (default 22).

### CSS variable mismatch

`ForecastDay` hard-codes light-mode CSS vars on its root `div` style (e.g. `--bg-muted: #f3f4f6`, `--text-primary: #1a1a1a`). The app uses dark-mode vars in `index.css` (e.g. `--bg: #0d1117`, `--text-primary: #e6edf3`). The strategy is:

- Override the component-scoped vars on `ForecastDay`'s `rootStyle` to match the dark theme.
- Two additional vars (`--bg-muted` and `--tide-accent`) do not exist in `index.css` and must be added there or overridden inline.

The simplest approach is to edit `rootStyle` inside the new `ForecastDay.tsx` to supply dark-theme values for all vars it uses. This keeps the override self-contained.

---

## Plan of Work

### Step 1 — Create `ForecastDay.tsx`

Copy the logic from the designer's `ForecastDay.jsx` (at `/Users/milovanderzanden/Desktop/Kite app 2.0/ForecastDay.jsx`) into a new file `frontend/src/components/ForecastDay.tsx`. The conversion involves:

- Adding TypeScript type annotations for props and internal objects.
- Exporting the component with `export function ForecastDay(...)` (named export) to match the project's convention (see `WeekView.tsx` line 62).
- Adjusting the `rootStyle` object to use the app's dark-theme values for each CSS variable it references:

  The vars used by `ForecastDay` and their required dark-theme overrides:

      --bg-muted      → #1c2128    (slightly lighter than --bg-surface for "too light" tile)
      --text-primary  → #e6edf3    (matches app's --text-primary)
      --text-secondary → #8b949e   (matches app's --text-secondary)
      --text-tertiary → #6b7280    (slightly muted; not in app vars, inline is fine)
      --border        → #30363d    (matches app's --border)
      --tide-accent   → #58a6ff    (blue accent; replaces the light-mode navy)

- Setting `background: 'var(--bg-surface)'` and `color: 'var(--text-primary)'` on `rootStyle` (the component omits an explicit background, inheriting white from the light-mode body; on dark background it needs to be set).

The `windBand`, `COLORS`, `bandLabel`, `formatDay`, `WindArrow`, `TideCurve`, and `degreesToCompass` helpers can be copied verbatim — they are pure logic with no CSS var dependencies other than those overridden in `rootStyle`.

The `COLORS.tooLight.bg` is set to `"var(--bg-muted)"` which will now resolve to the dark-theme value above. All other `COLORS` entries use hard-coded hex values and need no changes.

Do **not** add a default `export default` — use `export function ForecastDay`.

### Step 2 — Rewrite `WeekView.tsx`

Replace the entire contents of `frontend/src/components/WeekView.tsx` with a new implementation that:

1. Imports `ForecastDay` from `./ForecastDay`.
2. Imports `weekData` from `../data/week.json` (same as current).
3. Groups `weekData.forecast` entries by date using a `groupByDay` function (same logic as current `groupByDay` in `WeekView.tsx`).
4. For each day group, extracts exactly the 6 canonical slot hours (06, 09, 12, 15, 18, 21) using `Array.filter`. If the 3h resolution data doesn't include all six, fall back to the nearest available hour for that slot — but for the existing `week.json` which is hourly or 3-hourly, simply filtering for those hours is sufficient.
5. Maps each matching `ForecastEntry` to a slot object: `{ hour, windKn: e.speed, gustKn: e.gusts, dirDeg: e.direction, waveM: e.waveHeight, tempC: e.tempC, rainMm: e.precipMm }`.
6. Renders a vertical list of `<ForecastDay>` cards:

       <ForecastDay
         key={dateKey}
         date={dateKey}           // "YYYY-MM-DD" extracted from iso slice(0, 10)
         spotName={weekData.spot}
         slots={slots}
         tides={[]}
         rideableMin={16}
         pumpingMin={22}
       />

7. Wraps the list in a `<div>` with `padding: '0 0 2rem'` and a max-width of 560px so the cards don't stretch on wide screens.

Remove the `resolution` toggle entirely — the new design uses fixed 3h slots (6 time columns per day) matching the designer's card. If a 1h toggle is desired in future, it can be a separate plan.

### Step 3 — Verify `index.css` has no conflicts

No changes to `index.css` are required because all overrides live in `rootStyle` inside `ForecastDay.tsx`. Confirm visually that the `--tide-accent` override is visible and legible on the dark background.

---

## Concrete Steps

Run all commands from `frontend/`:

1. Create `src/components/ForecastDay.tsx` — see Plan of Work §Step 1.

2. Rewrite `src/components/WeekView.tsx` — see Plan of Work §Step 2.

3. Start the dev server:

       npm run dev

   Open `http://localhost:5173`, click "7 Days". You should see 7 stacked day cards, each with coloured wind tiles, direction arrows, wave/temp/rain rows, and a session banner where wind is kiteable.

4. Run the TypeScript check to confirm no type errors:

       npm run build

   Expected: build succeeds with 0 errors. Warnings about `any` are acceptable if `week.json` is imported without a type declaration, but zero errors is the goal.

5. Run the linter:

       npm run lint

   Expected: 0 errors.

---

## Validation and Acceptance

Start the dev server (`npm run dev`) and navigate to `http://localhost:5173`.

- Switch to the "7 Days" tab via the nav bar.
- You should see seven vertically stacked day cards, not a table.
- Each card shows the day name (e.g. "Wednesday") and date (e.g. "8 Apr · IJmuiden").
- Wind tiles are coloured: grey for calm, green shades for rideable/pumping, dark teal for strong.
- Tiles on kiteable days show a green session banner above the columns.
- Direction arrows rotate to the correct bearing.
- Wave, temperature, and rain rows appear below the arrows.
- The tide section at the bottom of each card shows nothing (empty — this is correct; tides are not yet wired).
- Background of each card matches the dark app theme (no white or light-grey bleed).

`npm run build` exits 0. `npm run lint` exits 0.

---

## Idempotence and Recovery

All changes are to two TypeScript files only (`ForecastDay.tsx` is new; `WeekView.tsx` is replaced). The old `WeekView.tsx` table code can be restored from git history if needed. The designer's original `ForecastDay.jsx` at the repo root is untouched and remains as the reference. No database migrations, no package installs, no env variable changes.

---

## Artifacts and Notes

Key mappings from `week.json` fields to `ForecastDay` slot fields (for quick reference during implementation):

    week.json field  →  slot field
    ───────────────────────────────
    speed            →  windKn
    gusts            →  gustKn
    direction        →  dirDeg
    waveHeight       →  waveM
    tempC            →  tempC     (same name)
    precipMm         →  rainMm

Dark-theme CSS var overrides to apply inside `rootStyle` in `ForecastDay.tsx`:

    '--bg-muted':        '#1c2128',
    '--text-primary':    '#e6edf3',
    '--text-secondary':  '#8b949e',
    '--text-tertiary':   '#6b7280',
    '--border':          '#30363d',
    '--tide-accent':     '#58a6ff',
    background:          'var(--bg-surface)',

---

## Interfaces and Dependencies

No new npm packages are required. The only new file is `frontend/src/components/ForecastDay.tsx`. Its exported interface:

    export interface Slot {
      hour: number
      windKn: number
      gustKn: number
      dirDeg: number
      waveM: number
      tempC: number
      rainMm: number
    }

    export interface TidePoint {
      time: string    // "HH:MM"
      heightM: number
      type: 'low' | 'high'
    }

    export interface ForecastDayProps {
      date: string        // "YYYY-MM-DD"
      spotName?: string
      slots: Slot[]
      tides?: TidePoint[]
      rideableMin?: number
      pumpingMin?: number
    }

    export function ForecastDay(props: ForecastDayProps): JSX.Element
