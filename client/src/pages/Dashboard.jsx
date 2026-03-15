import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useContent } from '../hooks/useContent'
import SprintProgress from '../components/SprintProgress'

export default function Dashboard() {
  const { pieces, loading } = useContent()
  const [sprint, setSprint] = useState(null)
  const [gamification, setGamification] = useState(null)

  useEffect(() => {
    fetch('/api/sprint').then(r => r.json()).then(setSprint).catch(() => {})
    fetch('/api/gamification').then(r => r.json()).then(setGamification).catch(() => {})
  }, [])

  const byStage = pieces.reduce((acc, p) => {
    acc[p.stage] = (acc[p.stage] || 0) + 1
    return acc
  }, {})

  const recentPieces = [...pieces].sort((a, b) =>
    (b.createdDate || '').localeCompare(a.createdDate || '')
  ).slice(0, 5)

  const bufferPieces = pieces.filter(p => p.stage === 'buffer')

  if (loading) return <div className="p-8 text-text-secondary">Cargando...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Streak highlight */}
      {gamification?.streaks?.production && (
        <div className="bg-surface rounded-xl p-6 mb-6 flex items-center gap-6">
          <div className="text-center">
            <div className="text-5xl font-bold text-accent">
              {gamification.streaks.production.current}
            </div>
            <div className="text-sm text-text-secondary mt-1">dias de racha</div>
          </div>
          <div className="text-sm text-text-secondary">
            <p>Record personal: {gamification.streaks.production.best} dias</p>
            <p className="mt-1">Nivel {gamification.level}: {gamification.title}</p>
            <p>{gamification.totalXP} XP total</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* Pipeline summary */}
        <div className="bg-surface rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Pipeline</h3>
          <div className="space-y-2">
            {[
              { label: 'Ideas', key: 'idea', color: 'bg-blue-500' },
              { label: 'Redaccion', key: 'redaccion', color: 'bg-yellow-500' },
              { label: 'Produccion', key: 'produccion', color: 'bg-purple-500' },
              { label: 'Buffer', key: 'buffer', color: 'bg-green-500' },
              { label: 'Publicado', key: 'publicado', color: 'bg-accent' },
            ].map(s => (
              <div key={s.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${s.color}`} />
                  <span className="text-sm">{s.label}</span>
                </div>
                <span className="text-sm font-medium">{byStage[s.key] || 0}</span>
              </div>
            ))}
          </div>
          <Link to="/pipeline" className="text-xs text-accent hover:text-accent-hover mt-3 inline-block">
            Ver pipeline &rarr;
          </Link>
        </div>

        {/* Sprint */}
        <div className="bg-surface rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Sprint Semanal</h3>
          {sprint?.exists ? (
            <>
              <p className="text-sm mb-2 text-text-primary">{sprint.frontmatter?.titulo}</p>
              <SprintProgress progress={sprint.progress} completed={sprint.completed} total={sprint.total} />
              <Link to="/sprint" className="text-xs text-accent hover:text-accent-hover mt-3 inline-block">
                Ver sprint &rarr;
              </Link>
            </>
          ) : (
            <p className="text-sm text-text-secondary">No hay sprint activo</p>
          )}
        </div>

        {/* Buffer */}
        <div className="bg-surface rounded-xl p-5">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Buffer</h3>
          <div className="text-3xl font-bold text-success mb-1">{bufferPieces.length}</div>
          <p className="text-sm text-text-secondary mb-2">piezas listas</p>
          {bufferPieces.slice(0, 3).map(p => (
            <Link
              key={p.filename}
              to={`/piece/${encodeURIComponent(p.filename)}`}
              className="block text-sm text-text-primary hover:text-accent truncate"
            >
              {p.title}
            </Link>
          ))}
        </div>
      </div>

      {/* Recent pieces */}
      <div className="bg-surface rounded-xl p-5">
        <h3 className="text-sm font-semibold text-text-secondary mb-3">Piezas Recientes</h3>
        {recentPieces.length === 0 ? (
          <p className="text-sm text-text-secondary">No hay piezas aun</p>
        ) : (
          <div className="space-y-2">
            {recentPieces.map(p => (
              <Link
                key={p.filename}
                to={`/piece/${encodeURIComponent(p.filename)}`}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-hover transition-colors"
              >
                <span className="text-sm text-text-primary">{p.title}</span>
                <span className="text-xs text-text-secondary">{p.stage}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
