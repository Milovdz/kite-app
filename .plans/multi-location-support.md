# Multi-location support: 4 kitesurf spots

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

After this change, the app shows wind forecasts for four Dutch kitesurf spots instead of one. On the **Today view** the user sees a 2×2 grid of spot summaries simultaneously. On the **7-day view** each spot has a collapsible row of day-cards; spots can be independently expanded so one or more rows are visible side-by-side for comparison. The NavBar gains a location selector.

The four spots and their coordinates:

- **IJmuiden** — 52.456281, 4.559704  (slug: `ijmuiden`)
- **Wijk aan Zee** — 52.482630, 4.581581  (slug: `wijk-aan-zee`)
- **Schellinkhout** — 52.633241, 5.121027  (slug: `schellinkhout`)
- **Kijkduin** — 52.052664, 4.195335  (slug: `kijkduin`)

## Progress

**Phase 1 — Core multi-location (IJmuiden tide model reused for all spots)**
- [x] Milestone 1 — Backend: update SPOTS array; use IJmuiden tide model as placeholder for all spots
- [x] Milestone 2 — Backend: update fetch_actuals.py with per-spot KNMI station IDs
- [x] Milestone 3 — GitHub Actions: loop over all active spots
- [x] Milestone 4 — Data branch: create directories and seed initial JSON
- [ ] Milestone 5 — Frontend: update config.ts and add location constants
- [ ] Milestone 6 — Frontend: Today view → 2×2 grid
- [ ] Milestone 7 — Frontend: WeekView → collapsible per-spot rows
- [ ] Milestone 8 — Frontend: NavBar cleanup
- [ ] Milestone 9 — Verification and deploy (Phase 1)

**Phase 2 — Exact tides per spot (follow-up)**
- [ ] Milestone 10 — Fetch Hoek van Holland constituents via `hatyan`; wire per-slug tide models; disable tides for Schellinkhout

## Surprises & Discoveries

- Schellinkhout is on the Markermeer, a closed inland lake with no astronomical tides (isolated from the North Sea since 1932 by the Afsluitdijk + Houtribdijk). Tidal harmonic analysis is not applicable there.
- Hoek van Holland has a documented double-low-water anomaly at spring tides; its pytides constituents are not publicly listed in a machine-readable format.
- Wijk aan Zee is only ~2.8 km from IJmuiden — the same KNMI station (06225) and the same tidal harmonic constants apply.
- The existing `fetch_forecast.py` already has a `SPOTS` array with inactive entries but wrong coordinates — those need replacing with the user's exact values.

## Decision Log

- Decision: Use IJmuiden tidal harmonic constants for Wijk aan Zee.
  Rationale: The spots are 2.8 km apart; tidal difference is negligible.
  Date/Author: 2026-04-10 / planning

- Decision: Phase 1 reuses IJmuiden tidal harmonic constants for all spots; exact per-spot tides are Phase 2.
  Rationale: Getting the multi-location UI and data pipeline working first is higher priority. Tide accuracy for non-IJmuiden spots is deferred to Phase 2 once the core is verified.
  Date/Author: 2026-04-10 / planning

- Decision: Hide tide curve for Schellinkhout (Phase 2).
  Rationale: The Markermeer has no astronomical tide; displaying a wave computed from North Sea harmonics would be meaningless and misleading.
  Date/Author: 2026-04-10 / planning

- Decision: Source Hoek van Holland tidal harmonic constants via the Rijkswaterstaat `getij.rws.nl` API or the Deltares `hatyan` Python library rather than hardcoding a best-guess table (Phase 2).
  Rationale: Hoek van Holland has a complex double-low-water anomaly; inaccurate constants would mislead users. The `hatyan` library (pip-installable, MIT licence) can fetch the official RWS constituent table directly for any Dutch tidal station.
  Date/Author: 2026-04-10 / planning

- Decision: Wijk aan Zee uses IJmuiden KNMI station (06225); Schellinkhout uses De Kooy (06235, Den Helder, ~25-30 km away, best available); Kijkduin uses Hoek van Holland (06290, ~5-10 km away).
  Rationale: These are the nearest KNMI 10-minute observation stations with wind data. Distances noted so a future contributor can reassess.
  Date/Author: 2026-04-10 / planning

- Decision: Today view shows a 2×2 grid of four spot summaries simultaneously, not a single-selected-spot view.
  Rationale: User explicitly requested all four locations visible at once.
  Date/Author: 2026-04-10 / planning

