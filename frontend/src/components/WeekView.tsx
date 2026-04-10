import { useState, useEffect } from 'react'
import { ForecastDay } from './ForecastDay'
import type { Slot, TidePoint } from './ForecastDay'
import { DATA_BASE_URL, APP_TZ } from '../config'

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

export function WeekView() {
  const [weekData, setWeekData] = useState<{ spot: string; forecast: ForecastEntry[]; tidesByDate?: Record<string, TidePoint[]> } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${DATA_BASE_URL}/week.json`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(setWeekData)
      .catch(e => setError(String(e)))
  }, [])

  if (error) return <div style={{ padding: 24, color: 'red' }}>Week fetch error: {error}</div>
  if (!weekData) return <div style={{ padding: 24 }}>Loading...</div>

  const groups = groupByDay(weekData.forecast)

  return (
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
      <div style={{
        display: 'flex',
        flexDirection: 'row',
        gap: 12,
        padding: '0 0 1rem',
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
  )
}
