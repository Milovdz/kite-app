import { FC } from 'react'

interface WindGraphProps {
  spotName?: string
  currentWind: number
  currentGust: number
  currentDirDeg?: number
  threshold?: number
  yMax?: number
  forecastWind?: number[]
  forecastGust?: number[]
  actualWind?: (number | null)[]
  actualGust?: (number | null)[]
  nowIndex?: number
}

declare const WindGraph: FC<WindGraphProps>
export default WindGraph
