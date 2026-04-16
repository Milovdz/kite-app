import { useMemo, useState } from 'react'
import { getWindZone, type WindZones, type WindZoneName } from '../utils/windZone'
import { computeKiteableWindows } from '../utils/kiteableWindows'

export interface Slot {
  hour: number
  windKn: number
  gustKn: number
  dirDeg: number
  waveM: number
  wavePeriodS: number
  tempC: number
  rainMm: number
  cloudPct?: number
}

export interface TidePoint {
  time: string
  heightM: number
  type: 'low' | 'high'
}

export interface ForecastDayProps {
  date: string
  spotName?: string
  /** All hourly slots for the day (up to 24). ForecastDay filters to 3h or 1h. */
  allSlots: Slot[]
  tides?: TidePoint[]
  rideableMin?: number
  windZones?: WindZones
}

const SLOT_3H = [6, 9, 12, 15, 18, 21]
const PERIOD_LABELS: Record<number, string> = { 6: 'morning', 12: 'afternoon', 18: 'evening' }

const ZONE_ARROW_COLOR: Record<WindZoneName, string> = {
  onshore:      '#5DCAA5',
  crossOnshore: '#5DCAA5',
  sideShore:    '#5DCAA5',
  offshore:     '#ef4444',
}

const COLORS = {
  tooLight: { bg: 'var(--bg-muted)', text: 'var(--text-primary)' },
  green1:   { bg: '#d1fae5',         text: '#065f46' },
  green2:   { bg: '#6ee7b7',         text: '#064e3b' },
  green3:   { bg: '#10b981',         text: '#ffffff', gust: '#d1fae5' },
  green4:   { bg: '#047857',         text: '#ffffff', gust: '#6ee7b7' },
}

function skyEmoji(pct: number | undefined): string {
  if (pct == null) return '⛅'
  if (pct <= 20) return '☀️'
  if (pct <= 40) return '🌤'
  if (pct <= 60) return '⛅'
  if (pct <= 80) return '🌥'
  return '☁️'
}

function windBand(kn: number) {
  if (kn >= 30) return 'green4'
  if (kn >= 25) return 'green3'
  if (kn >= 20) return 'green2'
  if (kn >= 16) return 'green1'
  return 'tooLight'
}


function formatDay(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const day = d.toLocaleDateString('en-GB', { weekday: 'long' })
  const short = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return { day, short }
}

function degreesToCompass(deg: number) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW']
  return dirs[Math.round(deg / 22.5) % 16]
}

function WindArrow({ deg, size = 18, color = 'var(--text-secondary)' }: { deg: number; size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" style={{ display: 'block', margin: '0 auto' }}>
      <path
        d="M10 2 L14 10 L11 9 L11 18 L9 18 L9 9 L6 10 Z"
        fill={color}
        transform={`rotate(${deg}, 10, 10)`}
      />
    </svg>
  )
}

