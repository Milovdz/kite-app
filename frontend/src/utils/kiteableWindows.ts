import type { Slot } from '../components/ForecastDay'
import { getWindZone, type WindZones } from './windZone'

export interface KiteWindow {
  from: string
  to: string
  dir: string
  avgWind: number
  waveStr: string
}

function degreesToCompass(deg: number): string {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

export function computeKiteableWindows(
  allSlots: Slot[],
  rideableMin: number,
  windZones?: WindZones,
): KiteWindow[] {
  const windows: KiteWindow[] = []
  let run: Slot[] = []

  const flush = () => {
    if (run.length === 0) return
    const avgWind = Math.round(run.reduce((a, s) => a + s.windKn, 0) / run.length)
    const maxWave = Math.max(...run.map((s) => s.waveM))
    const minWave = Math.min(...run.map((s) => s.waveM))
    const waveStr = minWave === maxWave ? `${minWave}m` : `${minWave}-${maxWave}m`
    windows.push({
      from: `${String(run[0].hour).padStart(2, '0')}:00`,
      to: `${String(run[run.length - 1].hour).padStart(2, '0')}:00`,
      dir: degreesToCompass(run[0].dirDeg),
      avgWind,
      waveStr,
    })
    run = []
  }

  for (const s of allSlots) {
    const zone = windZones ? getWindZone(s.dirDeg, windZones) : 'onshore'
    const kiteable = s.windKn >= rideableMin && zone !== 'offshore'
    if (kiteable) run.push(s)
    else flush()
  }
  flush()

  return windows
}