- Decision: 7-day view shows four collapsible accordion rows, each with the same day-card strip as today's WeekView. All four start expanded by default; the user can collapse any to compare.
  Rationale: User requested expandable/collapsible rows for comparing spots.
  Date/Author: 2026-04-10 / planning

## Outcomes & Retrospective

_(to be filled in after implementation)_

---

## Context and Orientation

The repo lives at `/Users/milovanderzanden/Desktop/kite-app`. Key areas:

**Backend** (`backend/`):
- `fetch_forecast.py` — hourly cron. Fetches Open-Meteo wind + marine forecasts and computes tidal extrema via `pytides`. Writes `output/{slug}/today.json` and `output/{slug}/week.json`. Already has an inactive `SPOTS` list with old/wrong coordinates.
- `fetch_actuals.py` — 15-min cron. Fetches 10-minute wind observations from the KNMI EDR API for one hardcoded station. Writes `output/{slug}/current.json`. The `spot` parameter is accepted but the station ID is never derived from it — always reads the hardcoded `STATION_ID = "0-20000-0-06225"`.

**Frontend** (`frontend/src/`):
- `config.ts` — exports `DATA_BASE_URL` pointing to a single location subdirectory on the `data` branch.
- `App.tsx` — owns `view` state (`'today'|'week'`), renders `<NavBar>` + the active view.
- `components/NavBar.tsx` — hardcodes the string "IJmuiden" as the location label.
- `components/TodayView.tsx` — fetches `DATA_BASE_URL/today.json` + `DATA_BASE_URL/current.json` and renders a single spot's wind graph.
- `components/WeekView.tsx` — fetches `DATA_BASE_URL/week.json` and renders a horizontal scrollable strip of `<ForecastDay>` cards.
- `components/ForecastDay.tsx` — renders one day card. Defaults `spotName='IJmuiden'`.

**GitHub Actions** (`.github/workflows/`):
- `fetch-forecast.yml` — hardcoded copy commands referencing `ijmuiden/` only.
- `fetch-current.yml` — same, hardcoded to `ijmuiden/`.

**Data branch** (`data` branch, orphan — never merge or rebase):
- Currently contains `ijmuiden/today.json`, `ijmuiden/week.json`, `ijmuiden/current.json`.
- New directories needed: `wijk-aan-zee/`, `schellinkhout/`, `kijkduin/`.

**Tidal harmonic model**:
- `fetch_forecast.py` hard-codes `_IJMUIDEN_CONSTITUENTS` (11 constituents, amplitude in metres, phase in degrees UTC). The function `_get_tide_model()` builds a global `pytides.Tide` object from these constants. `compute_tides(start_date, days)` uses it to find daily high/low extrema.
- For Hoek van Holland, the plan uses the Deltares `hatyan` library to fetch official RWS constituents at runtime (or once and embed them). The `hatyan` library is pip-installable and queries the same data that `getij.rws.nl` uses.

---

## Plan of Work

### Milestone 1 — Backend: update SPOTS array; reuse IJmuiden tide model for all spots (Phase 1 placeholder)

**File:** `backend/fetch_forecast.py`

1. Replace the `SPOTS` list with the four active spots using the user's exact coordinates:

        SPOTS = [
            {"slug": "ijmuiden",     "name": "IJmuiden",     "lat": 52.456281, "lon": 4.559704, "active": True},
            {"slug": "wijk-aan-zee", "name": "Wijk aan Zee", "lat": 52.482630, "lon": 4.581581, "active": True},
            {"slug": "schellinkhout","name": "Schellinkhout","lat": 52.633241, "lon": 5.121027, "active": True},
            {"slug": "kijkduin",     "name": "Kijkduin",     "lat": 52.052664, "lon": 4.195335, "active": True},
        ]

2. The existing `_get_tide_model()` and `compute_tides()` functions are left unchanged for now — all four spots will use the IJmuiden harmonic constants as a Phase 1 placeholder. Exact per-spot tides are addressed in Phase 2 (Milestone 10).

3. In `fetch_spot(client, spot)`, ensure `compute_tides` is called once per spot as it already is — no change needed to the call site.

**Acceptance (Milestone 1):** Run `python backend/fetch_forecast.py` locally (with `.venv` active). Confirm four subdirectories appear in `backend/output/`, each containing `today.json` and `week.json`.

---

### Milestone 2 — Backend: per-spot KNMI station IDs in fetch_actuals.py

