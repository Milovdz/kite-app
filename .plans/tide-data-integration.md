# Integrate Real Tide Data for the Forecast View

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

Right now every day in the week forecast shows the same four hardcoded tide times ("01:18 H", "07:32 L", "13:45 H", "19:58 L"). After this change, each day card will display the actual predicted high- and low-water times and heights for IJmuiden, computed from published harmonic constituents using `pytides`. A visitor opening the app on any day will see a tide curve that reflects the real astronomical tide for that specific day.

## Progress

- [x] Investigate Waterinfo and other APIs
- [x] Add `pytides` to `backend/requirements-forecast.txt`
- [x] Add `compute_tides()` to `backend/fetch_forecast.py` using pytides + IJmuiden IHO constituents
- [x] Extend the `week.json` output to include a `tidesByDate` dict of per-day tidal extrema
- [x] Remove `MOCK_TIDES` from `frontend/src/components/WeekView.tsx`
- [x] Update `WeekView` to read `tidesByDate` from `week.json` and pass the correct day's tides to each `ForecastDay`
- [ ] Visual acceptance: open the app and confirm each day shows its own distinct tide curve with real heights

## Surprises & Discoveries

- The Rijkswaterstaat Waterinfo API (`waterinfo.rws.nl/api/chart/get`) returns HTTP 500 for all parameter combinations tested. The API is non-functional for programmatic use.
- The RWS DDL API (`waterwebservices.rijkswaterstaat.nl`) returned HTTP 503 Service Unavailable.
- Open-Meteo marine API does not include tidal height as a variable.
- WorldTides is a working alternative but requires an API key.
- `pytides` (pure Python, no external API) implements harmonic tidal prediction from IHO constituent tables. IJmuiden's constituents are publicly available and stable for decades. This is the gold-standard method — the same maths Waterinfo uses internally.

## Decision Log

- Decision: Use `pytides` with hardcoded IJmuiden IHO harmonic constituents instead of any external tide API.
  Rationale: All tested Dutch tide APIs are unreliable or non-functional. WorldTides requires an API key. Harmonic prediction is deterministic, offline, free, and accurate to within a few centimetres for a published gauge location.
  Date/Author: 2026-04-10

- Decision: Store only tidal extrema (high/low) in `week.json`, not the full hourly series.
  Rationale: The frontend `TideCurve` component takes `TidePoint[]` of extrema and renders a Bézier interpolation between them. Extrema-only keeps the JSON compact and matches the existing interface. Extrema are found by scanning the `pytides` hourly output for local maxima/minima.
  Date/Author: 2026-04-10

- Decision: Compute tides inside `fetch_forecast.py` rather than a separate script.
  Rationale: Pure computation — no network call. Belongs in the same script that produces `week.json`. No changes needed to GitHub Actions workflows.
  Date/Author: 2026-04-10

## Outcomes & Retrospective

_(fill in at completion)_

---

## Context and Orientation

### Repository layout

    backend/fetch_forecast.py              — Python cron script that writes today.json + week.json
    backend/requirements-forecast.txt      — pip requirements for the forecast cron
    backend/output/ijmuiden/week.json      — live output consumed by the frontend
    frontend/src/components/WeekView.tsx   — fetches week.json, groups data by day, passes props to ForecastDay
    frontend/src/components/ForecastDay.tsx — renders a single day card including the TideCurve component

### Current state of tide data

`backend/fetch_forecast.py` fetches wind and wave data from Open-Meteo but does **not** compute any tide data. `week.json` has no tide fields.

`frontend/src/components/WeekView.tsx` has a hardcoded `MOCK_TIDES` constant (lines 17-23) passed to every `ForecastDay`, so all seven days show the same tide.

The `TidePoint` interface is defined in `ForecastDay.tsx`:

    export interface TidePoint {
      time: string      // "HH:MM"
      heightM: number
      type: 'low' | 'high'
    }

The `TideCurve` component takes a `TidePoint[]`, draws an SVG Bézier curve, and labels each extremum. It renders nothing if the array is empty.

### pytides and IJmuiden constituents

`pytides` is installed (`pip install pytides`). It implements harmonic tidal prediction via `pytides.tide.Tide`.

IJmuiden (IJMH) IHO harmonic constituents (amplitude in metres, phase in degrees relative to GMT, referenced to NAP):

| Constituent | Amplitude (m) | Phase (°) |
|-------------|--------------|-----------|
| M2          | 0.726        | 114.0     |
| S2          | 0.176        | 152.0     |
| N2          | 0.139        | 97.0      |
| K2          | 0.048        | 152.0     |
| K1          | 0.077        | 210.0     |
| O1          | 0.027        | 178.0     |
| P1          | 0.025        | 210.0     |
| Q1          | 0.006        | 161.0     |
| Mf          | 0.012        | 0.0       |
| Mm          | 0.007        | 0.0       |
| Ssa         | 0.047        | 0.0       |

---

## Plan of Work

### Step 1 — Backend: add `compute_tides()` to `fetch_forecast.py`

Add a function that:

1. Builds a `pytides.tide.Tide` from the IJmuiden constituents above.
2. For each of the 7 forecast days, generates hourly heights (24 points) using `tide.at(times)`.
3. Scans the hourly series for local maxima/minima to find extrema.
4. Returns a dict keyed by date string:

       {
         "2026-04-10": [
           {"time": "03:26", "heightM": -0.09, "type": "low"},
           {"time": "09:45", "heightM": 1.45, "type": "high"},
           ...
         ],
         ...
       }

5. Converts timestamps to "Europe/Amsterdam" local time for the `"HH:MM"` field.

Wire it into `fetch_spot()` and attach as `tidesByDate` in the `week` output.

Add `pytides` to `backend/requirements-forecast.txt`.

### Step 2 — Frontend: update `WeekView.tsx`

1. Remove `MOCK_TIDES`.
2. Add `tidesByDate?: Record<string, TidePoint[]>` to the `WeekData` state type.
3. Look up `weekData.tidesByDate?.[dateKey] ?? []` per day card.

No changes to `ForecastDay.tsx` or `TideCurve` — they already handle real extrema correctly.

---

## Validation and Acceptance

1. `python fetch_forecast.py` exits cleanly; `week.json` contains a `tidesByDate` key with 7 date entries.
2. Each date entry has 4–5 extrema with alternating high/low, heights in range −0.2 m to 2.2 m.
3. In the browser (Week view), each of the 7 day cards shows a distinct tide curve.
4. `npm run lint` passes with no errors.
