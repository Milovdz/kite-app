# Add Wind Direction Safety Zones

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds.

## Purpose / Big Picture

After this change, every hourly wind tile in the week view will display a red translucent overlay and a ⚠ warning when the wind is blowing offshore (dangerous for kitesurfing). The direction arrow in both the week tiles and the today-view header will be coloured by safety zone: teal for onshore/cross-onshore, amber for side-shore, red for offshore. The "Kiteable" banners will no longer appear for offshore hours regardless of wind speed. Zone definitions are stored per spot in `config.ts` as degree arcs, so they are easy to tune per location.

To verify it works: run `npm run dev` inside `frontend/`, open the app, switch to the week view, expand a spot — offshore-direction hours (e.g. easterly) should have a red wash and ⚠ on the compass label. Switch to today view — the direction arrow and label should be coloured and read "SW · Onshore ✓" or "SE · Offshore ⚠".

## Progress

- [ ] Create `frontend/src/utils/windZone.ts`
- [ ] Extend `frontend/src/config.ts` with `windZones` on all 4 spots
- [ ] Update `frontend/src/components/ForecastDay.tsx` — zone overlay, arrow colour, compass label, kiteable filter
- [ ] Update `frontend/src/components/WeekView.tsx` — thread `windZones` through `SpotWeekRow` to `ForecastDay`
- [ ] Update `frontend/src/components/TodayView.tsx` — thread `windZones`, derive zone, pass to `WindGraph`
- [ ] Update `frontend/src/components/WindGraph.jsx` — `windZone` prop, coloured arrow, compound label
- [ ] Update `frontend/src/components/WindGraph.d.ts` — add `windZone?` to type declaration
- [ ] Run `npm run build` in `frontend/` — zero TypeScript errors
- [ ] Visual acceptance check in browser

## Surprises & Discoveries

_(fill in as work proceeds)_

## Decision Log

- Decision: Use degree arcs `{ from, to }` rather than named compass points for zone boundaries.
  Rationale: More precise; handles the non-symmetric geometry of each spot without rounding to 22.5° increments. Wrapping arcs (from > to) handle the north crossing cleanly.
  Date/Author: 2026-04-10 / Milo + Claude

- Decision: `windZones` is an optional prop on `ForecastDay` — when absent, no zone styling is applied and all wind-sufficient hours produce kiteable banners.
  Rationale: Allows adding spots to `SPOTS` before their zones are mapped without breaking the UI.
  Date/Author: 2026-04-10 / Milo + Claude

- Decision: Offshore slots are excluded from kiteable banners entirely (banner disappears), not shown with a warning label.
  Rationale: User explicitly stated: "If not in the kiteable range, I do not want to see the kiteable banner."
  Date/Author: 2026-04-10 / Milo + Claude

- Decision: Four zones — onshore, crossOnshore, sideShore, offshore.
  Rationale: Matches standard kitesurf safety taxonomy. Onshore and cross-onshore are both teal (clearly safe). Side-shore is amber (safe but worth noting). Offshore is red.
  Date/Author: 2026-04-10 / Milo + Claude

## Outcomes & Retrospective

_(fill in at completion)_

## Context and Orientation

This is a single-page React + TypeScript app (Vite) in `frontend/`. There is no router — `App.tsx` owns a `view` state switching between `TodayView` and `WeekView`. There are no automated tests; acceptance is visual.

Key files involved:

