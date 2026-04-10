import { useState, useEffect } from 'react'
import { ForecastDay } from './ForecastDay'
import type { Slot, TidePoint } from './ForecastDay'
import { DATA_BASE_URL_FOR, SPOTS, APP_TZ } from '../config'
import type { SpotSlug } from '../config'

interface ForecastEntry {
  iso: string
  windKn: number
  gustKn: number
  dirDeg: number
  waveM: number
  wavePeriodS: number
  tempC: number
  rainMm: number
}

function groupByDay(entries: ForecastEntry[]): { dateKey: string; entries: ForecastEntry[] }[] {
  const groups: Record<string, ForecastEntry[]> = {}
  for (const e of entries) {
    const dateKey = e.iso.slice(0, 10)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(e)
  }
  return Object.entries(groups).map(([dateKey, items]) => ({ dateKey, entries: items }))
}

function toSlots(entries: ForecastEntry[]): Slot[] {
  return entries.map((e) => ({
    hour: parseInt(new Date(e.iso).toLocaleString('en-GB', { hour: '2-digit', hour12: false, timeZone: APP_TZ }), 10) % 24,
    windKn: e.windKn,
    gustKn: e.gustKn,
    dirDeg: e.dirDeg,
    waveM: e.waveM,
    wavePeriodS: e.wavePeriodS,
    tempC: e.tempC,
    rainMm: e.rainMm,
  }))
}

function SpotWeekRow({ slug, name, isExpanded, onToggle }: {
  slug: SpotSlug
  name: string
  isExpanded: boolean
  onToggle: () => void
}) {
  const [weekData, setWeekData] = useState<{ spot: string; forecast: ForecastEntry[]; tidesByDate?: Record<string, TidePoint[]> } | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const groups = weekData ? groupByDay(weekData.forecast) : []

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'var(--bg-surface)',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: '0.95rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        <span>{name}</span>
        <span style={{
          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s',
          display: 'inline-block',
          color: 'var(--text-secondary)',
        }}>▾</span>
      </button>

      {isExpanded && (
        <div style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border)' }}>
          {error && <div style={{ padding: 12, color: 'red' }}>{error}</div>}
          {!error && !weekData && <div style={{ padding: 12, color: 'var(--text-secondary)' }}>Loading…</div>}
          {weekData && (
            <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
              <div style={{
                display: 'flex',
                flexDirection: 'row',
                gap: 12,
                padding: '12px 14px 1rem',
                width: 'max-content',
              }}>
                {groups.map(({ dateKey, entries }) => (
                  <div
                    key={dateKey}
                    style={{
                      background: 'var(--bg-surface)',
                      borderRadius: 12,
                      padding: '12px 14px',
                      border: '1px solid var(--border)',
                      minWidth: 340,
                      flexShrink: 0,
                    }}
                  >
                    <ForecastDay
                      date={dateKey}
                      spotName={weekData.spot}
                      allSlots={toSlots(entries)}
                      tides={weekData.tidesByDate?.[dateKey] ?? []}
                      rideableMin={16}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function WeekView() {
  const [expanded, setExpanded] = useState<Set<SpotSlug>>(new Set(SPOTS.map(s => s.slug)))

  return (
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
  )
}
