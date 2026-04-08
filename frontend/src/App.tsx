import { useState } from 'react'
import { NavBar } from './components/NavBar'
import { TodayView } from './components/TodayView'
import { WeekView } from './components/WeekView'
import './index.css'

export default function App() {
  const [view, setView] = useState<'today' | 'week'>('today')
  return (
    <>
      <NavBar view={view} onSwitch={setView} />
      <main style={{ marginTop: 52, padding: '1.5rem' }}>
        {view === 'today' ? <TodayView /> : <WeekView />}
      </main>
    </>
  )
}