**File:** `backend/fetch_actuals.py`

The KNMI station assignments are:

| Spot slug      | Station ID           | Station name         | Distance |
|----------------|----------------------|----------------------|----------|
| ijmuiden       | 0-20000-0-06225      | IJmuiden WP          | 0 km     |
| wijk-aan-zee   | 0-20000-0-06225      | IJmuiden WP          | 2.8 km   |
| schellinkhout  | 0-20000-0-06235      | De Kooy (Den Helder) | ~28 km   |
| kijkduin       | 0-20000-0-06290      | Hoek van Holland     | ~8 km    |

1. Add a `station_id` key to each entry in `SPOTS`:

        SPOTS = [
            {"slug": "ijmuiden",     "name": "IJmuiden",     "lat": 52.456281, "lon": 4.559704, "active": True,  "station_id": "0-20000-0-06225"},
            {"slug": "wijk-aan-zee", "name": "Wijk aan Zee", "lat": 52.482630, "lon": 4.581581, "active": True,  "station_id": "0-20000-0-06225"},
            {"slug": "schellinkhout","name": "Schellinkhout","lat": 52.633241, "lon": 5.121027, "active": True,  "station_id": "0-20000-0-06235"},
            {"slug": "kijkduin",     "name": "Kijkduin",     "lat": 52.052664, "lon": 4.195335, "active": True,  "station_id": "0-20000-0-06290"},
        ]

2. Remove the module-level constant `STATION_ID = "0-20000-0-06225"`.

3. In `fetch_actuals(api_key, spot)`, replace the hardcoded `STATION_ID` with `spot["station_id"]`. The URL construction becomes:

        url = f"{EDR_BASE}/locations/{spot['station_id']}"

4. Keep the `PARAMETERS = "ff,dd,gff"` constant unchanged — all four stations expose these parameters.

**Acceptance (Milestone 2):** Run `EDR_API_KEY=... python backend/fetch_actuals.py`. Confirm four `current.json` files are written, one per slug. Spot-check that `schellinkhout/current.json` contains `"spot": "Schellinkhout"` and non-null wind values (De Kooy is a real station).

---

### Milestone 3 — GitHub Actions: loop over all active spots

**Files:** `.github/workflows/fetch-forecast.yml` and `.github/workflows/fetch-current.yml`

Replace the hardcoded `cp` and `git add` commands with a bash loop over slugs. The data branch must already have the subdirectories (Milestone 4); the `cp` commands use `mkdir -p` as a guard.

In `fetch-forecast.yml`, replace the "Copy output to data branch" and "Commit and push" steps with:

    - name: Copy output to data branch
      run: |
        for slug in ijmuiden wijk-aan-zee schellinkhout kijkduin; do
          mkdir -p data-branch/$slug
          cp source/backend/output/$slug/today.json data-branch/$slug/today.json
          cp source/backend/output/$slug/week.json  data-branch/$slug/week.json
        done

    - name: Commit and push
      working-directory: data-branch
      run: |
        git config user.name "github-actions[bot]"
        git config user.email "github-actions[bot]@users.noreply.github.com"
        git add ijmuiden/ wijk-aan-zee/ schellinkhout/ kijkduin/
        git diff --cached --quiet || git commit -m "forecast update $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        git push origin data

In `fetch-current.yml`, apply the same pattern for `current.json`:

    - name: Copy output to data branch
      run: |
        for slug in ijmuiden wijk-aan-zee schellinkhout kijkduin; do
          mkdir -p data-branch/$slug
          cp source/backend/output/$slug/current.json data-branch/$slug/current.json
        done

    - name: Commit and push
      working-directory: data-branch
      run: |
        git config user.name "github-actions[bot]"
        git config user.email "github-actions[bot]@users.noreply.github.com"
        git add ijmuiden/ wijk-aan-zee/ schellinkhout/ kijkduin/
        git diff --cached --quiet || git commit -m "current update $(date -u +%Y-%m-%dT%H:%M:%SZ)"
        git push origin data

**Acceptance (Milestone 3):** Trigger both workflows manually via the GitHub Actions UI ("workflow_dispatch"). Confirm all four slug subdirectories exist in the `data` branch afterwards.

---

### Milestone 4 — Data branch: create directories and seed initial JSON

