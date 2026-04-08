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
- `WeekView` — 7-day hourly table (8 metrics per row)

Both views import static JSON directly from `src/data/` (`today.json`, `week.json`) — there is no live API call yet.

**Styling** — dark theme via CSS custom properties in `index.css`; inline styles throughout components; no CSS framework. Wind speed colour-coding is centralised in `src/utils/windColour.ts` (knots → hex across 5 bands: <15 grey, 16–20 yellow, 21–25 orange, 26–32 red, 32+ purple).

**Data schemas** are defined in `.plans/frontend-ui.md` and the design spec at `docs/superpowers/specs/2026-04-08-frontend-ui-design.md`.

**Python wind fetcher** — `.claude/skills/fetch-wind-data/scripts/fetch_wind.py` calls the Open-Meteo KNMI Seamless API (IJmuiden: 52.482630, 4.581581) with a 1-hour SQLite response cache. Used for generating mock data and will feed the future backend.
