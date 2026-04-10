# Add Auto-Refresh Polling to TodayView and WeekView

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

Currently the browser fetches wind data once when the page loads and never again. GitHub Actions updates `today.json` and `week.json` hourly and `current.json` every 15 minutes on the `data` branch. Without polling, a user who leaves the tab open will see increasingly stale data. After this change, the browser will automatically re-fetch each JSON file on a schedule that matches its update frequency: forecast data every hour, live actuals every 10 minutes. No page reload is needed.

## Progress

- [ ] Split the single `useEffect` in `SpotTodayCard` into two separate effects with polling intervals.
- [ ] Add polling interval to the `useEffect` in `SpotWeekRow`.
- [ ] Verify in the browser that network requests appear at the expected intervals (use DevTools > Network tab).

## Surprises & Discoveries

None yet.

## Decision Log

- Decision: Poll `current.json` every 10 minutes rather than every 15 minutes.
  Rationale: The KNMI cron job runs every 15 minutes, but a 10-minute interval ensures the browser catches the update promptly after it lands rather than potentially waiting up to 25 minutes. The overhead of one extra lightweight JSON fetch every 15 minutes is negligible.
  Date/Author: 2026-04-10 / Milovdz

- Decision: Split the existing single `useEffect` in `SpotTodayCard` into two separate effects rather than keeping one combined effect.
  Rationale: `today.json` and `current.json` have different polling frequencies (60 min vs 10 min). A single effect would force both to share the same interval, either over-fetching the forecast or under-fetching the actuals. Two independent effects with independent intervals and independent cleanup functions is the cleanest solution.
  Date/Author: 2026-04-10 / Milovdz

## Outcomes & Retrospective

Not yet completed.

## Context and Orientation

The app is a single-page React + TypeScript app built with Vite. It shows kitesurf wind forecasts for IJmuiden. All data is served as static JSON files from the `data` orphan branch on GitHub. The frontend fetches these files directly via HTTP.

There are two components that fetch data:

- `frontend/src/components/TodayView.tsx` — contains `SpotTodayCard`, which fetches two files:
  - `today.json` — hourly forecast for the current day, updated every hour by GitHub Actions.
  - `current.json` — live KNMI actuals for the last few hours, updated every 15 minutes by GitHub Actions.
  Currently both are fetched together in a single `useEffect` that runs once on mount (lines 30–38).

- `frontend/src/components/WeekView.tsx` — contains `SpotWeekRow`, which fetches one file:
  - `week.json` — 7-day hourly forecast, updated every hour by GitHub Actions.
  Currently fetched in a single `useEffect` that runs once on mount (lines 50–55).

A `useEffect` in React runs a function when a component mounts (appears on screen) and re-runs it if its listed dependencies change. It can optionally return a cleanup function that runs when the component unmounts. `setInterval(fn, ms)` is a browser API that calls `fn` repeatedly every `ms` milliseconds. `clearInterval(id)` stops it. The pattern used here is: call the fetch immediately, schedule it to repeat via `setInterval`, and return `clearInterval` as the cleanup so the interval stops when the component is removed from the screen.

## Plan of Work

### TodayView.tsx — split one effect into two

In `frontend/src/components/TodayView.tsx`, inside `SpotTodayCard`, replace the existing single `useEffect` (lines 30–38) with two separate effects:

The first effect handles `today.json` and runs every 60 minutes:

    useEffect(() => {
      const base = DATA_BASE_URL_FOR(slug)
      const fetchForecast = () =>
        fetch(`${base}/today.json`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then(setTodayData)
          .catch(e => setError(String(e)))

      fetchForecast()
      const id = setInterval(fetchForecast, 60 * 60 * 1000)
      return () => clearInterval(id)
    }, [slug])

The second effect handles `current.json` and runs every 10 minutes:

    useEffect(() => {
      const base = DATA_BASE_URL_FOR(slug)
      const fetchCurrent = () =>
        fetch(`${base}/current.json`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then(setCurrentData)
          .catch(e => setError(String(e)))

      fetchCurrent()
      const id = setInterval(fetchCurrent, 10 * 60 * 1000)
      return () => clearInterval(id)
    }, [slug])

No other changes to this file are needed. The `[slug]` dependency array is preserved so the fetch re-runs correctly if the user switches spots.

### WeekView.tsx — add interval to existing effect

In `frontend/src/components/WeekView.tsx`, inside `SpotWeekRow`, replace the existing `useEffect` (lines 50–55) with one that polls every 60 minutes:

    useEffect(() => {
      const fetchWeek = () =>
        fetch(`${DATA_BASE_URL_FOR(slug)}/week.json`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then(setWeekData)
          .catch(e => setError(String(e)))

      fetchWeek()
      const id = setInterval(fetchWeek, 60 * 60 * 1000)
      return () => clearInterval(id)
    }, [slug])

No other changes to this file are needed.

## Concrete Steps

All commands run from the `frontend/` directory.

1. Edit `frontend/src/components/TodayView.tsx`: replace lines 30–38 with the two effects shown above.

2. Edit `frontend/src/components/WeekView.tsx`: replace lines 50–55 with the polling effect shown above.

3. Start the dev server:

        npm run dev

   The app will be available at http://localhost:5173.

4. Open the app in a browser, open DevTools (F12), go to the Network tab, filter by "json". Confirm that `today.json`, `current.json`, and `week.json` are fetched on page load. The polling intervals are too long to wait out manually — see Validation section for how to verify them quickly.

5. Build to confirm no TypeScript errors:

        npm run build

   Expected output ends with something like `built in Xs` and no error lines.

## Validation and Acceptance

There are no automated tests in this project — acceptance is visual inspection and network observation.

**Quick interval verification:** To avoid waiting 10 or 60 minutes, temporarily change the intervals in your local editor to small values (e.g., `10 * 1000` for 10 seconds) and watch the Network tab in DevTools. You should see repeated requests to each JSON file at the expected cadence. Revert the values before committing.

**Normal verification:**
- Load http://localhost:5173.
- Open DevTools > Network > filter by "json".
- Confirm `today.json`, `current.json`, and `week.json` appear on load.
- Leave the tab open. After 10 minutes, `current.json` should appear again. After 60 minutes, all three should appear again.
- Navigating between the Today and Week views and back should not accumulate additional intervals — the cleanup function ensures old intervals are cancelled when components unmount.

**TypeScript check:** `npm run build` must complete without errors.

## Idempotence and Recovery

The edits are additive in structure — they replace existing `useEffect` blocks with functionally equivalent ones that also set intervals. If something goes wrong, revert the changed lines to the originals shown in the Context section above. There is no database, migration, or external state to clean up.

## Artifacts and Notes

Original `TodayView.tsx` effect (lines 30–38) for reference:

    useEffect(() => {
      const base = DATA_BASE_URL_FOR(slug)
      Promise.all([
        fetch(`${base}/today.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
        fetch(`${base}/current.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      ])
        .then(([today, current]) => { setTodayData(today); setCurrentData(current) })
        .catch(e => setError(String(e)))
    }, [slug])

Original `WeekView.tsx` effect (lines 50–55) for reference:

    useEffect(() => {
      fetch(`${DATA_BASE_URL_FOR(slug)}/week.json`)
        .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
        .then(setWeekData)
        .catch(e => setError(String(e)))
    }, [slug])

## Interfaces and Dependencies

No new libraries or dependencies are introduced. This uses only:
- React's built-in `useEffect` hook (already imported in both files).
- The browser's native `setInterval` / `clearInterval` APIs.
- The existing `DATA_BASE_URL_FOR` config helper from `src/config.ts`.