The `data` branch is an orphan branch (no shared history). To create the new subdirectories:

    git checkout data
    mkdir -p wijk-aan-zee schellinkhout kijkduin
    # Copy the existing ijmuiden JSON as placeholder seeds (will be overwritten by cron)
    cp ijmuiden/today.json wijk-aan-zee/today.json
    cp ijmuiden/week.json  wijk-aan-zee/week.json
    cp ijmuiden/current.json wijk-aan-zee/current.json
    cp ijmuiden/today.json schellinkhout/today.json
    cp ijmuiden/week.json  schellinkhout/week.json
    cp ijmuiden/current.json schellinkhout/current.json
    cp ijmuiden/today.json kijkduin/today.json
    cp ijmuiden/week.json  kijkduin/week.json
    cp ijmuiden/current.json kijkduin/current.json
    git add wijk-aan-zee/ schellinkhout/ kijkduin/
    git commit -m "add multi-location directories"
    git push origin data
    git checkout master

After the cron jobs run (Milestone 3), the seeded placeholders will be replaced with real data.

**Acceptance (Milestone 4):** All four directories exist in the `data` branch and each contains `today.json`, `week.json`, `current.json`.

---

### Milestone 5 — Frontend: location constants in config.ts

**File:** `frontend/src/config.ts`

Replace the single `DATA_BASE_URL` export with a `SPOTS` array and a helper function:

    export const DATA_BASE_URL_FOR = (slug: string) =>
      `https://raw.githubusercontent.com/Milovdz/kite-app/data/${slug}`

    export const SPOTS = [
      { slug: 'ijmuiden',      name: 'IJmuiden'      },
      { slug: 'wijk-aan-zee',  name: 'Wijk aan Zee'  },
      { slug: 'schellinkhout', name: 'Schellinkhout' },
      { slug: 'kijkduin',      name: 'Kijkduin'      },
    ] as const

    export type SpotSlug = typeof SPOTS[number]['slug']

    export const APP_TZ = 'Europe/Amsterdam'

Update any remaining `DATA_BASE_URL` import in `TodayView.tsx` and `WeekView.tsx` to use `DATA_BASE_URL_FOR(slug)`.

---

### Milestone 6 — Frontend: Today view → 2×2 grid

The Today view currently shows a single spot. The new design fetches all four spots in parallel and renders them in a 2×2 grid.

**Strategy:** Extract a `SpotTodayCard` component (in `components/SpotTodayCard.tsx`, or inline in `TodayView.tsx`) that accepts a `slug` and `name` prop and handles its own fetch + render of `today.json` + `current.json`. `TodayView` renders four of these in a CSS grid.

**In `TodayView.tsx`:**

1. Remove the existing single-spot fetch and state.
2. Render a 2×2 grid:

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          {SPOTS.map(s => <SpotTodayCard key={s.slug} slug={s.slug} name={s.name} />)}
        </div>

3. Create `SpotTodayCard` (either in the same file or extracted):
   - Fetches `DATA_BASE_URL_FOR(slug)/today.json` and `DATA_BASE_URL_FOR(slug)/current.json` in a single `useEffect`.
   - Shows a loading/error state per card independently.
   - Renders the same wind graph (`<WindGraph>`) and current-conditions block that the existing `TodayView` uses, but scoped to one spot.
   - Shows the spot name as a card heading.

The WindGraph component and existing data-shaping logic can be reused unchanged.

**Acceptance (Milestone 6):** `npm run dev` — the Today page shows four wind-graph cards in a 2×2 layout, each loading and displaying independently.

---

### Milestone 7 — Frontend: WeekView → collapsible per-spot accordion

**File:** `frontend/src/components/WeekView.tsx`

Current behaviour: fetches one `week.json` and renders a scrollable strip of `<ForecastDay>` cards.

New behaviour: renders four accordion rows, each identified by spot name. Each row has a toggle chevron. When expanded, it shows the same horizontal day-card strip. All four start expanded.

1. Add local state: `const [expanded, setExpanded] = useState<Set<SpotSlug>>(new Set(SPOTS.map(s => s.slug)))`.

2. Extract a `SpotWeekRow` component (inline or separate file) that:
   - Accepts `slug`, `name`, `isExpanded`, `onToggle` props.
   - Fetches `DATA_BASE_URL_FOR(slug)/week.json` independently.
   - Renders a header bar with the spot name, a chevron button, and (when `isExpanded`) the horizontal scroll strip of `<ForecastDay>` cards.

