# Add AROME Model Comparison to Week View

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

After this change, users can toggle a second wind forecast row on the week view that shows AROME model data alongside the existing Harmonie forecast. This lets kitesurfers compare two independent NWP (Numerical Weather Prediction) models side by side. When the models agree, the user can plan with more confidence; when they diverge, the user knows to check back closer to the session.

The AROME row appears below the existing Harmonie wind tiles on each day card, labelled clearly so there is no ambiguity about which row is which. Both rows use the same colour-band logic. A single global toggle button on the week view controls visibility across all spots and days. AROME data is only available 4 days ahead, so days 5–7 silently show no AROME row.

To see it working: start the dev server (`cd frontend && npm run dev`), navigate to the week view, and click the "AROME" toggle button. Each day card (for the first 4 days) will grow a second labelled wind row below the Harmonie tiles.

## Progress

- [ ] Milestone 1: Backend — fetch AROME data and extend week.json
- [ ] Milestone 2: Frontend types — extend ForecastEntry and Slot to carry AROME fields
- [ ] Milestone 3: Frontend data flow — thread AROME values from WeekView through toSlots
- [ ] Milestone 4: ForecastDay — add labelled AROME row and showArome prop
- [ ] Milestone 5: WeekView — add global toggle and pass showArome down
- [ ] Milestone 6: Visual inspection and acceptance

## Surprises & Discoveries

(Fill in as work proceeds.)

## Decision Log

- Decision: Use Open-Meteo `meteofrance_arome_france_hd` model for AROME data.
  Rationale: Same API client and library already in use for Harmonie (`knmi_seamless`). No new dependency. Confirmed working via live API test — returns 96 hours (4 days) of data.
  Date/Author: 2026-04-16 / Milo

- Decision: Fetch only `wind_speed_10m` and `wind_gusts_10m` from AROME.
  Rationale: The comparison is wind-only. Temperature, rain, cloud, and wave data are not needed from a second model and would bloat week.json.
  Date/Author: 2026-04-16 / Milo

- Decision: Merge AROME fields (`aromeWindKn`, `aromeGustKn`) directly onto each hourly slot in week.json rather than a separate AROME array.
  Rationale: Keeps data co-located per hour. Frontend can check for presence of the fields and skip the AROME row if absent (days 5–7). No index-alignment bugs.
  Date/Author: 2026-04-16 / Milo

- Decision: Global toggle, state in WeekView, not per-day.
  Rationale: User explicitly requested a single toggle. Per-day toggle adds complexity with no stated need.
  Date/Author: 2026-04-16 / Milo

- Decision: AROME row uses the same windBand colour logic as Harmonie.
  Rationale: Consistent visual language. User should read AROME tiles the same way as Harmonie tiles.
  Date/Author: 2026-04-16 / Milo

## Outcomes & Retrospective

(Fill in at completion.)

## Context and Orientation

The app is a single-page React + TypeScript app (Vite) at `frontend/`. The week view shows 7-day forecast cards per spot. The backend (`backend/fetch_forecast.py`) is a Python script run as a GitHub Actions cron job. It fetches from Open-Meteo and writes JSON files to the `data` git branch. The frontend fetches those JSON files at runtime from GitHub raw content URLs.

Key files:

