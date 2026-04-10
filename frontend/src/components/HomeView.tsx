import { useState, useEffect } from 'react'
import { DATA_BASE_URL_FOR, SPOTS, APP_TZ } from '../config'
import type { SpotSlug } from '../config'
import type { Slot } from './ForecastDay'
import { type ForecastEntry, groupByDay, toSlots } from '../utils/forecast'
import { computeKiteableWindows, type KiteWindow } from '../utils/kiteableWindows'

const SAMPLE_HOURS = [6, 9, 12, 15, 18, 21, 23]
const Y_MAX = 35

function windBandColor(kn: number): string {
  if (kn >= 30) return '#047857'
  if (kn >= 25) return '#10b981'
  if (kn >= 20) return '#6ee7b7'
  if (kn >= 16) return '#d1fae5'
  return 'var(--bg-muted)'
}

function MiniBarChart({ slots, kiteableHours }: { slots: Slot[]; kiteableHours: Set<number> }) {
  return (
    <div style={{ display: 'flex', gap: 1, padding: '0 3px' }}>
      {SAMPLE_HOURS.map(h => {
        const kn = slots.find(s => s.hour === h)?.windKn ?? 0
        const pct = Math.max(8, Math.min(100, (kn / Y_MAX) * 100))
        const kiteable = kiteableHours.has(h)
        return (
          <div key={h} style={{ flex: 1, minWidth: 0, height: 34, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
            {kiteable && (
              <div style={{ fontSize: 8, color: '#10b981', lineHeight: 1, marginBottom: 1 }}>
                {Math.round(kn)} kn
              </div>
            )}
            <div style={{
              width: '100%',
              height: `${Math.round((pct / 100) * 24)}px`,
              background: windBandColor(kn),
              borderRadius: '2px 2px 0 0',
            }} />
          </div>
        )
      })}
    </div>
  )
}

type DaySlots = { dateKey: string; slots: Slot[] }
type SpotState = { days: DaySlots[] } | 'loading' | 'error'

function todayKey(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: APP_TZ }) // YYYY-MM-DD
}

function formatDayHeader(dateKey: string): { label: string; isToday: boolean } {
  const isToday = dateKey === todayKey()
  const d = new Date(dateKey + 'T12:00:00Z')
  const label = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', timeZone: 'UTC' })
  return { label, isToday }
}

export function HomeView() {
  const [spotStates, setSpotStates] = useState<Record<SpotSlug, SpotState>>(() =>
    Object.fromEntries(SPOTS.map(s => [s.slug, 'loading'])) as Record<SpotSlug, SpotState>
  )

  useEffect(() => {
    const fetchAll = () => {
      SPOTS.forEach(({ slug }) => {
        fetch(`${DATA_BASE_URL_FOR(slug)}/week.json`)
          .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
          .then((data: { forecast: ForecastEntry[] }) => {
            const days = groupByDay(data.forecast).map(({ dateKey, entries }) => ({
              dateKey,
              slots: toSlots(entries),
            }))
            setSpotStates(prev => ({ ...prev, [slug]: { days } }))
          })
          .catch(() => setSpotStates(prev => ({ ...prev, [slug]: 'error' })))
      })
    }

    fetchAll()
    const id = setInterval(fetchAll, 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [])

  // Collect all unique date keys across all spots
  const allDateKeys = (() => {
    const keys = new Set<string>()
    for (const state of Object.values(spotStates)) {
      if (typeof state === 'object') {
        state.days.forEach(d => keys.add(d.dateKey))
      }
    }
    return [...keys].sort()
  })()

  const cols = Math.max(allDateKeys.length, 7)
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `110px repeat(${cols}, 1fr)`,
  }

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', overflow: 'hidden' }}>

      {/* Header row */}
      <div style={{ ...gridStyle, marginBottom: 8 }}>
        <div />
        {allDateKeys.map(dk => {
          const { label, isToday } = formatDayHeader(dk)
          return (
            <div
              key={dk}
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                color: isToday ? 'var(--teal)' : 'var(--text-secondary)',
                textAlign: 'center',
              }}
            >
              {label}
            </div>
          )
        })}
      </div>

      {/* Spot rows */}
      {SPOTS.map(spot => {
        const state = spotStates[spot.slug]
        return (
          <div key={spot.slug} style={{ ...gridStyle, borderTop: '0.5px solid var(--border)' }}>
            <div style={{
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              paddingRight: 8,
            }}>
              {spot.name}
            </div>

            {allDateKeys.map(dk => {
              if (state === 'loading') {
                return (
                  <div key={dk} style={{ padding: '8px 4px', borderLeft: '0.5px solid var(--border)' }}>
                    <div style={{ height: 24, borderRadius: 3, background: 'var(--bg-muted)', opacity: 0.4 }} />
                  </div>
                )
              }
              if (state === 'error') {
                return (
                  <div key={dk} style={{ padding: '8px 4px', borderLeft: '0.5px solid var(--border)', fontSize: 11, color: 'var(--text-secondary)' }}>–</div>
                )
              }
              const day = state.days.find(d => d.dateKey === dk)
              const slots = day?.slots ?? []
              const windows: KiteWindow[] = day
                ? computeKiteableWindows(day.slots, 16, spot.windZones)
                : []
              const kiteableHoursFromWindows = new Set(
                windows.flatMap(w => {
                  const from = parseInt(w.from, 10)
                  const to = parseInt(w.to, 10)
                  return SAMPLE_HOURS.filter(h => h >= from && h <= to)
                })
              )
              return (
                <div key={dk} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  borderLeft: '0.5px solid var(--border)',
                }}>
                  <MiniBarChart slots={slots} kiteableHours={kiteableHoursFromWindows} />
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Time axis */}
      <div style={{ ...gridStyle, borderTop: '0.5px solid var(--border)' }}>
        <div />
        {allDateKeys.map(dk => (
          <div key={dk} style={{ borderLeft: '0.5px solid var(--border)', padding: '2px 3px' }}>
            <div style={{ display: 'flex', gap: 1 }}>
              {SAMPLE_HOURS.map(h => (
                <div key={h} style={{ flex: 1, minWidth: 0, textAlign: 'center', fontSize: 8, color: 'var(--text-secondary)', opacity: 0.6 }}>
                  {String(h).padStart(2, '0')}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

    </div>
  )
}
