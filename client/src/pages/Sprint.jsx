import { useState, useEffect, useCallback } from 'react'
import SprintProgress from '../components/SprintProgress'

export default function Sprint() {
  const [sprint, setSprint] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchSprint = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sprint')
      setSprint(await res.json())
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSprint() }, [fetchSprint])

  const toggleTask = async (index, done) => {
    await fetch('/api/sprint', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskIndex: index, done }),
    })
    fetchSprint()
  }

  const createSprint = async () => {
    const res = await fetch('/api/sprint/new', { method: 'POST' })
    if (res.ok) fetchSprint()
  }

  if (loading) return <div className="p-8 text-text-secondary">Cargando sprint...</div>

  if (!sprint?.exists) {
    return (
      <div className="p-8 flex flex-col items-center gap-4">
        <p className="text-text-secondary text-lg">No hay sprint activo</p>
        <button
          onClick={createSprint}
          className="bg-accent hover:bg-accent-hover text-white px-6 py-2 rounded-lg font-medium transition-colors"
        >
          Crear Sprint de esta semana
        </button>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">
          {sprint.frontmatter?.titulo || 'Sprint Semanal'}
        </h1>
        <button
          onClick={createSprint}
          className="bg-surface hover:bg-surface-hover text-text-primary px-4 py-1.5 rounded-lg text-sm transition-colors border border-surface-hover"
        >
          Nuevo Sprint
        </button>
      </div>

      <div className="mb-6">
        <SprintProgress progress={sprint.progress} completed={sprint.completed} total={sprint.total} />
      </div>

      {sprint.progress === 100 && (
        <div className="bg-success/10 border border-success/30 rounded-lg p-3 mb-6 text-success text-sm">
          Sprint completado al 100% — +50 XP bonus
        </div>
      )}

      <div className="bg-surface rounded-xl p-5">
        <div className="flex flex-col gap-2">
          {sprint.tasks?.map((task, i) => (
            <label
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-hover cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(i, !task.done)}
                className="w-4 h-4 accent-accent"
              />
              <span className={`text-sm ${task.done ? 'line-through text-text-secondary' : 'text-text-primary'}`}>
                {task.text}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
