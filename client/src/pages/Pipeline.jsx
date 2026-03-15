import { useState, useCallback } from 'react'
import { useContent } from '../hooks/useContent'
import PieceCard from '../components/PieceCard'

const STAGES = [
  { id: 'idea', label: 'Ideas', dir: 'ideas', color: 'border-blue-500' },
  { id: 'redaccion', label: 'Redaccion', dir: 'redaccion', color: 'border-yellow-500' },
  { id: 'produccion', label: 'Produccion', dir: 'produccion', color: 'border-purple-500' },
  { id: 'buffer', label: 'Buffer', dir: 'buffer', color: 'border-green-500' },
  { id: 'publicado', label: 'Publicado', dir: 'publicado', color: 'border-accent' },
]

export default function Pipeline() {
  const { pieces, loading, movePiece, fetchPieces } = useContent()
  const [search, setSearch] = useState('')
  const [filterFormat, setFilterFormat] = useState('')
  const [dragItem, setDragItem] = useState(null)
  const [dragOverStage, setDragOverStage] = useState(null)

  const filtered = pieces.filter(p => {
    if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false
    if (filterFormat && p.format !== filterFormat) return false
    return true
  })

  const byStage = STAGES.reduce((acc, s) => {
    acc[s.id] = filtered.filter(p => p.stage === s.id)
    return acc
  }, {})

  const formats = [...new Set(pieces.map(p => p.format).filter(Boolean))]

  const handleDragStart = useCallback((e, piece) => {
    setDragItem(piece)
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, stageId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverStage(stageId)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOverStage(null)
  }, [])

  const handleDrop = useCallback(async (e, toStage) => {
    e.preventDefault()
    setDragOverStage(null)
    if (!dragItem || dragItem.stage === toStage) {
      setDragItem(null)
      return
    }
    try {
      await movePiece(dragItem.filename, dragItem.stageDir, toStage === 'idea' ? 'ideas' : toStage)
    } catch (err) {
      console.error('Move failed:', err)
    }
    setDragItem(null)
  }, [dragItem, movePiece])

  if (loading) return <div className="p-8 text-text-secondary">Cargando pipeline...</div>

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none"
        />
        <select
          value={filterFormat}
          onChange={e => setFilterFormat(e.target.value)}
          className="bg-surface border border-surface-hover rounded-lg px-3 py-1.5 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="">Todos los formatos</option>
          {formats.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-5 gap-4 min-h-[calc(100vh-200px)]">
        {STAGES.map(stage => (
          <div
            key={stage.id}
            onDragOver={e => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, stage.id)}
            className={`bg-bg rounded-xl border-t-2 ${stage.color} p-3 transition-colors ${
              dragOverStage === stage.id ? 'bg-surface/50 ring-2 ring-accent/30' : ''
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wider">
                {stage.label}
              </h3>
              <span className="text-xs bg-surface px-2 py-0.5 rounded-full text-text-secondary">
                {byStage[stage.id]?.length || 0}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {byStage[stage.id]?.map(piece => (
                <div
                  key={piece.filename}
                  draggable
                  onDragStart={e => handleDragStart(e, piece)}
                >
                  <PieceCard
                    piece={piece}
                    isDragging={dragItem?.filename === piece.filename}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
