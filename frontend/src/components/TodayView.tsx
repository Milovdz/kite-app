import { useState, useEffect } from 'react'
import WindGraph from './WindGraph'
import { DATA_BASE_URL_FOR, APP_TZ } from '../config'

const DATA_BASE_URL = DATA_BASE_URL_FOR('ijmuiden')

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

  const now = new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TZ })

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
          actuals={currentData.actuals}
          nowTime={now}
        />
      </div>
    </div>
  )
}
