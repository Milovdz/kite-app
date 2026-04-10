# KiteWind — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-10  
**Status:** Current frontend baseline (pre-backend)

---

## 1. Product Overview

KiteWind is a single-page web app showing a kitesurf wind forecast for IJmuiden, Netherlands. It gives kiters a quick read on whether conditions are rideable today and across the coming week, presenting wind speed, gusts, direction, wave height, temperature, and precipitation in a compact, scannable layout.

The app currently runs entirely on static mock data. This document captures the complete frontend as built, to serve as the baseline for backend integration.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19.2.4 + TypeScript ~6.0.2 |
| Build tool | Vite 8.0.4 |
| Charting | Recharts 3.8.1 |
| Styling | CSS custom properties + inline styles (no framework) |
| Data | Static JSON files (no API) |
| Font | Inter (body), JetBrains Mono / Fira Code (numbers) |

---

## 3. Architecture

### Routing

No routing library. `App.tsx` holds a single `useState<'today' | 'week'>` that drives conditional rendering. There is no URL change on view switch.

```
App
├── NavBar          (fixed, always visible)
├── TodayView       (rendered when view === 'today')
└── WeekView        (rendered when view === 'week')
```

### File structure

```
frontend/src/
├── App.tsx
├── main.tsx
├── index.css
├── App.css              (empty)
├── components/
│   ├── NavBar.tsx
│   ├── TodayView.tsx
│   ├── WeekView.tsx
│   ├── ForecastDay.tsx
│   └── WindGraph.d.ts   (type definitions only)
├── data/
│   ├── today.json
│   └── week.json
└── utils/
    └── windColour.ts
```

Both views import their data directly via static `import` — no fetch calls.

---

## 4. Components

### 4.1 NavBar

**File:** `frontend/src/components/NavBar.tsx`

Fixed top bar (52 px height, `zIndex: 100`). Contains:
- App name "KiteWind" — teal, bold
- Location label "IJmuiden" — secondary text colour
- Two tab buttons: `today` and `week`

Active tab has a 2 px teal bottom border; inactive tabs have a transparent border. Colour transitions at 0.15 s.

```typescript
interface Props {
  view: 'today' | 'week'
  onSwitch: (v: 'today' | 'week') => void
}
```

### 4.2 TodayView

**File:** `frontend/src/components/TodayView.tsx`

Renders a single card for IJmuiden containing the `WindGraph` chart. The card is half-width (`flex: 0 0 calc(50% - 6px)`) and styled with `var(--bg-surface)`, `borderRadius: 12`, `border: 1px solid var(--border)`.

Passes the following to `WindGraph`:

```typescript
{
  spotName: string             // "IJmuiden"
  currentWind: number          // knots
  currentGust: number          // knots
  currentDirDeg?: number       // degrees
  threshold?: number           // 17 — rideable minimum
  yMax?: number                // 40
  forecastWind?: number[]      // 24 hourly values
  forecastGust?: number[]      // 24 hourly values
  actualWind?: (number | null)[]   // past hours populated, future null
  actualGust?: (number | null)[]
  nowIndex?: number            // new Date().getHours()
}
```

### 4.3 WindGraph

**File:** `frontend/src/components/WindGraph.d.ts` (type definition only; implementation is a compiled Recharts chart)

A 24-hour composed chart (area + line):
- Teal filled area → forecast wind
- Pink filled area → forecast gusts
- Teal solid line → actual wind (breaks at `null`)
- Pink solid line → actual gusts (breaks at `null`)
- Vertical dashed reference line at `nowIndex`
- X-axis: hours 0–23, labelled every 3 hours
- Y-axis: 0–`yMax` knots
- `ResponsiveContainer` (width 100%)

### 4.4 WeekView

**File:** `frontend/src/components/WeekView.tsx`

Horizontally scrollable row of day cards (`overflowX: auto`, `width: max-content`). Groups `week.json` forecast entries by date (YYYY-MM-DD), converts each `ForecastEntry` to a `Slot`, and passes each day's data to `ForecastDay`.

Day cards: `minWidth: 340`, `flexShrink: 0`, same card style as TodayView.

### 4.5 ForecastDay

**File:** `frontend/src/components/ForecastDay.tsx`

The main weekly forecast card. Has internal state for `resolution: '3h' | '1h'` (default `'3h'`).

**Props:**
```typescript
interface ForecastDayProps {
  date: string          // "YYYY-MM-DD"
  spotName?: string     // default "IJmuiden"
  allSlots: Slot[]      // up to 24 hourly entries
  tides?: TidePoint[]
  rideableMin?: number  // default 16 kn
  pumpingMin?: number   // default 22 kn
}

interface Slot {
  hour: number
  windKn: number
  gustKn: number
  dirDeg: number
  waveM: number
  tempC: number
  rainMm: number
}

interface TidePoint {
  time: string          // "HH:MM"
  heightM: number
  type: 'low' | 'high'
}
```

**Rows rendered (top to bottom):**

