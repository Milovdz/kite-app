import WindGraph from './WindGraph'
import todayData from '../data/today.json'

const nowIndex = new Date().getHours()

export function TodayView() {
  const { spot, current, hourly } = todayData
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
      spotName={spot}
      currentWind={current.speed}
      currentGust={current.gusts}
      currentDirDeg={current.direction}
      threshold={17}
      yMax={40}
      forecastWind={hourly.map(h => h.forecastSpeed)}
      forecastGust={hourly.map(h => h.forecastGusts)}
      actualWind={hourly.map(h => h.actualSpeed ?? null)}
      actualGust={hourly.map(h => h.actualGusts ?? null)}
      nowIndex={nowIndex}
    />
    </div>
    </div>
  )
}
