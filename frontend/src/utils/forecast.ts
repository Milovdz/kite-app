import type { Slot } from '../components/ForecastDay'
import { APP_TZ } from '../config'

export interface ForecastEntry {
  iso: string
  windKn: number
  gustKn: number
  dirDeg: number
  waveM: number
  wavePeriodS: number
  tempC: number
  rainMm: number
}

export function groupByDay(entries: ForecastEntry[]): { dateKey: string; entries: ForecastEntry[] }[] {
  const groups: Record<string, ForecastEntry[]> = {}
  for (const e of entries) {
    const dateKey = e.iso.slice(0, 10)
    if (!groups[dateKey]) groups[dateKey] = []
    groups[dateKey].push(e)
  }
  return Object.entries(groups).map(([dateKey, items]) => ({ dateKey, entries: items }))
}

export function toSlots(entries: ForecastEntry[]): Slot[] {
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
