# Wind Direction Safety Zones

## Context

The app shows wind speed colour-coding and kiteable windows but has no awareness of whether the wind direction is safe at each spot. Offshore wind is dangerous for kitesurfing — a rider can be blown out to sea — yet the app currently shows a "kiteable" banner for any hour with sufficient wind speed, regardless of direction. This feature adds per-spot, configurable direction zones so the UI clearly signals when conditions are actually safe.

## Zones

Four zones, ordered safest → most dangerous:

| Zone | Label | Arrow colour |
|---|---|---|
| `onshore` | Onshore ✓ | Teal `#5DCAA5` |
| `crossOnshore` | Cross-onshore ✓ | Teal `#5DCAA5` |
| `sideShore` | Side-shore ✓ | Amber `#f59e0b` |
| `offshore` | Offshore ⚠ | Red `#ef4444` |

Kiteable banners appear only for `onshore`, `crossOnshore`, and `sideShore`. Offshore windows produce no banner.

## Spot Configuration

Zones are defined as degree arcs in `config.ts` per spot. An arc `{ from, to }` wraps at 0° when `from > to`. Arcs should collectively cover all 360°.

### IJmuiden (North Sea, faces ~270°)
```ts
onshore:      [{ from: 247, to: 293 }]
crossOnshore: [{ from: 203, to: 247 }, { from: 293, to: 337 }]
sideShore:    [{ from: 157, to: 203 }, { from: 337, to: 23 }]
offshore:     [{ from: 23,  to: 157 }]
```

### Wijk aan Zee (North Sea, faces ~270°)
Same arcs as IJmuiden.

### Kijkduin (North Sea, faces ~270°)
Same arcs as IJmuiden.

### Schellinkhout (IJsselmeer, faces ~090° — east is onshore)
```ts
onshore:      [{ from: 68,  to: 113 }]
crossOnshore: [{ from: 23,  to: 68  }, { from: 113, to: 158 }]
sideShore:    [{ from: 338, to: 23  }, { from: 158, to: 203 }]
offshore:     [{ from: 203, to: 338 }]
```

## New Utility: `windZone.ts`

`frontend/src/utils/windZone.ts` — pure function, no side effects.

```ts
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
  return arc.from <= arc.to ? d >= arc.from && d < arc.to : d >= arc.from || d < arc.to
}

export function getWindZone(dirDeg: number, zones: WindZones): WindZoneName {
  for (const zone of ['onshore', 'crossOnshore', 'sideShore', 'offshore'] as WindZoneName[]) {
    if (zones[zone].some(arc => inArc(dirDeg, arc))) return zone
  }
  return 'offshore' // fallback — most restrictive
}
```

## Visual Changes

### ForecastDay.tsx — hourly tiles

- Compute `slotZones` (array of `WindZoneName | null`) once via `useMemo` before render
- Wind speed tile: add `position: relative; overflow: hidden`. When `offshore`, render `<div style={{ position:'absolute', inset:0, background:'rgba(239,68,68,0.25)', pointerEvents:'none' }}>`
- Direction row: colour the arrow SVG by zone colour. Add compass label below the arrow (`degreesToCompass(s.dirDeg)` + ` ⚠` if offshore)
- `windZones` prop is optional (`WindZones | undefined`) — absent = no zone styling, existing behaviour preserved

### ForecastDay.tsx — kiteable windows

In the `kiteableWindows` useMemo, a slot enters a run only when `windKn >= rideableMin && zone !== 'offshore'`. When `windZones` is absent, zone defaults to `'onshore'` (preserves existing behaviour).

### TodayView.tsx + WindGraph.jsx — current conditions header

- `SpotTodayCard` receives `windZones` from `SPOTS`, derives `currentZone = getWindZone(dirDeg, windZones)`
- Passes `windZone` prop to `WindGraph`
- `WindGraph` colours the direction arrow by zone and shows: `"{compass} · {zoneLabel}"` e.g. `"SW · Onshore ✓"` or `"SE · Offshore ⚠"`

## Data Flow

`SPOTS` (config.ts) → each spot object carries `windZones` → passed as prop to `SpotTodayCard` / `SpotWeekRow` → passed to `WindGraph` / `ForecastDay`. No context, no App.tsx changes.

## Files to Modify

| File | Change |
|---|---|
| `frontend/src/utils/windZone.ts` | **New** — types + `getWindZone` |
| `frontend/src/config.ts` | Add `windZones` to all 4 spots |
| `frontend/src/components/ForecastDay.tsx` | Zone overlay, arrow colours, compass label, kiteable filter |
| `frontend/src/components/WeekView.tsx` | Thread `windZones` through `SpotWeekRow` → `ForecastDay` |
| `frontend/src/components/TodayView.tsx` | Thread `windZones` → derive zone → pass to `WindGraph` |
| `frontend/src/components/WindGraph.jsx` | `windZone` prop, zone arrow colour, compound direction label |
| `frontend/src/components/WindGraph.d.ts` | Add `windZone?: WindZoneName` |

## Verification

1. Run `npm run dev` in `frontend/`
2. Open TodayView — direction arrow label should read e.g. "SW · Onshore ✓" in teal
3. Open WeekView → expand a day → check offshore hours have red overlay + ⚠ on compass
4. Confirm kiteable banners don't appear on hours where direction is offshore
5. Run `npm run build` — no TypeScript errors
