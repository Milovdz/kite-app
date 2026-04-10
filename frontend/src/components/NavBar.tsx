import type { View } from '../App'

interface Props {
  view: View
  onSwitch: (v: View) => void
}

const TAB_LABELS: Record<View, string> = {
  home: 'Home',
  today: 'Today',
  week: '7 Days',
}

export function NavBar({ view, onSwitch }: Props) {
  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      width: '100%',
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
      height: 52,
      zIndex: 100,
      gap: '1rem',
    }}>
      <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--teal)', marginRight: 'auto' }}>
        KiteWind
      </span>
      <div style={{ display: 'flex', gap: 4 }}>
        {(['home', 'today', 'week'] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => onSwitch(v)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 1rem',
              height: 52,
              color: view === v ? 'var(--teal)' : 'var(--text-secondary)',
              borderBottom: view === v ? '2px solid var(--teal)' : '2px solid transparent',
              fontSize: '0.9rem',
              fontFamily: 'inherit',
              transition: 'color 0.15s',
            }}
          >
            {TAB_LABELS[v]}
          </button>
        ))}
      </div>
    </nav>
  )
}
