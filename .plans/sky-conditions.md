# Add Sky Condition Icons to Forecast

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

After this change, each ForecastDay card in the week view will show a row of sky-condition emoji (☀️ 🌤 ⛅ 🌥 ☁️) between the wind speed tiles and the direction arrows. A kitesurfer glancing at the forecast can immediately see whether the session will be sunny or overcast without reading numbers. The data comes from Open-Meteo's `cloud_cover` variable, which is already served by the same API call used for wind — it just needs to be requested and passed through.

## Progress

- [ ] Step 1 — Backend: add `cloud_cover` to the Open-Meteo hourly request and write `cloudPct` into each entry in `today.json` and `week.json`.
- [ ] Step 2 — Frontend utility: add `cloudPct` to `ForecastEntry` in `frontend/src/utils/forecast.ts` and thread it through `toSlots` into `Slot`.
- [ ] Step 3 — Frontend component: add `cloudPct` to the `Slot` interface, add the `skyEmoji` helper, and insert the icon row in `ForecastDay.tsx`.
- [ ] Step 4 — Visual verification: run the dev server and confirm the icon row renders correctly.

## Surprises & Discoveries

_(none yet)_

## Decision Log

- Decision: Use `cloud_cover` (0–100 %) rather than `weather_code` (WMO codes).
  Rationale: `cloud_cover` is a clean continuous number that maps directly to 5 visual bands. `weather_code` encodes precipitation type and intensity as well as cloud cover, which would require a lookup table and wouldn't add useful information beyond what the existing `rainMm` field already provides.
  Date/Author: 2026-04-16 / Milo (brainstorm session)

- Decision: 5 emoji bands (☀️ 🌤 ⛅ 🌥 ☁️) mapped from `cloud_cover` percentages.
  Rationale: 3 bands felt too coarse to show a day going from sunny morning to overcast afternoon; 5 bands match available emoji and stay glanceable.
  Date/Author: 2026-04-16 / Milo (brainstorm session)

- Decision: Emoji rather than inline SVG icons.
  Rationale: Zero implementation overhead, universally recognised, consistent with the app's minimal approach. The slight OS-level rendering variation is acceptable.
  Date/Author: 2026-04-16 / Milo (brainstorm session)

## Outcomes & Retrospective

_(fill in when complete)_

## Context and Orientation

The app is a single-page React + TypeScript app (Vite) in the `frontend/` directory. There are no automated tests — acceptance is visual inspection in the browser.

Data flows like this:

1. `backend/fetch_forecast.py` calls the Open-Meteo REST API once per hour and writes JSON files to `backend/output/<slug>/week.json` and `today.json`. These are then committed to the `data` orphan branch on GitHub and served as static files.
2. The frontend fetches those JSON files at runtime. `frontend/src/components/WeekView.tsx` fetches `week.json` for each spot.
3. The raw JSON entries are typed as `ForecastEntry` in `frontend/src/utils/forecast.ts`. The `toSlots` function there converts each `ForecastEntry` into a `Slot` (defined in `frontend/src/components/ForecastDay.tsx`).
4. `ForecastDay` receives an array of `Slot` objects and renders the grid: time labels → wind tiles → direction arrows → wave → temp → rain → tide curve → kiteable banners.

The sky icon row will be inserted between wind tiles and direction arrows. `cloudPct` must be added at every layer of this chain: API → JSON → `ForecastEntry` → `toSlots` → `Slot` → JSX row.

Key files:

- `backend/fetch_forecast.py` — the Python script that fetches from Open-Meteo and writes JSON. Run it with `source .venv/bin/activate && python backend/fetch_forecast.py` from the repo root.
- `frontend/src/utils/forecast.ts` — defines `ForecastEntry` and `toSlots`. Both must gain `cloudPct`.
- `frontend/src/components/ForecastDay.tsx` — defines `Slot` interface and renders the card. This is where the icon row is added.
- `frontend/src/components/WeekView.tsx` — fetches `week.json` and passes `toSlots(entries)` as `allSlots` to `ForecastDay`. No changes needed here; the new field flows through automatically once `toSlots` is updated.

## Plan of Work

**Step 1 — Backend**

In `backend/fetch_forecast.py`, the Open-Meteo `wind_resp` is fetched with a list of `hourly` variables. Add `"cloud_cover"` to that list. It is the 6th variable (index 5) in the response. Read it with `wh.Variables(5).ValuesAsNumpy()`.

In the loop that builds `entry` (the dict written to `hourly_all`), add:

    "cloudPct": round(float(cloud_cover[i])),

Do the same inside the `today_hourly.append({...})` block.

The existing `_safe` helper is not needed here — `cloud_cover` is always 0–100 with no NaN values in the KNMI seamless model — but using `round(float(...))` is sufficient.

After this change, running the script will produce JSON entries that include `"cloudPct": 42` (or whatever the actual value is).

**Step 2 — Frontend utility (`forecast.ts`)**

In `frontend/src/utils/forecast.ts`:

