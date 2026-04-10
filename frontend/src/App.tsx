import { useState } from 'react'
import { NavBar } from './components/NavBar'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import './index.css'

export type View = 'today' | 'week'

export default function App() {
  const [view, setView] = useState<View>('today')
  return (
    <>
      <NavBar view={view} onSwitch={setView} />
      <main style={{ marginTop: 52, padding: '1.5rem' }}>
        {view === 'today' && <TodayView />}
        {view === 'week' && <WeekView />}
      </main>
    </>
  )
}