- `frontend/src/config.ts` — exports `SPOTS` (array of `{ slug, name }`) and `DATA_BASE_URL_FOR`. This is the single source of truth for spot metadata. We will add `windZones` here.
- `frontend/src/utils/windZone.ts` — **new file** — pure utility: types (`WindZones`, `ArcRange`, `WindZoneName`) and the `getWindZone(dirDeg, zones)` function.
- `frontend/src/components/ForecastDay.tsx` — renders a single day's hourly grid. Contains the `WindArrow` SVG component, the wind-speed tiles, the direction-arrow row, and the `kiteableWindows` useMemo that produces the green banners. `ForecastDayProps` currently has no zone awareness.
- `frontend/src/components/WeekView.tsx` — maps over `SPOTS`, renders a `SpotWeekRow` per spot, which fetches data and renders `ForecastDay` per day.
- `frontend/src/components/TodayView.tsx` — maps over `SPOTS`, renders a `SpotTodayCard` per spot, which fetches data and renders `WindGraph`.
- `frontend/src/components/WindGraph.jsx` — Chart.js line chart. Its header section (around line 409) renders the direction arrow SVG and a `compassDir` label. This is where the zone-coloured label "SW · Onshore ✓" will go.
- `frontend/src/components/WindGraph.d.ts` — TypeScript declaration for the JSX component.

**What a "wind zone" means:** A kitesurfer's safety depends on wind direction relative to the beach. Offshore wind blows from the beach toward the open water — a falling rider can be swept out to sea and cannot self-rescue. Onshore wind blows from the sea toward the beach — the safest direction. Cross-onshore is at a shallow angle off the beach face (safe). Side-shore blows parallel to the beach (generally safe, manageable). Each spot's beach faces a different compass bearing, so the zones differ per spot.

**Arc format:** A zone is defined as one or more `{ from: number; to: number }` arcs in degrees (0 = North, 90 = East, 180 = South, 270 = West). When `from > to` the arc wraps through 0° (e.g. `{ from: 337, to: 23 }` covers NNW through N to NNE).

## Plan of Work

### Step 1 — Create `frontend/src/utils/windZone.ts`

Create this file from scratch. It exports three types and one function:

    export type WindZoneName = 'onshore' | 'crossOnshore' | 'sideShore' | 'offshore'

    export interface ArcRange { from: number; to: number }

    export interface WindZones {
      onshore:      ArcRange[]
      crossOnshore: ArcRange[]
      sideShore:    ArcRange[]
      offshore:     ArcRange[]
    }

    function inArc(deg: number, arc: ArcRange): boolean {
      const d = ((deg % 360) + 360) % 360
      if (arc.from <= arc.to) return d >= arc.from && d < arc.to
      return d >= arc.from || d < arc.to   // wrapping arc, e.g. { from: 337, to: 23 }
    }

    export function getWindZone(dirDeg: number, zones: WindZones): WindZoneName {
      for (const zone of ['onshore', 'crossOnshore', 'sideShore', 'offshore'] as WindZoneName[]) {
        if (zones[zone].some(arc => inArc(dirDeg, arc))) return zone
      }
      return 'offshore'  // fallback — most restrictive
    }

The `inArc` check normalises `deg` to `[0, 360)` first so that negative inputs or values ≥ 360 are handled safely. The priority order (onshore checked first) means overlapping arcs always resolve to the safer zone — useful if zones are slightly misconfigured.

### Step 2 — Extend `frontend/src/config.ts`

Add an import of `WindZones` at the top, then add `windZones` to each spot in the `SPOTS` array. The `as const` assertion still works because TypeScript will infer literal types for `slug`/`name` and use the imported `WindZones` interface for the new field.

**Import to add (line 1):**

    import type { WindZones } from './utils/windZone'

