# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `frontend/` directory:

```bash
npm run dev      # Start Vite dev server (localhost:5173, HMR enabled)
npm run build    # Type-check with tsc then bundle to dist/
npm run preview  # Serve production build locally
npm run lint     # ESLint with TypeScript + React Hooks rules
```

Fetch live wind data (Python):
```bash
source .venv/bin/activate && python .claude/skills/fetch-wind-data/scripts/fetch_wind.py
```

There are no automated tests — acceptance is visual inspection.

## Architecture

Single-page React + TypeScript app (Vite) showing a kitesurf wind forecast for IJmuiden.

**State & routing** — `App.tsx` owns a single `view: 'today' | 'week'` state. There is no router; switching views re-renders inline.

**Components** (`frontend/src/components/`):
- `NavBar` — fixed top bar; receives `view` and `onSwitch` callback
- `TodayView` — 24-hour Recharts line graph combining observed + forecast wind
- `WeekView` — 7-day scrollable cards, one per day; delegates to `ForecastDay`
- `ForecastDay` — per-day card with wind tiles (colour-banded), direction arrows, wave, temp, rain, tide curve, kiteable-window banners, and 1h/3h toggle

Both views fetch live JSON from the `data` branch on GitHub via `DATA_BASE_URL` in `src/config.ts` (`today.json`, `week.json`, `current.json`). The `data` branch is an orphan branch (no shared history with `master`) updated by GitHub Actions cron jobs — do not rebase or merge it.

**Deployment** — app is live at https://kite-app-three.vercel.app (Vercel, `frontend/` root).

**Data pipeline:**
- `backend/fetch_forecast.py` — hourly cron, writes `today.json` + `week.json` from Open-Meteo (forecast + marine)
- `backend/fetch_actuals.py` — every 15 min cron, writes `current.json` from KNMI EDR API (station 06225, IJmuiden)

**Styling** — dark theme via CSS custom properties in `index.css`; inline styles throughout components; no CSS framework. Wind speed colour-coding is centralised in `src/utils/windColour.ts` (knots → hex across 5 bands: <15 grey, 16–20 yellow, 21–25 orange, 26–32 red, 32+ purple). `ForecastDay` uses its own green-band colour scheme for kiteable wind tiles.

**Python wind fetcher** — `.claude/skills/fetch-wind-data/scripts/fetch_wind.py` calls the Open-Meteo KNMI Seamless API (IJmuiden: 52.482630, 4.581581) with a 1-hour SQLite response cache. Used for local data inspection.
