import { Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Dashboard from './pages/Dashboard'
import Pipeline from './pages/Pipeline'
import Sprint from './pages/Sprint'
import Piece from './pages/Piece'
import XPBar from './components/XPBar'

function Sidebar() {
  const links = [
    { to: '/', label: 'Dashboard', icon: '~' },
    { to: '/pipeline', label: 'Pipeline', icon: '#' },
    { to: '/sprint', label: 'Sprint', icon: '>' },
  ]

  return (
    <nav className="w-48 bg-surface min-h-screen p-4 flex flex-col gap-1 border-r border-surface-hover">
      <div className="text-lg font-bold text-accent mb-6 px-2">Nazho Studio</div>
      {links.map(link => (
        <NavLink
          key={link.to}
          to={link.to}
          end={link.to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive
                ? 'bg-accent/15 text-accent font-medium'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-hover'
            }`
          }
        >
          <span className="w-5 text-center font-mono">{link.icon}</span>
          {link.label}
        </NavLink>
      ))}
    </nav>
  )
}

function Header() {
  const [gamification, setGamification] = useState(null)
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    fetch('/api/gamification')
      .then(r => r.json())
      .then(data => {
        setGamification(data)
        setStreak(data?.streaks?.production?.current || 0)
      })
      .catch(() => {})
  }, [])

  return (
    <header className="h-12 bg-surface border-b border-surface-hover flex items-center justify-between px-5">
      <div className="flex items-center gap-3">
        <span className="text-sm">
          <span className="text-accent font-bold">Racha: {streak} dias</span>
        </span>
      </div>
      {gamification && (
        <XPBar
          totalXP={gamification.totalXP}
          level={gamification.level}
          title={gamification.title}
          xpProgress={gamification.xpProgress}
          currentLevelXP={gamification.currentLevelXP}
          nextLevelXP={gamification.nextLevelXP}
        />
      )}
    </header>
  )
}

export default function App() {
  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pipeline" element={<Pipeline />} />
            <Route path="/sprint" element={<Sprint />} />
            <Route path="/piece/:filename" element={<Piece />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