**New SPOTS array** — replace the existing four entries with:

    export const SPOTS: ReadonlyArray<{ slug: SpotSlug; name: string; windZones: WindZones }> = [
      {
        slug: 'ijmuiden',
        name: 'IJmuiden',
        windZones: {
          onshore:      [{ from: 247, to: 293 }],
          crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
          sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
          offshore:     [{ from: 23,  to: 157 }],
        },
      },
      {
        slug: 'wijk-aan-zee',
        name: 'Wijk aan Zee',
        windZones: {
          onshore:      [{ from: 247, to: 293 }],
          crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
          sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
          offshore:     [{ from: 23,  to: 157 }],
        },
      },
      {
        slug: 'schellinkhout',
        name: 'Schellinkhout',
        windZones: {
          onshore:      [{ from: 68,  to: 113 }],
          crossOnshore: [{ from: 23,  to: 68  }, { from: 113, to: 158 }],
          sideShore:    [{ from: 338, to: 23  }, { from: 158, to: 203 }],
          offshore:     [{ from: 203, to: 338 }],
        },
      },
      {
        slug: 'kijkduin',
        name: 'Kijkduin',
        windZones: {
          onshore:      [{ from: 247, to: 293 }],
          crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }],
          sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23  }],
          offshore:     [{ from: 23,  to: 157 }],
        },
      },
    ] as const

Note: the `SpotSlug` type is currently inferred from `typeof SPOTS[number]['slug']`. Switching from `as const` on the array to an explicit `ReadonlyArray<...>` type annotation means `SpotSlug` must be declared explicitly. Change the `SpotSlug` line to:

    export type SpotSlug = 'ijmuiden' | 'wijk-aan-zee' | 'schellinkhout' | 'kijkduin'

This is cleaner anyway and avoids the circular inference.

### Step 3 — Update `frontend/src/components/ForecastDay.tsx`

Four sub-changes in this file.

**3a. Add imports and extend `ForecastDayProps`.**

Add at the top (after the existing `import { useMemo, useState } from 'react'`):

    import { getWindZone, type WindZones, type WindZoneName } from '../utils/windZone'

Add `windZones?: WindZones` to `ForecastDayProps` (after `rideableMin?: number`):

    windZones?: WindZones

Add `windZones` to the function signature destructuring (after `rideableMin = 16`):

    windZones,

**3b. Add zone colour constant and `slotZones` memo.**

Add this constant at module level (after the existing `COLORS` constant):

    const ZONE_ARROW_COLOR: Record<WindZoneName, string> = {
      onshore:      '#5DCAA5',
      crossOnshore: '#5DCAA5',
      sideShore:    '#f59e0b',
      offshore:     '#ef4444',
    }

Inside the component body, after the `slots` useMemo, add:

    const slotZones = useMemo(
      () => slots.map(s => windZones ? getWindZone(s.dirDeg, windZones) : null),
      [slots, windZones],
    )

**3c. Update the wind tile section (lines 232–246) to add the offshore overlay.**

The wind tile `<div>` currently has a static `tileStyle` and no `position`/`overflow`. Change it so that when a slot is offshore, an absolutely-positioned translucent red div is rendered inside. The existing `tileStyle` constant already has `borderRadius: 6` — add `position: 'relative'` and `overflow: 'hidden'` as additional inline properties so the overlay clips correctly.

Replace the existing tiles map:

    {slots.map((s) => {
      const band = windBand(s.windKn)
      const c = COLORS[band]
      const compact = resolution === '1h'
      return (
        <div key={s.hour} style={{ ...tileStyle, background: c.bg, minHeight: compact ? 40 : 52, padding: compact ? '4px 1px' : '8px 2px' }}>
          <span style={{ fontSize: compact ? 13 : 20, fontWeight: 500, lineHeight: 1.1, color: c.text }}>{s.windKn}</span>
          <span style={{ fontSize: compact ? 9 : 11, color: ('gust' in c ? c.gust : undefined) || 'var(--text-tertiary)', marginTop: 1 }}>
            G{s.gustKn}
          </span>
        </div>
      )
    })}

