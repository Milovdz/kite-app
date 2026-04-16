# Redesign HomeView as mini-bar-chart spot × day grid

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

The current HomeView renders each day cell as a **horizontal timeline bar** (a coloured strip spanning 06–22 h) with a text label below. The user wants to replace this with a denser layout inspired by `SpotOverview.jsx` (a prototype at the repository root): each cell shows **six small vertical bars** (one per 3-hour slot: 06, 09, 12, 15, 18, 21) coloured by wind speed, plus a **session pill** summarising the kiteable window.

The critical constraint: the teal session pill must only appear when **both** wind speed ≥ 16 kn **and** wind direction is not offshore for that spot. This logic already lives in `computeKiteableWindows` in `frontend/src/utils/kiteableWindows.ts` and must remain the sole gating function — bars always show raw wind speed for visual scanning, but the pill is gated on the full kiteability check.

After this change, the home tab shows a compact table where you can scan across all spots and days at a glance: tall coloured bars mean wind is up, a teal pill means you can actually kite there.

## Progress

- [ ] Rewrite `MiniBarChart` in HomeView: replace horizontal bar with 6 vertical bars sampled at hours 6, 9, 12, 15, 18, 21
- [ ] Rewrite `SessionPill` in HomeView: show teal pill from `computeKiteableWindows` when kiteable, grey peak-wind note when not
- [ ] Update day cell layout to flex-column with chart above pill
- [ ] Adjust column widths to suit new denser cells
- [ ] Update time axis label from `06 / 22` to `06 / 21`
- [ ] Visual inspection and `npm run build` passing

## Surprises & Discoveries

(fill in as work proceeds)

## Decision Log

- Decision: Reuse `computeKiteableWindows` unchanged for the pill condition.
  Rationale: It already enforces both speed and direction criteria. Duplicating the logic risks divergence.
  Date/Author: 2026-04-10 / plan author

- Decision: Bar colours use `windColour(kn)` (the existing dark-theme utility) rather than the green-band palette from `SpotOverview.jsx`.
  Rationale: The app uses a dark theme where `windColour` (grey → gold → orange → red → purple) is established. The green palette from the prototype is light-theme and would look inconsistent.
  Date/Author: 2026-04-10 / plan author

- Decision: Bars render regardless of wind direction; only the pill is gated on direction.
  Rationale: Bars are for visual scanning (how windy is it?). The pill answers "can I kite?" — requiring both speed and direction. A day with fast but offshore wind will show tall bars but no pill, which is exactly the right signal.
  Date/Author: 2026-04-10 / plan author

## Outcomes & Retrospective

(fill in at completion)

---

## Context and Orientation

The project is a React + TypeScript single-page app in `frontend/`. No automated tests — acceptance is visual inspection. The home view is `frontend/src/components/HomeView.tsx`.

**Key files:**

`frontend/src/components/HomeView.tsx` — the only file to modify. Currently contains two components:
- `WindowBar` — renders a horizontal coloured strip using absolute-positioned segments per kiteable window
- `WindowLabel` — shows text `"HH–HHh · XX kn"` beneath the bar

These will be replaced with:
- `MiniBarChart` — six vertical bars sampled at hours 6, 9, 12, 15, 18, 21
- `SessionPill` — teal pill when kiteable, grey peak note when not

`frontend/src/utils/kiteableWindows.ts` — exports `computeKiteableWindows(slots, rideableMin, windZones)`. A slot is kiteable when `windKn >= rideableMin` AND `getWindZone(dirDeg, windZones) !== 'offshore'`. Must not be modified.

`frontend/src/utils/windColour.ts` — exports `windColour(kn: number): string`. Returns hex: grey below 16 kn, gold 16–20, orange 21–25, red 26–32, purple above 32.

`frontend/src/utils/forecast.ts` — exports `groupByDay` and `toSlots`. Already imported by HomeView.

`frontend/src/config.ts` — exports `SPOTS` (array of `{ slug, name, windZones }`), `DATA_BASE_URL_FOR(slug)`, `APP_TZ`.

`frontend/src/components/ForecastDay.tsx` — exports the `Slot` type: `{ hour, windKn, gustKn, dirDeg, waveM, wavePeriodS, tempC, rainMm }`.

**Current HomeView geometry:** `LABEL_COL_W = 110`, `DAY_COL_W = 130`. These may need adjusting for the new cell shape.

**Data flow (unchanged):** HomeView fetches `week.json` per spot, parses to `Slot[]` grouped by date key, then calls `computeKiteableWindows` per day-spot pair. This data flow stays the same; only the rendering components change.

---

## Plan of Work

The entire change is confined to `frontend/src/components/HomeView.tsx`. No other file is touched.

**1. Replace `WindowBar` with `MiniBarChart`.**