| Row | Content |
|---|---|
| Header | Day name, short date, spot name; toggle button (3h/1h) |
| Kiteable banner | Shown if any slot ≥ `rideableMin`. Format: `▸ Kiteable HH:MM – HH:MM · DIR AVG kn · WAVE`. Green banner (#d1fae5). |
| Period labels | 3h mode only: "morning" (06:00), "afternoon" (12:00), "evening" (18:00) |
| Time labels | Hour numbers (00–23, or 06/09/12/15/18/21 in 3h mode) |
| Wind tiles | Coloured by wind band; shows speed + `G{gust}` |
| Direction arrows | SVG arrows rotated by wind direction; 18 px (3h) or 12 px (1h) |
| Wave | Label + value in metres |
| Temp | Label + value in °C (rounded to integer) |
| Rain | Label + value in mm, with blue dot indicator; hidden when 0 |
| Tide curve | SVG Bézier curve from `TidePoint[]`; blue stroke #0369a1, 60% opacity; labels at extrema |

**Wind band thresholds and colours:**

| Band | Condition | Background | Text |
|---|---|---|---|
| `tooLight` | < 10 kn | `var(--bg-muted)` #f1f5f9 | `var(--text-primary)` |
| `light` | 10–15 kn | #d1fae5 | #065f46 |
| `rideable` | 16–21 kn | #6ee7b7 | #064e3b |
| `pumping` | 22–28 kn | #10b981 | #ffffff |
| `strong` | ≥ 29 kn | #047857 | #ffffff |

---

## 5. Data Schemas

### 5.1 today.json

```typescript
{
  spot: string              // "IJmuiden"
  current: {
    speed: number           // current wind (kn)
    gusts: number           // current gusts (kn)
    direction: number       // degrees
  }
  hourly: Array<{
    hour: number            // 0–23
    forecastSpeed: number   // kn
    forecastGusts: number   // kn
    direction: number       // degrees
    actualSpeed: number | null   // populated for past hours, null for future
    actualGusts: number | null
  }>
}
```

Sample values: current 24 kn, gusts 31 kn, direction 225°. Actual values populated for hours 0–14; null from hour 15 onwards.

### 5.2 week.json

```typescript
{
  spot: string
  forecast: Array<{
    iso: string          // "YYYY-MM-DDTHH:MM"
    speed: number        // kn
    gusts: number        // kn
    direction: number    // degrees 0–360
    waveHeight: number   // metres
    wavePeriod: number   // seconds
    tempC: number        // Celsius
    precipMm: number     // mm/hour
  }>
}
```

168 entries (7 days × 24 hours). Sample ranges: wind 6–31 kn, gusts 9–35 kn, waves 0.3–1.9 m, periods 5–8 s, temps 8.8–15.0 °C, precip 0–1.0 mm.

---

## 6. Utility Functions

### windColour (frontend/src/utils/windColour.ts)

```typescript
export function windColour(knots: number): string
```

Returns a hex colour string using linear interpolation within each wind band:

| Wind (kn) | Dark → Light |
|---|---|
| < 15 | #4a4a4a → #6b6b6b (grey) |
| 15–20 | #b8860b → #ffd700 (goldenrod → gold) |
| 21–25 | #cc5500 → #ff8c00 (dark orange → orange) |
| 26–32 | #8b0000 → #dc143c (dark red → crimson) |
| 33–45+ | #4b0082 → #800080 (indigo → purple) |

Note: these bands are used by `WindGraph`. `ForecastDay` uses its own `COLORS` map keyed to the `windBand` function (separate colour scheme, green-based).

---

## 7. Styling & Design System

### CSS custom properties (index.css)

Currently a light theme:

```css
:root {
  --bg:             #f0f4f8;   /* page background */
  --bg-surface:     #ffffff;   /* card / nav background */
  --text-primary:   #1a2332;
  --text-secondary: #64748b;
  --border:         #dde3ea;
  --teal:           #0d9488;   /* primary accent, active tabs */
  --pink:           #db2777;   /* gusts accent */
  --now-line:       #1a2332;   /* "now" reference line */
}
```

Additional tokens used inline in ForecastDay:

```css
--bg-muted:    #f1f5f9;   /* tooLight wind tile */
--text-tertiary: #94a3b8; /* labels, period names */
--tide-accent: #0369a1;   /* tide high/low labels */
```

### Typography

```css
body { font-family: 'Inter', system-ui, sans-serif; }
.mono { font-variant-numeric: tabular-nums; font-family: 'JetBrains Mono', 'Fira Code', monospace; }
```

### Layout

- Main content: `marginTop: 52px`, `padding: 1.5rem`
- Day cards: `minWidth: 340px`, `borderRadius: 12`, `padding: 12px 14px`
- Card grid: CSS grid with `repeat(N, 1fr)`, gap 2 px (1h) or 3 px (3h)
- Desktop-first; day cards scroll horizontally on narrow screens

---

## 8. Current Limitations (Mock / Stubbed)

| Area | Current state | What's needed for backend |
|---|---|---|
| Wind data | Static `today.json` + `week.json` | Replace with API response |
| Tide data | Not present in JSON; `TidePoint[]` prop defaults to `[]` | Real tidal data source (e.g. Rijkswaterstaat) |
| Spot | Hardcoded "IJmuiden" | Spot switcher / parameterisation |
| `actualSpeed` | Mock values for hours 0–14 | Real observed data from KNMI or similar |
| Wave height / period | Present in week data only | Add to today data if needed |
| Refresh / staleness | No refresh logic | Polling or cache-bust strategy |
| Error states | None | Loading / error UI |

---

## 9. Data Source (Python Fetcher)

A Python script at `.claude/skills/fetch-wind-data/scripts/fetch_wind.py` calls the Open-Meteo KNMI Seamless API for IJmuiden (52.482630, 4.581581) with a 1-hour SQLite cache. It currently produces mock data and will become the backend data pipeline.

Run:
```bash
source .venv/bin/activate && python .claude/skills/fetch-wind-data/scripts/fetch_wind.py
```