With:

    {slots.map((s, idx) => {
      const band = windBand(s.windKn)
      const c = COLORS[band]
      const compact = resolution === '1h'
      const zone = slotZones[idx]
      return (
        <div key={s.hour} style={{ ...tileStyle, background: c.bg, minHeight: compact ? 40 : 52, padding: compact ? '4px 1px' : '8px 2px', position: 'relative', overflow: 'hidden' }}>
          {zone === 'offshore' && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(239,68,68,0.25)', pointerEvents: 'none' }} />
          )}
          <span style={{ fontSize: compact ? 13 : 20, fontWeight: 500, lineHeight: 1.1, color: c.text }}>{s.windKn}</span>
          <span style={{ fontSize: compact ? 9 : 11, color: ('gust' in c ? c.gust : undefined) || 'var(--text-tertiary)', marginTop: 1 }}>
            G{s.gustKn}
          </span>
        </div>
      )
    })}

**3d. Update the direction arrow row (lines 249–255) to add zone colour and compass label.**

Replace the existing direction row map:

    {slots.map((s) => (
      <div key={s.hour} style={{ textAlign: 'center', padding: '4px 0' }}>
        <WindArrow deg={s.dirDeg} size={resolution === '1h' ? 12 : 18} />
      </div>
    ))}

With:

    {slots.map((s, idx) => {
      const zone = slotZones[idx]
      const arrowColor = zone ? ZONE_ARROW_COLOR[zone] : 'var(--text-secondary)'
      const label = degreesToCompass(s.dirDeg) + (zone === 'offshore' ? ' ⚠' : '')
      return (
        <div key={s.hour} style={{ textAlign: 'center', padding: '4px 0' }}>
          <WindArrow deg={s.dirDeg} size={resolution === '1h' ? 12 : 18} color={arrowColor} />
          <div style={{ fontSize: resolution === '1h' ? 8 : 10, color: arrowColor, marginTop: 1 }}>
            {label}
          </div>
        </div>
      )
    })}

Note: `WindArrow` already accepts a `color` prop (line 61 of the current file: `color = 'var(--text-secondary)'`), so no change to that component is needed.

**3e. Update `kiteableWindows` useMemo (lines 159–183) to exclude offshore slots.**

The current loop pushes any slot with `windKn >= rideableMin` into the run. Change it to also check zone. Add `windZones` to the dependency array.

Replace:

    for (const s of allSlots) {
      if (s.windKn >= rideableMin) run.push(s)
      else flush()
    }

With:

    for (const s of allSlots) {
      const zone = windZones ? getWindZone(s.dirDeg, windZones) : 'onshore'
      const kiteable = s.windKn >= rideableMin && zone !== 'offshore'
      if (kiteable) run.push(s)
      else flush()
    }

Also update the dependency array from `[allSlots, rideableMin]` to `[allSlots, rideableMin, windZones]`.

### Step 4 — Update `frontend/src/components/WeekView.tsx`

`SpotWeekRow` must receive and forward `windZones` to `ForecastDay`. Two changes:

**4a. Add import at the top:**

    import type { WindZones } from '../utils/windZone'

**4b. Add `windZones` to `SpotWeekRow` props** (line 41, after `name: string`):

    windZones: WindZones

**4c. Pass `windZones` to `ForecastDay`** (line 117, inside the `groups.map`):

    <ForecastDay
      date={dateKey}
      spotName={weekData.spot}
      allSlots={toSlots(entries)}
      tides={weekData.tidesByDate?.[dateKey] ?? []}
      rideableMin={16}
      windZones={windZones}
    />

**4d. Pass `windZones` at the `SpotWeekRow` call site** (lines 140–150, inside `WeekView`):

    {SPOTS.map(s => (
      <SpotWeekRow
        key={s.slug}
        slug={s.slug}
        name={s.name}
        windZones={s.windZones}
        isExpanded={expanded.has(s.slug)}
        onToggle={() => setExpanded(prev => {
          const next = new Set(prev)
          next.has(s.slug) ? next.delete(s.slug) : next.add(s.slug)
          return next
        })}
      />
    ))}

### Step 5 — Update `frontend/src/components/TodayView.tsx`

**5a. Add imports:**

    import { getWindZone, type WindZones, type WindZoneName } from '../utils/windZone'

