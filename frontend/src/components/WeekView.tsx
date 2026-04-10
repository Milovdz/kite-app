import { useState, useEffect } from 'react'
import { ForecastDay } from './ForecastDay'
import type { Slot, TidePoint } from './ForecastDay'
import { DATA_BASE_URL } from '../config'

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

// Mock tide data — two tidal cycles per day, typical North Sea pattern
const MOCK_TIDES: TidePoint[] = [
  { time: '01:18', heightM: 1.7, type: 'high' },
  { time: '07:32', heightM: 0.3, type: 'low' },
  { time: '13:45', heightM: 1.8, type: 'high' },
  { time: '19:58', heightM: 0.4, type: 'low' },
]

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
    hour: new Date(e.iso).getHours(),
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
  const [weekData, setWeekData] = useState<{ spot: string; forecast: ForecastEntry[] } | null>(null)

  useEffect(() => {
    fetch(`${DATA_BASE_URL}/week.json`).then(r => r.json()).then(setWeekData)
  }, [])

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
              tides={MOCK_TIDES}
              rideableMin={16}
              pumpingMin={22}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