3. `WeekView` renders:

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {SPOTS.map(s => (
            <SpotWeekRow
              key={s.slug}
              slug={s.slug}
              name={s.name}
              isExpanded={expanded.has(s.slug)}
              onToggle={() => setExpanded(prev => {
                const next = new Set(prev)
                next.has(s.slug) ? next.delete(s.slug) : next.add(s.slug)
                return next
              })}
            />
          ))}
        </div>

**Acceptance (Milestone 7):** 7-day view shows four rows, each with a spot name header and collapsible day-card strip. Collapsing one row does not affect others. When two rows are expanded, their day cards are visually comparable.

---

### Milestone 8 — Frontend: NavBar cleanup

**File:** `frontend/src/components/NavBar.tsx`

Remove the hardcoded `<span>IJmuiden</span>` label — it no longer makes sense when the app shows all four spots. Keep the KiteWind logo and Today / 7 Days tab buttons unchanged.

The NavBar `Props` interface and signature do not need to change.

**Acceptance (Milestone 8):** NavBar shows "KiteWind | Today | 7 Days" with no location name.

---

### Milestone 9 — Verification and deploy (Phase 1)

1. Run `npm run build` from `frontend/` — must complete with no TypeScript errors.
2. Run `npm run lint` — must pass.
3. Run `npm run preview` and visually inspect:
   - Today view: 2×2 grid of four spot wind-graph cards, each with a spot name heading.
   - 7-day view: four accordion rows, all expanded by default. Toggle one collapsed, confirm others remain expanded. Expand again and compare two rows visually.
   - NavBar: no location label, just KiteWind logo + Today / 7 Days tabs.
4. Trigger the GitHub Actions workflows manually to confirm all four spots produce valid JSON on the `data` branch.
5. Push to `master` — Vercel deployment at https://kite-app-three.vercel.app updates automatically.

---

### Milestone 10 — Exact tides per spot (Phase 2)

**File:** `backend/fetch_forecast.py`

This milestone upgrades the tide model from a single IJmuiden placeholder to per-spot harmonic constants, and disables tides entirely for Schellinkhout (Markermeer has no astronomical tide).

1. **Fetch Hoek van Holland constants (run once locally):**

   Install hatyan: `pip install hatyan`

   Run this snippet in a Python REPL:

        import hatyan
        station = hatyan.read_components("HOEKVHLD", tidal_database="RWS")
        print(station)

   This prints constituent names, amplitudes (metres, NAP-referenced), and phases (degrees). Translate into the `(name, amp, phase)` tuple format of `_IJMUIDEN_CONSTITUENTS` and embed as `_KIJKDUIN_CONSTITUENTS` in `fetch_forecast.py`.

   If the `hatyan` API has changed, the equivalent data is available from `getij.rws.nl/api/v1/waterinfo/getijstation/HOEKVHLD/components` (unofficial JSON endpoint used by the RWS website).

2. **Refactor `_get_tide_model()` into `_get_tide_model_for(slug)`:**

        _TIDE_MODELS: dict = {}

        def _get_tide_model_for(slug: str):
            if slug in _TIDE_MODELS:
                return _TIDE_MODELS[slug]
            if slug in ("ijmuiden", "wijk-aan-zee"):
                raw = _IJMUIDEN_CONSTITUENTS
            elif slug == "kijkduin":
                raw = _KIJKDUIN_CONSTITUENTS
            else:
                return None   # Schellinkhout: Markermeer has no astronomical tide
            constituent_map = {c.name: c for c in ALL_CONSTITUENTS}
            constituents, amplitudes, phases = [], [], []
            for name, amp, phase in raw:
                if name in constituent_map:
                    constituents.append(constituent_map[name])
                    amplitudes.append(amp)
                    phases.append(phase)
            model = Tide(constituents=constituents, amplitudes=amplitudes, phases=phases)
            _TIDE_MODELS[slug] = model
            return model

3. **Update `compute_tides`** to accept a `slug` parameter and call `_get_tide_model_for(slug)`. Return `{}` immediately if the model is `None`:

        def compute_tides(start_date: datetime, days: int, slug: str) -> dict:
            tide = _get_tide_model_for(slug)
            if tide is None:
                return {}
            ...  # rest unchanged

4. **Update `fetch_spot(client, spot)`** to pass `spot["slug"]` to `compute_tides`.

5. `hatyan` does not need to be added to `requirements-forecast.txt` — it is used once locally to extract constants that are then embedded. Do not add it as a runtime dependency.

