import { useState, useEffect } from 'react'
import WindGraph from './WindGraph'
import { DATA_BASE_URL } from '../config'

interface TodayData {
  spot: string
  generatedAt: string
  current: { windKn: number; gustKn: number; dirDeg: number }
  hourly: Array<{
    hour: number
    forecastWindKn: number
    forecastGustKn: number
    dirDeg: number
  }>
}

interface CurrentData {
  spot: string
  generatedAt: string
  current: { windKn: number; gustKn: number; dirDeg: number }
  actuals: Array<{ time: string; windKn: number | null; gustKn: number | null; dirDeg: number | null }>
}

export function TodayView() {
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [currentData, setCurrentData] = useState<CurrentData | null>(null)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(`${DATA_BASE_URL}/today.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${DATA_BASE_URL}/current.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
      .then(([today, current]) => { setTodayData(today); setCurrentData(current) })
      .catch(e => setError(String(e)))
  }, [])

  if (error) return <div style={{ padding: 24, color: 'red' }}>Today fetch error: {error}</div>
  if (!todayData || !currentData) return <div style={{ padding: 24 }}>Loading...</div>

  const nowIndex = new Date().getHours()

  const actualWind: (number | null)[] = Array(24).fill(null)
  const actualGust: (number | null)[] = Array(24).fill(null)
  for (const obs of currentData.actuals) {
    const hour = parseInt(obs.time.split(':')[0], 10)
    actualWind[hour] = obs.windKn
    actualGust[hour] = obs.gustKn
  }

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{
        background: 'var(--bg-surface)',
        borderRadius: 12,
        padding: '12px 14px',
        border: '1px solid var(--border)',
        flex: '0 0 calc(50% - 6px)',
      }}>
        <WindGraph
          spotName={todayData.spot}
          currentWind={currentData.current.windKn}
          currentGust={currentData.current.gustKn}
          currentDirDeg={currentData.current.dirDeg}
          threshold={17}
          yMax={40}
          forecastWind={todayData.hourly.map(h => h.forecastWindKn)}
          forecastGust={todayData.hourly.map(h => h.forecastGustKn)}
          actualWind={actualWind}
          actualGust={actualGust}
          nowIndex={nowIndex}
        />
      </div>
    </div>
  )
}
