# KiteWind — Backend Architecture Design

**Version:** 1.0
**Date:** 2026-04-10
**Status:** Approved

---

## 1. Overview

KiteWind's backend is a static data pipeline with no persistent server. Two GitHub Actions cron jobs fetch data from external APIs, write JSON files to a `data` branch, and the Vercel-hosted frontend fetches those files at runtime. No backend process runs between cron executions.

---

## 2. Data Sources

| Data | Source | API | Cadence |
|---|---|---|---|
| Wind forecast, gusts, direction | Open-Meteo KNMI Seamless | `api.open-meteo.com/v1/forecast` | Hourly |
| Wave height, wave period | Open-Meteo KNMI Seamless | same | Hourly |
| Temperature, precipitation | Open-Meteo KNMI Seamless | same | Hourly |
| Current conditions (latest) | Open-Meteo KNMI Seamless | same | 15-min |
| Actual wind (10-min obs, today) | KNMI EDR API | `developer.dataplatform.knmi.nl/edr-api` | 15-min |
| Tide predictions | Rijkswaterstaat Waterinfo | Waterinfo API | Phase 2 |

### Open-Meteo variables to add

The existing fetcher currently requests only `wind_speed_10m`, `wind_direction_10m`, `wind_gusts_10m`. The following hourly variables must be added to the same API call:

- `wave_height`
- `wave_period`
- `temperature_2m`
- `precipitation`

### KNMI EDR API

- Provides 10-minute surface observations from the IJmuiden measurement station
- Authenticated via `EDR_API_KEY` (stored in `.env` and as a GitHub Actions secret)
- Fetches from midnight today to the current time on each run
- Used to populate the actual wind line on the today graph at 10-minute resolution

---

## 3. Spots

Four fixed kitespots, all hardcoded in fetcher config:

| Spot | Latitude | Longitude |
|---|---|---|
| IJmuiden | 52.482630 | 4.581581 |
| Schellinkhout | 52.658889 | 5.241944 |
| Kijkduin | 52.044444 | 4.224722 |
| Brouwersdam | 51.741667 | 3.883333 |

Phase 1 builds everything for IJmuiden only. The fetcher is structured from the start to loop over spots, but only IJmuiden is active.

---

## 4. Cron Jobs (GitHub Actions)

### 4.1 Hourly forecast job

**Schedule:** `0 * * * *` (every hour)

**Steps:**
1. Check out the `data` branch
2. Run Open-Meteo fetcher for each active spot
3. Write `data/{spot}/today.json` and `data/{spot}/week.json`
4. Commit and push to `data` branch

### 4.2 Current conditions job

**Schedule:** `*/15 * * * *` (every 15 minutes)

**Steps:**
1. Check out the `data` branch
2. Run Open-Meteo fetcher (current conditions only) for each active spot
3. Run KNMI EDR fetcher for today's 10-minute actuals for each active spot
4. Write `data/{spot}/current.json`
5. Commit and push to `data` branch

---

## 5. Output JSON Schemas

### 5.1 `data/{spot}/today.json`

```typescript
{
  spot: string
  generatedAt: string        // ISO timestamp of fetch
  hourly: Array<{
    hour: number             // 0–23
    forecastWindKn: number
    forecastGustKn: number
    dirDeg: number
    waveM: number
    wavePeriodS: number
    tempC: number
    rainMm: number
  }>
}
```

### 5.2 `data/{spot}/week.json`

```typescript
{
  spot: string
  generatedAt: string
  forecast: Array<{
    iso: string              // "YYYY-MM-DDTHH:MM"
    windKn: number
    gustKn: number
    dirDeg: number
    waveM: number
    wavePeriodS: number
    tempC: number
    rainMm: number
  }>
}
```

### 5.3 `data/{spot}/current.json`

```typescript
{
  spot: string
  generatedAt: string
  current: {
    windKn: number
    gustKn: number
    dirDeg: number
  }
  actuals: Array<{
    time: string             // "HH:MM" (10-minute intervals, midnight to now)
    windKn: number
    gustKn: number
    dirDeg: number
  }>
}
```

---

## 6. Frontend Changes Required

- Replace static `import` of `today.json` and `week.json` with `fetch()` calls targeting the `data` branch raw URLs
- Add loading and error states for each fetch
- Today graph updated to plot `actuals` array at 10-minute resolution alongside the hourly forecast area; x-axis ticks remain hourly
- Spot selector added (Phase 1: IJmuiden only, but the data URL is parameterised by spot slug from the start)

---

## 7. Secrets

| Secret | Used by |
|---|---|
| `EDR_API_KEY` | GitHub Actions (KNMI EDR fetcher) |

No other credentials required. Open-Meteo is unauthenticated.

---

## 8. Phases

| Phase | Scope |
|---|---|
| 1 | IJmuiden only. Open-Meteo forecast + KNMI EDR actuals. GitHub Actions crons. Frontend fetches JSON dynamically. |
| 2 | Add Rijkswaterstaat Waterinfo tide data for IJmuiden. |
| 3 | Activate remaining 3 spots. Add spot switcher to frontend. |
