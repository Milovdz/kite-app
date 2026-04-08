# Frontend UI Design — Kite Wind Forecast App

**Date:** 2026-04-08  
**Scope:** Frontend UI only — no backend implementation decisions

---

## Overview

A desktop-first kitesurf wind forecast app with two views: **Today** (graph) and **7 Days** (table). MVP shows a single spot (IJmuiden). Future version stacks multiple spots (max ~5) vertically within each view.

---

## Navigation

- Fixed top bar, full width
- Left: app name/logo
- Centre-left: spot name ("IJmuiden") — placeholder for future spot switcher
- Right: two tabs — **"Today"** and **"7 Days"**
- Tabs switch the view mode; spots stack vertically within each view

---

## Wind Strength Colour Scale

Used consistently across both views (graph background bands, table cell backgrounds).

| Wind speed | Colour |
|---|---|
| < 15 kn | Grey |
| 16–20 kn | Yellow → darker yellow (gradient with strength) |
| 21–25 kn | Orange → darker orange |
| 26–32 kn | Red → darker red |
| 32+ kn | Purple → deeper purple |

---

## Colour Palette

- Dark background (~`#0d1117`)
- Light text
- Wind strength colours as defined above — pop clearly on dark background

---

## Today View

Each spot is rendered as a section. Sections stack vertically (one per spot).

### Spot Header
- Spot name
- Current wind speed + gusts as large numbers
- Wind direction arrow
- Colour-coded badge using wind strength scale (e.g. yellow "18 kn" chip)

### Graph
- Full width, fixed height (~300px)
- **X-axis:** 0:00–23:59, hourly ticks, labelled every 3h
- **Y-axis:** wind speed in knots
- **Elements:**
  - Teal filled area: hourly forecast wind speed
  - Pink filled area: hourly forecast gusts
  - Teal solid line: actual wind (past hours up to now)
  - Red/pink solid line: actual gusts (past hours)
  - Vertical dashed line: "now" marker
  - Background horizontal bands: wind strength zones (grey/yellow/orange/red/purple) as subtle fills

---

## 7-Day Table View

Each spot is rendered as a section with only a simple spot name header — no current conditions.

### Table
- Horizontally scrollable, full width
- **Columns:** 3-hour time slots across 7 days (default); toggle to hourly
- **Day labels:** sticky group headers spanning their time slot columns (e.g. "Thu 9 Apr")
- **Sticky left column:** row labels fixed during horizontal scroll

### Rows

| Row | Display |
|---|---|
| Wind Speed (kn) | Number; cell background colour-coded by wind strength scale |
| Gusts (kn) | Number; same colour coding |
| Wind Direction | Arrow glyph rotated to direction |
| Wave Height (m) | Number |
| Wave Period (s) | Number |
| Tide | Placeholder ("—"); tide data source TBD |
| Temperature (°C) | Number; subtle warm/cool tint |
| Precipitation (mm) | Number; blue tint when > 0 |

### Time Resolution Toggle
- Default: 3-hourly (8 columns per day)
- Toggle: hourly (24 columns per day)
- Toggle control in the table header or top-right of the section

---

## Typography & Labels

- **Numbers:** monospace / tabular figures for clean column alignment
- **Labels:** clean sans-serif
- **Language:** English
- **Units:** knots throughout (fixed for MVP)

---

## Data Notes

- Wind speed, gusts, direction: Open-Meteo KNMI Seamless API (already implemented in fetch script)
- Wave height, wave period: Open-Meteo marine API endpoint (feasible from day one)
- Tide: placeholder for MVP; requires separate data source
- Actual (past) wind data: separate real-time observation source required — TBD

---

## Out of Scope (MVP)

- Spot switcher / multiple spots
- Unit toggle (km/h, m/s)
- Mobile layout
- Tide data
- User accounts or saved preferences
