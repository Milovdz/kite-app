---
name: fetch-wind-data
description: Fetch wind forecast data from the Open-Meteo KNMI Seamless API for a given latitude/longitude. Use when the user wants to retrieve, check, or test wind data, run the wind fetch script, or get kitesurf forecast data.
metadata:
  tags:
    - weather
    - wind
    - open-meteo
    - kitesurfing
  author: milovanderzanden
  version: "1.0.0"
---

# fetch-wind-data

Fetches a 7-day wind forecast from the Open-Meteo KNMI Seamless model for a given coordinate, printing current conditions and the first 12 hourly values to stdout.

## When to Use

- User wants to fetch or test wind data
- User asks to run the wind fetch / API call
- User wants to see current wind conditions for a kitesurf spot
- User says "fetch wind", "get wind data", "run the wind script", or similar

## When NOT to Use

- User wants to display or visualise wind data in the app UI (that's a separate concern)
- User wants to modify the API query parameters (edit the script directly)

## Workflow

1. Ensure the `.venv` is activated — the script must run inside it.
2. Run the fetch script from the project root with the `.venv` Python interpreter.
3. Report the output to the user: current conditions + hourly table.

## Execution

Run from the project root (`/Users/milovanderzanden/Desktop/Kite app 2.0/`):

```bash
source .venv/bin/activate && python .claude/skills/fetch-wind-data/scripts/fetch_wind.py
```

To override the default coordinate (52.482630, 4.581581), pass lat and lon as positional arguments:

```bash
source .venv/bin/activate && python .claude/skills/fetch-wind-data/scripts/fetch_wind.py 52.11 4.27
```

## Default Coordinate

MVP is hardcoded to **52.482630, 4.581581** (IJmuiden aan Zee area). Pass arguments to override.

## Dependencies

All installed in `.venv` at project root:

- `openmeteo-requests` — FlatBuffers-based Open-Meteo client
- `requests-cache` — 1-hour SQLite response cache (`.cache.sqlite`)
- `retry-requests` — 5 retries, 0.2 backoff factor

## API Parameters

- Endpoint: `https://api.open-meteo.com/v1/forecast`
- Model: `knmi_seamless` (KNMI Harmonie 2km for first 2.5 days, ECMWF beyond)
- Hourly variables: wind speed, direction, gusts at 10m
- Current variables: wind speed, direction, gusts at 10m
- Forecast days: 7
- Timezone: Europe/Amsterdam