**Acceptance (Milestone 10):** Run `python backend/fetch_forecast.py` locally. Confirm `schellinkhout/week.json` contains `"tides": {}` (or the key is absent), and `kijkduin/week.json` has non-empty tidal extrema distinct from IJmuiden's. Trigger the forecast workflow and verify the same in the `data` branch.

---

## Concrete Steps

Run all frontend commands from `frontend/` directory. Run Python commands from the repo root with `.venv` activated.

    # Milestone 1: Backend forecast (Phase 1 — IJmuiden tide constants reused for all spots)
    # (Edit fetch_forecast.py SPOTS array as described, then:)
    source .venv/bin/activate
    python backend/fetch_forecast.py
    # Verify: ls backend/output/  →  ijmuiden/ kijkduin/ schellinkhout/ wijk-aan-zee/

    # Milestone 10 (Phase 2 — run after Phase 1 is deployed):
    pip install hatyan   # one-time local use to extract Hoek van Holland constants
    # Run the constituent-fetching snippet (see Milestone 10, Step 1) and embed _KIJKDUIN_CONSTITUENTS
    # Then refactor _get_tide_model → _get_tide_model_for and update compute_tides signature
    python backend/fetch_forecast.py
    # Verify: schellinkhout/week.json has empty tides; kijkduin/week.json has non-empty tides

    # Milestone 2: Backend actuals
    # (Edit fetch_actuals.py as described, then:)
    EDR_API_KEY=<your_key> python backend/fetch_actuals.py
    # Verify: 4 current.json files written

    # Milestone 3-4: Data branch and workflows
    git checkout data
    # create dirs and seed as shown above
    git checkout master
    # Edit workflow YAMLs, push master, then trigger workflows from GitHub Actions UI

    # Milestone 5-8: Frontend edits
    # (Edit config.ts, TodayView.tsx, WeekView.tsx, NavBar.tsx as described)
    npm run build   # must succeed
    npm run lint    # must pass
    npm run dev     # visual inspection

---

## Validation and Acceptance

**Phase 1** is complete when all of the following hold:

- `npm run build` exits 0 with no TypeScript errors.
- Today view shows a 2×2 grid of four cards, each with a distinct spot name, each independently loading its data.
- 7-day view shows four collapsible rows; toggling one does not affect others.
- NavBar shows no hardcoded location label.
- The `data` branch on GitHub contains `ijmuiden/`, `wijk-aan-zee/`, `schellinkhout/`, `kijkduin/` with up-to-date JSON written by the cron jobs.
- All four spots display a tide curve (using IJmuiden constants as placeholder — accepted for Phase 1).

**Phase 2** is complete when additionally:
- `schellinkhout/week.json` has no tide extrema (empty tides dict).
- `kijkduin/week.json` has tide extrema computed from Hoek van Holland constituents.
- `wijk-aan-zee/week.json` continues to use IJmuiden constants (confirmed acceptable due to 2.8 km distance).

---

## Idempotence and Recovery

- The data branch seed step (Milestone 4) copies IJmuiden data as placeholders. Running it twice overwrites the same files — harmless.
- The GitHub Actions workflow loops are idempotent: each run overwrites with the freshest fetch output.
- If a `cp` in CI fails because a directory doesn't exist yet, the `mkdir -p` guard prevents the error; fix by ensuring Milestone 4 ran before pushing Milestone 3 changes.
- Frontend changes can be reverted by reverting `config.ts`, `TodayView.tsx`, and `WeekView.tsx` to their previous single-spot versions.

---

## Interfaces and Dependencies

**New pip dependency (Phase 2 only, local one-time use):** `hatyan` — used once locally to extract Hoek van Holland constituent values and embed them as a hardcoded constant. Not added to `requirements-forecast.txt`.

**`frontend/src/config.ts` exports (after change):**

    DATA_BASE_URL_FOR(slug: string): string
    SPOTS: readonly { slug: SpotSlug, name: string }[]
    type SpotSlug = 'ijmuiden' | 'wijk-aan-zee' | 'schellinkhout' | 'kijkduin'
    APP_TZ: string

**`SpotTodayCard` props:**

    { slug: SpotSlug; name: string }

**`SpotWeekRow` props:**

    { slug: SpotSlug; name: string; isExpanded: boolean; onToggle: () => void }

**`compute_tides(start_date, days, slug)` signature (after change):**

    def compute_tides(start_date: datetime, days: int, slug: str) -> dict
    # returns {} if slug == 'schellinkhout'