function TideCurve({ tides }: { tides: TidePoint[] }) {
  if (!tides || tides.length === 0) return null

  const timeToX = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    return Math.max(0, Math.min(400, ((h + m / 60) / 24) * 400))
  }

  const yHigh = 8
  const yLow = 42

  const points = tides.map((t) => ({
    x: timeToX(t.time),
    y: t.type === 'high' ? yHigh : yLow,
    ...t,
  }))

  let pathD = `M0,${points[0].type === 'low' ? yLow : yHigh}`
  points.forEach((p, i) => {
    const prev = i === 0 ? { x: 0, y: points[0].type === 'low' ? yLow : yHigh } : points[i - 1]
    const cpx = (prev.x + p.x) / 2
    pathD += ` C${cpx},${prev.y} ${cpx},${p.y} ${p.x},${p.y}`
  })
  const last = points[points.length - 1]
  const endY = last.type === 'high' ? yLow : yHigh
  const cpxEnd = (last.x + 400) / 2
  pathD += ` C${cpxEnd},${last.y} ${cpxEnd},${endY} 400,${endY}`

  const fillD = pathD + ' L400,52 L0,52 Z'

  return (
    <div style={{ marginTop: 10, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
        Tide
      </div>
      <div style={{ position: 'relative', height: 52 }}>
        <svg width="100%" height="52" viewBox="0 0 400 52" preserveAspectRatio="none" style={{ display: 'block' }}>
          <path d={pathD} fill="none" stroke="#0369a1" strokeWidth="2" opacity="0.6" />
          <path d={fillD} fill="#0369a1" opacity="0.1" />
        </svg>
        {points.map((p, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${(p.x / 400) * 100}%`,
              top: p.type === 'high' ? 0 : 34,
              transform: i === 0 ? 'none' : i === points.length - 1 ? 'translateX(-100%)' : 'translateX(-50%)',
              textAlign: i === 0 ? 'left' : i === points.length - 1 ? 'right' : 'center',
            }}
          >
            {p.type === 'high' ? (
              <>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tide-accent)' }}>H {p.heightM.toFixed(1)}m</div>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.time}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{p.time}</div>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--tide-accent)' }}>L {p.heightM.toFixed(1)}m</div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ForecastDay({
  date,
  spotName = 'IJmuiden',
  allSlots = [],
  tides = [],
  rideableMin = 16,
  windZones,
}: ForecastDayProps) {
  const [resolution, setResolution] = useState<'3h' | '1h'>('3h')
  const { day, short } = useMemo(() => formatDay(date), [date])

  const slots = useMemo(
    () => resolution === '3h'
      ? allSlots.filter((s) => SLOT_3H.includes(s.hour))
      : allSlots,
    [allSlots, resolution],
  )

  const slotZones = useMemo(
    () => slots.map(s => windZones ? getWindZone(s.dirDeg, windZones) : null),
    [slots, windZones],
  )

  const kiteableWindows = useMemo(
    () => computeKiteableWindows(allSlots, rideableMin, windZones),
    [allSlots, rideableMin, windZones],
  )

  const colCount = slots.length
  const gridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${colCount}, 1fr)`,
    gap: resolution === '1h' ? 2 : 3,
  }

  return (
    <div style={rootStyle}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: 500, display: 'flex', alignItems: 'baseline', gap: 8 }}>
          {day}
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 400 }}>
            {short} · {spotName}
          </span>
        </div>
        <button
          onClick={() => setResolution(resolution === '3h' ? '1h' : '3h')}
          style={toggleStyle}
        >
          {resolution === '3h' ? '1h' : '3h'}
        </button>
      </div>


      {/* Period labels — only in 3h mode */}
      {resolution === '3h' && (
        <div style={gridStyle}>
          {slots.map((s) => (
            <div key={s.hour} style={{ fontSize: 11, color: 'var(--text-tertiary)', textAlign: 'center', paddingBottom: 2 }}>
              {PERIOD_LABELS[s.hour] ?? ''}
            </div>
          ))}
        </div>
      )}

      {/* Time labels */}
      <div style={{ ...gridStyle, marginBottom: 3 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ fontSize: resolution === '1h' ? 9 : 11, color: 'var(--text-tertiary)', textAlign: 'center', padding: '2px 0' }}>
            {String(s.hour).padStart(2, '0')}
          </div>
        ))}
      </div>

      {/* Wind tiles */}
      <div style={{ ...gridStyle, marginBottom: 2 }}>
        {slots.map((s) => {
          const band = windBand(s.windKn)
          const c = COLORS[band]
          const compact = resolution === '1h'
          return (
            <div key={s.hour} style={{ ...tileStyle, background: c.bg, minHeight: compact ? 40 : 52, padding: compact ? '4px 1px' : '8px 2px' }}>
              <span style={{ fontSize: compact ? 13 : 20, fontWeight: 500, lineHeight: 1.1, color: c.text }}>{s.windKn}</span>
              <span style={{ fontSize: compact ? 9 : 11, color: ('gust' in c ? c.gust : undefined) || 'var(--text-tertiary)', marginTop: 1 }}>
                G{s.gustKn}
              </span>
            </div>
          )
        })}
      </div>

      {/* Sky conditions */}
      <div style={gridStyle}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: 'center', fontSize: resolution === '1h' ? 13 : 16, padding: '2px 0' }}>
            {skyEmoji(s.cloudPct)}
          </div>
        ))}
      </div>

      {/* Direction arrows */}
      <div style={gridStyle}>
        {slots.map((s, idx) => {
          const zone = slotZones[idx]
          const safe = zone === 'onshore' || zone === 'crossOnshore' || zone === 'sideShore'
          const kiteableSpeed = s.windKn >= rideableMin
          const arrowColor = (safe && kiteableSpeed) ? ZONE_ARROW_COLOR.onshore : 'var(--text-secondary)'
          const label = degreesToCompass(s.dirDeg) + (zone === 'offshore' ? ' ⚠' : '')
          return (
            <div key={s.hour} style={{ textAlign: 'center', padding: '4px 0' }}>
              <WindArrow deg={s.dirDeg + 180} size={resolution === '1h' ? 12 : 18} color={arrowColor} />
              <div style={{ fontSize: resolution === '1h' ? 8 : 10, color: arrowColor, marginTop: 1 }}>
                {label}
              </div>
            </div>
          )
        })}
      </div>

      {/* Wave */}
      <div style={{ ...gridStyle, marginTop: 8, paddingTop: 8, borderTop: '0.5px solid var(--border)' }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>wave</div>
            <div style={{ fontSize: resolution === '1h' ? 11 : 13, color: 'var(--text-secondary)' }}>{s.waveM}m</div>
            {resolution === '1h' && (
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>{s.wavePeriodS}s</div>
            )}
          </div>
        ))}
      </div>

      {/* Temp */}
      <div style={{ ...gridStyle, marginTop: 6 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>temp</div>
            <div style={{ fontSize: resolution === '1h' ? 11 : 13, color: 'var(--text-secondary)' }}>{Math.round(s.tempC)}°</div>
          </div>
        ))}
      </div>

      {/* Rain */}
      <div style={{ ...gridStyle, marginTop: 6 }}>
        {slots.map((s) => (
          <div key={s.hour} style={{ textAlign: 'center' }}>
            <>
              <div style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>rain</div>
              <div style={{ fontSize: resolution === '1h' ? 11 : 13, color: 'var(--text-secondary)' }}>
                {s.rainMm > 0 ? <><span style={precipDotStyle} />{s.rainMm}</> : '–'}
              </div>
            </>
          </div>
        ))}
      </div>

      <TideCurve tides={tides} />

      {kiteableWindows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 12 }}>
          {kiteableWindows.map((w, i) => (
            <div key={i} style={bannerStyle}>
              ▸ Kiteable {w.from} – {w.to} · {w.dir} {w.avgWind} kn · {w.waveStr}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const rootStyle: React.CSSProperties = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  padding: '0',
  '--bg-muted': '#f1f5f9',
  '--text-tertiary': '#94a3b8',
  '--tide-accent': '#0369a1',
} as React.CSSProperties

const bannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 12,
  color: '#065f46',
  background: '#d1fae5',
  padding: '6px 12px',
  borderRadius: 8,
  width: 'fit-content',
}

const toggleStyle: React.CSSProperties = {
  background: 'transparent',
  border: '1px solid var(--border)',
  borderRadius: 4,
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  fontSize: 11,
  padding: '2px 8px',
  fontFamily: 'inherit',
  flexShrink: 0,
}

const tileStyle: React.CSSProperties = {
  borderRadius: 6,
  textAlign: 'center',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  border: '0.5px solid rgba(0,0,0,0.06)',
}

const precipDotStyle: React.CSSProperties = {
  display: 'inline-block',
  width: 5,
  height: 5,
  borderRadius: '50%',
  background: '#378ADD',
  marginRight: 2,
  verticalAlign: 'middle',
}
