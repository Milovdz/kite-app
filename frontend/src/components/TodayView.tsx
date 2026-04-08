import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  ResponsiveContainer,
} from 'recharts'
import todayData from '../data/today.json'
import { windColour } from '../utils/windColour'

const currentHour = new Date().getHours()

export function TodayView() {
  const { spot, current, hourly } = todayData

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1.5rem',
        marginBottom: '1.5rem',
        padding: '1rem 1.5rem',
        background: 'var(--bg-surface)',
        borderRadius: 8,
        border: '1px solid var(--border)',
      }}>
        <div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: 4 }}>
            {spot}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>
            <span
              className="mono"
              style={{
                fontSize: '2.5rem',
                fontWeight: 700,
                color: '#fff',
                background: windColour(current.speed),
                padding: '2px 12px',
                borderRadius: 6,
              }}
            >
              {current.speed}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>kn</span>
            <span
              className="mono"
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginLeft: 8,
              }}
            >
              G{current.gusts}
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>kn</span>
          </div>
        </div>
        <div style={{
          fontSize: '2rem',
          display: 'inline-block',
          transform: `rotate(${current.direction}deg)`,
          marginLeft: 'auto',
          color: 'var(--text-primary)',
        }}>
          ↑
        </div>
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={hourly} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <ReferenceArea y1={0}  y2={15} fill="#4a4a4a" fillOpacity={0.12} />
          <ReferenceArea y1={15} y2={20} fill="#ffd700" fillOpacity={0.12} />
          <ReferenceArea y1={20} y2={25} fill="#ff8c00" fillOpacity={0.12} />
          <ReferenceArea y1={25} y2={32} fill="#dc143c" fillOpacity={0.12} />
          <ReferenceArea y1={32} y2={45} fill="#800080" fillOpacity={0.12} />

          <Area
            dataKey="forecastSpeed"
            fill="var(--teal)"
            stroke="var(--teal)"
            fillOpacity={0.3}
            isAnimationActive={false}
          />
          <Area
            dataKey="forecastGusts"
            fill="var(--pink)"
            stroke="var(--pink)"
            fillOpacity={0.2}
            isAnimationActive={false}
          />
          <Line
            dataKey="actualSpeed"
            stroke="var(--teal)"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            dataKey="actualGusts"
            stroke="var(--pink)"
            dot={false}
            strokeWidth={2}
            connectNulls={false}
            isAnimationActive={false}
          />
          <ReferenceLine
            x={currentHour}
            stroke="var(--now-line)"
            strokeDasharray="4 4"
            label={{ value: 'Now', fill: '#fff', fontSize: 11 }}
          />
          <XAxis
            dataKey="hour"
            tickFormatter={(h) => `${h}:00`}
            interval={2}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={{ stroke: 'var(--border)' }}
            tickLine={false}
          />
          <YAxis
            domain={[0, 40]}
            tick={{ fill: 'var(--text-secondary)', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              color: 'var(--text-primary)',
              fontSize: 12,
            }}
            formatter={(value, name) => [
              `${value} kn`,
              name === 'forecastSpeed' ? 'Forecast' :
              name === 'forecastGusts' ? 'F. Gusts' :
              name === 'actualSpeed' ? 'Actual' : 'A. Gusts',
            ]}
            labelFormatter={(h) => `${h}:00`}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