Add `cloudPct: number` to the `ForecastEntry` interface.

In `toSlots`, add `cloudPct: e.cloudPct` to the returned object literal.

**Step 3 — Frontend component (`ForecastDay.tsx`)**

In `frontend/src/components/ForecastDay.tsx`:

Add `cloudPct: number` to the `Slot` interface.

Add a small helper function near the top of the file (after the existing `windBand` function is a natural place):

    function skyEmoji(pct: number): string {
      if (pct <= 20) return '☀️'
      if (pct <= 40) return '🌤'
      if (pct <= 60) return '⛅'
      if (pct <= 80) return '🌥'
      return '☁️'
    }

In the JSX returned by `ForecastDay`, insert a new grid row immediately after the closing `</div>` of the wind tiles block and before the direction arrows block. It should look like:

    {/* Sky conditions */}
    <div style={gridStyle}>
      {slots.map((s) => (
        <div key={s.hour} style={{ textAlign: 'center', fontSize: resolution === '1h' ? 13 : 16, padding: '2px 0' }}>
          {skyEmoji(s.cloudPct)}
        </div>
      ))}
    </div>

The `gridStyle` variable is already computed from `colCount` and `resolution` earlier in the component, so this new row inherits the correct column count and gap automatically.

**Step 4 — Visual verification**

Start the Vite dev server (`npm run dev` from `frontend/`) and open http://localhost:5173 in a browser. Switch to the Week view and expand any spot. Each day card should show a row of sky emoji between the wind speed tiles and the direction arrows. Check that:

- The emoji change across time slots (a day with mixed cloud cover should show a variety of icons, not all the same).
- The row respects the 3h/1h toggle — in 3h mode only the six slots at 06, 09, 12, 15, 18, 21 are shown; in 1h mode all 24 slots are shown.
- On a narrow viewport / small card, the emoji do not overflow their grid cells.

If you do not yet have fresh JSON on the data branch (i.e., the backend hasn't run since `cloudPct` was added), you can test locally by running the backend script to regenerate `backend/output/<slug>/week.json` and temporarily pointing the frontend at the local files, or simply verify the UI renders the emoji row with placeholder data by temporarily hardcoding `cloudPct: 30` in `toSlots` during development and reverting afterwards.

## Concrete Steps

Run all commands from the repo root unless otherwise noted.

1. Edit `backend/fetch_forecast.py` as described in Plan of Work Step 1.

2. Optionally re-run the backend to produce fresh JSON with `cloudPct`:

        source .venv/bin/activate && python backend/fetch_forecast.py

   Expected output includes lines like:
        Fetching IJmuiden...
          today.json: 24 hourly entries
          week.json:  168 hourly entries

   Spot-check the output: `cat backend/output/ijmuiden/week.json | python3 -c "import json,sys; e=json.load(sys.stdin)['forecast'][0]; print(e)"` — you should see a `cloudPct` key with an integer value in the printed dict.

3. Edit `frontend/src/utils/forecast.ts` as described in Step 2.

4. Edit `frontend/src/components/ForecastDay.tsx` as described in Step 3.

5. Start the dev server:

        cd frontend && npm run dev

6. Open http://localhost:5173, switch to the Week view, and visually verify the sky icon row is present.

7. Run the TypeScript compiler to confirm no type errors:

        cd frontend && npm run build

   Expected: build completes with no errors. The `tsc` step will catch any mismatch between `ForecastEntry`, `Slot`, and the new field.

## Validation and Acceptance

The change is complete when:

- `npm run build` in `frontend/` completes without TypeScript errors.
- The Week view in the browser shows a row of sky emoji (☀️ 🌤 ⛅ 🌥 ☁️) for every day card, positioned between the wind tiles and direction arrows.
- The emoji row toggles correctly with the 1h/3h button.
- A spot-check of `week.json` confirms `cloudPct` is present as an integer on each hourly entry.

## Idempotence and Recovery

All edits are additive. If something goes wrong mid-way, the three files can each be reverted independently with `git checkout -- <file>`. The backend script can be re-run any number of times — it overwrites the output files in place.

## Artifacts and Notes

The five emoji bands and their thresholds, for reference:

    0–20%   ☀️  sunny
    21–40%  🌤  mostly sunny
    41–60%  ⛅  partly cloudy
    61–80%  🌥  mostly cloudy
    81–100% ☁️  overcast

## Interfaces and Dependencies

After completion, the following types must match:

In `backend/fetch_forecast.py`, each hourly entry dict must contain:

    { ..., "cloudPct": int }   # integer 0–100

In `frontend/src/utils/forecast.ts`:

    export interface ForecastEntry {
      ...
      cloudPct: number
    }

    // toSlots maps: cloudPct: e.cloudPct

In `frontend/src/components/ForecastDay.tsx`:

    export interface Slot {
      ...
      cloudPct: number
    }

    function skyEmoji(pct: number): string  // returns one of ☀️ 🌤 ⛅ 🌥 ☁️