**5b. Add `windZones` to `SpotTodayCard` props** (line 25):

    function SpotTodayCard({ slug, name, windZones }: { slug: SpotSlug; name: string; windZones: WindZones }) {

**5c. Derive `currentZone` inside `SpotTodayCard`** — add after the `now` variable (line 56):

    const currentDirDeg = currentData?.current?.dirDeg ?? 0
    const currentZone: WindZoneName = getWindZone(currentDirDeg, windZones)

**5d. Pass `windZone` to `WindGraph`** — add the prop to the existing `WindGraph` call (line 74):

    <WindGraph
      spotName={name}
      currentWind={currentData.current?.windKn ?? 0}
      currentGust={currentData.current?.gustKn ?? 0}
      currentDirDeg={currentData.current?.dirDeg ?? 0}
      windZone={currentZone}
      threshold={17}
      yMax={40}
      forecastWind={forecastWind}
      forecastGust={forecastGust}
      actuals={actuals}
      nowTime={now}
    />

Note: the existing `currentData.current?.dirDeg ?? 0` inline expression on line 78 becomes the standalone `currentDirDeg` variable defined above.

**5e. Pass `windZones` at the `SpotTodayCard` call site** (line 95):

    {SPOTS.map(s => (
      <SpotTodayCard key={s.slug} slug={s.slug} name={s.name} windZones={s.windZones} />
    ))}

### Step 6 — Update `frontend/src/components/WindGraph.jsx`

**6a. Add zone colour map and zone display labels** as module-level constants after the existing `COLORS` constant (line 188):

    const ZONE_ARROW_COLOR = {
      onshore:      '#5DCAA5',
      crossOnshore: '#5DCAA5',
      sideShore:    '#f59e0b',
      offshore:     '#ef4444',
    }

    const ZONE_DISPLAY = {
      onshore:      'Onshore ✓',
      crossOnshore: 'Cross-onshore ✓',
      sideShore:    'Side-shore ✓',
      offshore:     'Offshore ⚠',
    }

**6b. Add `windZone` to destructured props** (line 201, after `nowTime`):

    windZone = 'onshore',

**6c. Update the `dirBox` JSX** (lines 409–418) to use zone colour and compound label. Currently:

    <div style={styles.dirBox}>
      <svg width={20} height={20} viewBox="0 0 20 20">
        <path
          d="M10 2 L14 10 L11 9 L11 18 L9 18 L9 9 L6 10 Z"
          fill="currentColor"
          transform={`rotate(${currentDirDeg}, 10, 10)`}
        />
      </svg>
      <span style={styles.dirLabel}>{compassDir}</span>
    </div>

Replace with:

    <div style={styles.dirBox}>
      <svg width={20} height={20} viewBox="0 0 20 20">
        <path
          d="M10 2 L14 10 L11 9 L11 18 L9 18 L9 9 L6 10 Z"
          fill={ZONE_ARROW_COLOR[windZone]}
          transform={`rotate(${currentDirDeg}, 10, 10)`}
        />
      </svg>
      <span style={{ ...styles.dirLabel, color: ZONE_ARROW_COLOR[windZone] }}>
        {compassDir} · {ZONE_DISPLAY[windZone]}
      </span>
    </div>

### Step 7 — Update `frontend/src/components/WindGraph.d.ts`

Add the `WindZoneName` import and `windZone` prop:

    import { FC } from 'react'
    import type { WindZoneName } from '../utils/windZone'

    interface WindGraphProps {
      spotName?: string
      currentWind: number
      currentGust: number
      currentDirDeg?: number
      windZone?: WindZoneName
      threshold?: number
      yMax?: number
      forecastWind?: number[]
      forecastGust?: number[]
      actuals?: Array<{ time: string; windKn: number | null; gustKn: number | null; dirDeg: number | null }>
      nowTime?: string
    }

    declare const WindGraph: FC<WindGraphProps>
    export default WindGraph

## Concrete Steps

All commands run from `frontend/` unless otherwise noted.

1. Create `frontend/src/utils/windZone.ts` with the content from Step 1 above.

2. Edit `frontend/src/config.ts` — add the import, replace `SPOTS`, replace the `SpotSlug` type declaration.

3. Edit `frontend/src/components/ForecastDay.tsx` — apply changes 3a through 3e in order.

4. Edit `frontend/src/components/WeekView.tsx` — apply changes 4a through 4d.

5. Edit `frontend/src/components/TodayView.tsx` — apply changes 5a through 5e.

6. Edit `frontend/src/components/WindGraph.jsx` — apply changes 6a through 6c.

7. Edit `frontend/src/components/WindGraph.d.ts` — replace file content with the version from Step 7.

8. Run the type-checker and bundler:

       cd frontend
       npm run build

   Expected: no errors, output in `dist/`.

9. Start the dev server and do the visual check:

       npm run dev

   Open http://localhost:5173 in a browser.

## Validation and Acceptance

After `npm run dev` succeeds, verify the following in the browser:

**Today view:**
- Each spot card shows a direction arrow with colour: teal for SW/W/NW (onshore/cross-onshore), amber for S/N (side-shore), red for E/SE (offshore).
- The label next to the arrow reads e.g. "SW · Onshore ✓" or "E · Offshore ⚠".
- For Schellinkhout, easterly wind should be teal (onshore) and westerly should be red (offshore) — the opposite of the North Sea spots.

**Week view:**
- Expand any spot. Hours with an offshore direction have a red translucent wash over the wind tile and a ⚠ appended to the compass label in the direction row (e.g. "SE ⚠").
- Hours with an onshore direction have a teal arrow; side-shore hours have an amber arrow.
- The "▸ Kiteable …" banners do not appear for any time window where the direction is offshore, even if wind speed exceeds 16 kn.

**Build check:**

    npm run build

Must complete with zero TypeScript errors and zero type errors.

## Idempotence and Recovery

All edits are additive (new prop with optional/default, new file, new module-level constants). To roll back, revert `config.ts`, `ForecastDay.tsx`, `WeekView.tsx`, `TodayView.tsx`, `WindGraph.jsx`, `WindGraph.d.ts` to their previous state and delete `windZone.ts`. No data, no database, no external service is affected.

## Artifacts and Notes

Zone arc coverage for IJmuiden / Wijk aan Zee / Kijkduin (all face ~270°, North Sea):

    Onshore      247–293°   (WSW through W to WNW, ±23° of due-west)
    Cross-onshore 203–247°  (SSW–WSW) and 293–337° (WNW–NNW)
    Side-shore   157–203°   (SSE–SSW) and 337–23°  (NNW–NNE, wrapping through north)
    Offshore      23–157°   (NNE clockwise through E to SSE)

Zone arc coverage for Schellinkhout (faces ~90°, IJsselmeer — east is onshore):

    Onshore       68–113°   (ENE through E to ESE)
    Cross-onshore 23–68°    (NNE–ENE) and 113–158° (ESE–SSE)
    Side-shore   338–23°    (NNW–NNE, wrapping) and 158–203° (SSE–SSW)
    Offshore     203–338°   (SSW through W, NW to NNW)

## Interfaces and Dependencies

In `frontend/src/utils/windZone.ts`, define and export:

    export type WindZoneName = 'onshore' | 'crossOnshore' | 'sideShore' | 'offshore'
    export interface ArcRange { from: number; to: number }
    export interface WindZones {
      onshore: ArcRange[]; crossOnshore: ArcRange[]; sideShore: ArcRange[]; offshore: ArcRange[]
    }
    export function getWindZone(dirDeg: number, zones: WindZones): WindZoneName

No new npm dependencies are required. All existing dependencies (`react`, `chart.js`) are unchanged.
