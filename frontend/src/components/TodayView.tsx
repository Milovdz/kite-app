import { useState, useEffect, useMemo } from 'react'
import WindGraph from './WindGraph'
import { DATA_BASE_URL_FOR, SPOTS, APP_TZ } from '../config'
import type { SpotSlug } from '../config'

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
  current: { windKn: number; gustKn: number; dirDeg: number } | null
  actuals: Array<{ time: string; windKn: number | null; gustKn: number | null; dirDeg: number | null }>
}

function SpotTodayCard({ slug, name }: { slug: SpotSlug; name: string }) {
  const [todayData, setTodayData] = useState<TodayData | null>(null)
  const [currentData, setCurrentData] = useState<CurrentData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const base = DATA_BASE_URL_FOR(slug)
    Promise.all([
      fetch(`${base}/today.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
      fetch(`${base}/current.json`).then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() }),
    ])
      .then(([today, current]) => { setTodayData(today); setCurrentData(current) })
      .catch(e => setError(String(e)))
  }, [slug])

  const now = new Date().toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: APP_TZ })

  const forecastWind = useMemo(() => todayData?.hourly.map(h => h.forecastWindKn) ?? [], [todayData])
  const forecastGust = useMemo(() => todayData?.hourly.map(h => h.forecastGustKn) ?? [], [todayData])
  const actuals = useMemo(() => currentData?.actuals ?? [], [currentData])

  return (
    <div style={{
      background: 'var(--bg-surface)',
      borderRadius: 12,
      padding: '12px 14px',
      border: '1px solid var(--border)',
    }}>
      {error && <div style={{ color: 'red', padding: 8 }}>{name}: {error}</div>}
      {!error && (!todayData || !currentData) && (
        <div style={{ padding: 8, color: 'var(--text-secondary)' }}>Loading {name}…</div>
      )}
      {todayData && currentData && (
        <WindGraph
          spotName={name}
          currentWind={currentData.current?.windKn ?? 0}
          currentGust={currentData.current?.gustKn ?? 0}
          currentDirDeg={currentData.current?.dirDeg ?? 0}
          threshold={17}
          yMax={40}
          forecastWind={forecastWind}
          forecastGust={forecastGust}
          actuals={actuals}
          nowTime={now}
        />
      )}
    </div>
  )
}

export function TodayView() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
      {SPOTS.map(s => (
        <SpotTodayCard key={s.slug} slug={s.slug} name={s.name} />
      ))}
    </div>
  )
}