The new `MiniBarChart` receives `slots: Slot[]` and `yMax: number` (default 35). It defines `SAMPLE_HOURS = [6, 9, 12, 15, 18, 21]` locally. For each of the six hours it calls `slots.find(s => s.hour === h)` to get the slot (defaulting `windKn` to 0 if not found). It renders a flex row of six bars aligned to the bottom inside a wrapper `div` that is 24 px tall. Each bar's height is `Math.max(8, Math.min(100, (kn / yMax) * 100))` percent of the wrapper, its background is `windColour(kn)`, and it has a `borderRadius: '2px 2px 0 0'` at the top.

**2. Replace `WindowLabel` with `SessionPill`.**

The new `SessionPill` receives `windows: KiteWindow[]` and `peakWind: number`. If `windows.length === 0`, it renders a small grey `<div>` showing `"{peakWind} kn"`. If windows exist, it renders a teal pill `<div>` showing `"{from}–{to}h {dir} {avgWind} kn"` from `windows[0]`, where `from` and `to` are the two-digit hour prefixes of `w.from` and `w.to` (e.g. `"09"` and `"15"`). The pill uses background `#0a3d2e` (or `rgba(16, 110, 86, 0.25)` for a dark-theme-friendly teal), text `var(--teal)`, `fontSize: 10`, `borderRadius: 4`, `padding: '2px 5px'`, `whiteSpace: 'nowrap'`, `overflow: 'hidden'`, `textOverflow: 'ellipsis'`.

**3. Update the day cell.**

The day cell `<div>` currently renders `<WindowBar>` and `<WindowLabel>`. Replace both with `<MiniBarChart>` then `<SessionPill>`. The cell should be `flexDirection: 'column'`, `gap: 2`, `minHeight: 56`, `justifyContent: 'center'`, with a small left border `0.5px solid var(--border)` for visual separation.

To compute `peakWind`, extract the same six sampled slots and take `Math.round(Math.max(...sampledKns))` before rendering. Pass this to `SessionPill` alongside `windows`.

**4. Adjust column widths.**

The bars at 24 px tall and 6 bars wide need less horizontal space than the current 130 px. Reduce `DAY_COL_W` to 90 px to let more days fit without scrolling. Leave `LABEL_COL_W` at 110 px.

**5. Update the time axis.**

Change the right-side axis label from `22` to `21` (since bars now represent 06–21 h, not 06–22 h).

---

## Concrete Steps

All commands from `frontend/`:

Start the dev server for live preview:

    npm run dev
    # Open http://localhost:5173, navigate to Home tab

Edit `frontend/src/components/HomeView.tsx` following the plan above. HMR will reload changes instantly.

After editing, verify types:

    npm run build
    # Expected: no errors

---

## Validation and Acceptance

Open the home tab. You should observe:

1. Each cell contains six small vertical bars. Bar heights vary with wind speed; bar colours progress from grey (calm) through gold, orange, red, purple (strong).
2. A teal session pill (e.g. `"09–15h SW 22 kn"`) appears below the bars **only** on days where at least one slot satisfies both `windKn >= 16` AND the direction is not offshore for that spot.
3. On days with strong but offshore wind: bars are tall and coloured, **no teal pill**, just a grey `"XX kn"` note.
4. On days with kiteable wind and direction: bars are coloured and a teal pill appears.
5. Today's column header remains teal.
6. Loading state: placeholder bars visible before data arrives.
7. `npm run build` passes with no TypeScript errors.

To test direction gating: IJmuiden's offshore arc is 23°–157° (roughly East). On a day forecast with East wind above 16 kn, confirm the bars are coloured but the pill is absent.

---

## Idempotence and Recovery

Only `HomeView.tsx` is modified. To revert:

    git checkout -- frontend/src/components/HomeView.tsx

No data, config, or shared utility files are touched.

---

## Artifacts and Notes

Six sample hours: `[6, 9, 12, 15, 18, 21]`.

The kiteability call (unchanged):

    const windows = computeKiteableWindows(day.slots, 16, spot.windZones)

KiteWindow type (from `kiteableWindows.ts`):

    interface KiteWindow {
      from: string    // "HH:00"
      to: string      // "HH:00"
      dir: string     // e.g. "SW"
      avgWind: number
      waveStr: string
    }

Imports in `HomeView.tsx` (no new ones needed):

    import { windColour } from '../utils/windColour'
    import { computeKiteableWindows, type KiteWindow } from '../utils/kiteableWindows'
    import type { Slot } from './ForecastDay'

---

## Interfaces and Dependencies

No new dependencies. New helpers added inside `HomeView.tsx`:

    const SAMPLE_HOURS = [6, 9, 12, 15, 18, 21]

    function MiniBarChart({ slots, yMax }: { slots: Slot[]; yMax?: number }): JSX.Element

    function SessionPill({ windows, peakWind }: { windows: KiteWindow[]; peakWind: number }): JSX.Element