- `backend/fetch_forecast.py` — fetches Harmonie forecast per spot, writes `week.json` and `today.json`.
- `frontend/src/utils/forecast.ts` — defines `ForecastEntry` (the shape of each item in `week.json`'s `forecast` array) and the helper functions `groupByDay` and `toSlots` that convert raw JSON into the `Slot` type used by `ForecastDay`.
- `frontend/src/components/ForecastDay.tsx` — renders a single day card. Accepts `allSlots: Slot[]` and renders wind tiles, direction arrows, wave, temp, rain, tide, and kiteable-window banners. Has its own 1h/3h toggle (internal state). The `Slot` interface and `windBand` colour function are defined here.
- `frontend/src/components/WeekView.tsx` — renders all spots as collapsible rows. Each row fetches its own `week.json`, groups entries by day, converts to slots via `toSlots`, and renders a `ForecastDay` per day.

The wind tile colour-band function `windBand` in `ForecastDay.tsx` maps knots to one of five named bands (`tooLight`, `green1`–`green4`). The `COLORS` map translates band name to `bg` and `text` hex values. This same function will be reused for AROME tiles — no changes needed to windBand itself.

Open-Meteo terms: `knmi_seamless` is the Harmonie model ensemble used by KNMI (the Dutch meteorological institute). `meteofrance_arome_france_hd` is the high-resolution AROME model from Météo-France, covering western Europe including the Netherlands at ~1.3 km resolution. Both are available on the same `https://api.open-meteo.com/v1/forecast` endpoint. AROME has a shorter forecast horizon (96 hours / 4 days) vs Harmonie (7 days).

## Plan of Work

### Milestone 1 — Backend: fetch AROME and extend week.json

In `backend/fetch_forecast.py`, inside the `fetch_spot` function (around line 124), add a second `client.weather_api` call immediately after the existing wind forecast call. Use the same `lat`/`lon` and the same `hourly` fields (`wind_speed_10m`, `wind_direction_10m` is not needed, just `wind_speed_10m` and `wind_gusts_10m`), but set `"models": "meteofrance_arome_france_hd"` and `"forecast_days": 4`.

Extract the two AROME arrays from the response and build a lookup dict keyed by ISO timestamp string (same format as the Harmonie timestamps — `"%Y-%m-%dT%H:%M"` in Amsterdam time). Then, when building each `entry` dict in the hourly loop, look up that timestamp in the AROME dict and add `aromeWindKn` and `aromeGustKn` if present, omitting both fields if the timestamp is beyond the AROME horizon.

The existing `week.json` output structure does not change at the top level — only each slot dict inside the `forecast` array gains two optional fields.

Specifically, the new AROME fetch should look like this (add it right after the existing `wind_resp` call, before extracting arrays):

    arome_resp = client.weather_api("https://api.open-meteo.com/v1/forecast", params={
        "latitude": lat,
        "longitude": lon,
        "hourly": ["wind_speed_10m", "wind_gusts_10m"],
        "models": "meteofrance_arome_france_hd",
        "forecast_days": 4,
        "timezone": "Europe/Amsterdam",
    })[0]

Then extract the AROME arrays and build a lookup:

    ah = arome_resp.Hourly()
    arome_speeds = ah.Variables(0).ValuesAsNumpy()
    arome_gusts  = ah.Variables(1).ValuesAsNumpy()
    arome_start  = ah.Time()
    arome_interval = ah.Interval()
    arome_lookup: dict = {}
    for j in range(len(arome_speeds)):
        ts = datetime.fromtimestamp(arome_start + j * arome_interval, tz=timezone.utc).astimezone()
        key = ts.strftime("%Y-%m-%dT%H:%M")
        arome_lookup[key] = (
            round(float(arome_speeds[j]) * KMH_TO_KN, 1),
            round(float(arome_gusts[j])  * KMH_TO_KN, 1),
        )

Then in the per-hour loop where `entry` is built, after setting `entry["cloudPct"]`, add:

    if iso in arome_lookup:
        entry["aromeWindKn"] = arome_lookup[iso]["aromeWindKn"]  # see below
        entry["aromeGustKn"] = arome_lookup[iso]["aromeGustKn"]

Actually, since `arome_lookup[iso]` is a tuple, use:

    if iso in arome_lookup:
        entry["aromeWindKn"], entry["aromeGustKn"] = arome_lookup[iso]

Validation: run `python backend/fetch_forecast.py` from the repo root (with the venv active). Open `backend/output/ijmuiden/week.json`. The first 96 hourly entries should have `aromeWindKn` and `aromeGustKn` fields. Entries beyond hour 96 should not have those fields.

### Milestone 2 — Frontend types: extend ForecastEntry and Slot

In `frontend/src/utils/forecast.ts`, add two optional fields to `ForecastEntry`:

    aromeWindKn?: number
    aromeGustKn?: number

In `frontend/src/components/ForecastDay.tsx`, add two optional fields to the `Slot` interface:

    aromeWindKn?: number
    aromeGustKn?: number

No other changes in this milestone. TypeScript will now accept but not require these fields everywhere a `Slot` or `ForecastEntry` is used.

### Milestone 3 — Frontend data flow: thread AROME through toSlots

In `frontend/src/utils/forecast.ts`, update the `toSlots` function to pass through the two new optional fields:

    aromeWindKn: e.aromeWindKn,
    aromeGustKn:  e.aromeGustKn,

These will be `undefined` for days 5–7 (fields absent from JSON), which is the intended graceful degradation.

No changes needed to `WeekView.tsx` for data fetching — it already passes `toSlots(entries)` to `ForecastDay`. The AROME values flow through automatically once `toSlots` passes them.

### Milestone 4 — ForecastDay: add AROME row and showArome prop

In `frontend/src/components/ForecastDay.tsx`:

1. Add `showArome?: boolean` to `ForecastDayProps`.

2. Destructure it in the component function: `showArome = false`.

3. Determine whether any slot in the current day has AROME data:

        const hasArome = showArome && slots.some(s => s.aromeWindKn != null)

4. After the existing "Wind tiles" grid (the `<div>` with `{slots.map(...windBand...)}` that has `marginBottom: 2`), and before the "Sky conditions" grid, add the following when `hasArome` is true:

   First, a row label for Harmonie (insert it just before the wind tiles div, not after):

        {showArome && (
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 2 }}>
            Harmonie
          </div>
        )}

   Then, after the existing wind tiles grid, add the AROME label and row:

        {hasArome && (
          <>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: 4, marginBottom: 2 }}>
              AROME
            </div>
            <div style={{ ...gridStyle, marginBottom: 2, opacity: 0.85 }}>
              {slots.map((s) => {
                if (s.aromeWindKn == null) {
                  return <div key={s.hour} style={{ ...tileStyle, background: 'transparent', minHeight: compact ? 40 : 52 }} />
                }
                const band = windBand(s.aromeWindKn)
                const c = COLORS[band]
                return (
                  <div key={s.hour} style={{ ...tileStyle, background: c.bg, minHeight: compact ? 40 : 52, padding: compact ? '4px 1px' : '8px 2px' }}>
                    <span style={{ fontSize: compact ? 13 : 20, fontWeight: 500, lineHeight: 1.1, color: c.text }}>{s.aromeWindKn}</span>
                    <span style={{ fontSize: compact ? 9 : 11, color: ('gust' in c ? c.gust : undefined) || 'var(--text-tertiary)', marginTop: 1 }}>
                      G{s.aromeGustKn}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

   Note: `compact` is already defined above as `const compact = resolution === '1h'`. The AROME row reuses it. The slight `opacity: 0.85` on the AROME grid gives it a secondary visual weight without hiding it.

### Milestone 5 — WeekView: add global toggle and pass showArome

In `frontend/src/components/WeekView.tsx`:

1. Add `showArome` state to `WeekView`:

        const [showArome, setShowArome] = useState(false)

2. Pass `showArome` as a prop to `SpotWeekRow` and from there to each `ForecastDay`. Add `showArome: boolean` to `SpotWeekRow`'s props type. Inside `SpotWeekRow`, pass `showArome` to `<ForecastDay showArome={showArome} ... />`.

3. Add a toggle button to `WeekView`'s returned JSX, placed above the spot rows. Style it to match the existing 1h/3h toggle (`toggleStyle` in `ForecastDay.tsx`). Use the same inline style pattern (no shared style variable needed — just write it inline):

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <button
            onClick={() => setShowArome(v => !v)}
            style={{
              background: showArome ? 'var(--text-secondary)' : 'transparent',
              border: '1px solid var(--border)',
              borderRadius: 4,
              color: showArome ? 'var(--bg-surface)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 12,
              padding: '4px 12px',
              fontFamily: 'inherit',
            }}
          >
            AROME
          </button>
        </div>

   The button has an inverted filled style when active (showArome = true) so the user can see the toggle state at a glance.

## Concrete Steps

All commands are run from the repository root unless stated otherwise.

Step 1 — Edit the backend fetch script as described in Milestone 1. Then validate locally:

    source .venv/bin/activate
    python backend/fetch_forecast.py

Open `backend/output/ijmuiden/week.json` and confirm entries 0–95 have `aromeWindKn` and `aromeGustKn`, and entries 96+ do not.

Step 2 — Edit the frontend type files as described in Milestone 2. Then confirm TypeScript compiles:

    cd frontend && npx tsc --noEmit

Expect zero errors.

Step 3 — Edit `toSlots` in `forecast.ts` as described in Milestone 3. Re-run the type check.

Step 4 — Edit `ForecastDay.tsx` as described in Milestone 4. Re-run the type check.

Step 5 — Edit `WeekView.tsx` as described in Milestone 5. Re-run the type check. Then start the dev server:

    cd frontend && npm run dev

Navigate to `http://localhost:5173`, switch to the week view, and visually inspect.

Step 6 — Run lint:

    cd frontend && npm run lint

Fix any reported issues.

## Validation and Acceptance

Acceptance is visual — there are no automated tests in this project.

After completing all milestones and starting the dev server (`cd frontend && npm run dev`):

1. Open `http://localhost:5173` and go to the week view.
2. The AROME toggle button is visible in the top-right of the week view, above the spot rows.
3. Clicking it toggles a filled/outlined state (active vs inactive).
4. When active, each day card for days 1–4 shows two labelled rows of wind tiles: "HARMONIE" on top (unchanged from before) and "AROME" below, slightly muted (opacity 0.85), each tile using the green colour-band scheme.
5. Day cards for days 5–7 show no AROME row even when the toggle is on.
6. The 1h/3h toggle per day still works and applies to both the Harmonie and AROME rows simultaneously.
7. When the toggle is off, the day cards look exactly as they did before this change.
8. `npm run build` completes without TypeScript errors.

## Idempotence and Recovery

All changes are additive. The backend change adds fields to existing JSON output — the frontend degrades gracefully if the fields are absent (toggle on but no AROME data: no AROME row shown). Rolling back the frontend change leaves the backend output harmless (extra fields ignored). Rolling back the backend change means the frontend never shows an AROME row (fields absent), which is the same as having the toggle off.

## Artifacts and Notes

AROME API test result (run 2026-04-16):

    curl "https://api.open-meteo.com/v1/forecast?latitude=52.456281&longitude=4.559704
      &hourly=wind_speed_10m,wind_gusts_10m&models=meteofrance_arome_france_hd
      &forecast_days=4&timezone=Europe/Amsterdam"
    → 96 hours returned, no error field

## Interfaces and Dependencies

In `backend/fetch_forecast.py`, the `fetch_spot` function returns dicts. The `week` key's `forecast` list will now have entries shaped like:

    {
      "iso": "2026-04-16T09:00",
      "windKn": 22.3,
      "gustKn": 28.1,
      "dirDeg": 240,
      "waveM": 1.2,
      "wavePeriodS": 5.5,
      "tempC": 12.4,
      "rainMm": 0.0,
      "cloudPct": 60,
      "aromeWindKn": 20.8,   # present for hours 0–95 only
      "aromeGustKn": 26.4    # present for hours 0–95 only
    }

In `frontend/src/utils/forecast.ts`, `ForecastEntry` gains:

    aromeWindKn?: number
    aromeGustKn?: number

In `frontend/src/components/ForecastDay.tsx`, `Slot` gains:

    aromeWindKn?: number
    aromeGustKn?: number

`ForecastDayProps` gains:

    showArome?: boolean

In `frontend/src/components/WeekView.tsx`, `SpotWeekRow` props gain:

    showArome: boolean
