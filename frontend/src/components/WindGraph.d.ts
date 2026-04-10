import { FC } from 'react'
import type { WindZoneName } from '../utils/windZone'

interface WindGraphProps {
  spotName?: string
  currentWind: number
  currentGust: number
  currentDirDeg?: number
  windZone?: WindZoneName
  threshold?: number
  yMax?: number
  forecastWind?: number[]
  forecastGust?: number[]
  actuals?: Array<{ time: string; windKn: number | null; gustKn: number | null; dirDeg: number | null }>
  nowTime?: string
}

declare const WindGraph: FC<WindGraphProps>
export default WindGraph
