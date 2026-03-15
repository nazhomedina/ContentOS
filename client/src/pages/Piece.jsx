import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useContent } from '../hooks/useContent'

const STAGE_LABELS = {
  idea: 'Idea',
  redaccion: 'Redaccion',
  produccion: 'Produccion',
  buffer: 'Buffer',
  publicado: 'Publicado',
}

export default function Piece() {
  const { filename } = useParams()
  const navigate = useNavigate()
  const { getPiece, updatePiece, movePiece } = useContent()
  const [piece, setPiece] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPiece(filename).then(setPiece).catch(console.error).finally(() => setLoading(false))
  }, [filename, getPiece])

  const handleMove = async (toStage) => {
    try {
      await movePiece(piece.filename, piece.stageDir, toStage)
      const updated = await getPiece(filename)
      setPiece(updated)
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-8 text-text-secondary">Cargando...</div>
  if (!piece) return <div className="p-8 text-text-secondary">Pieza no encontrada</div>

  const stages = ['ideas', 'redaccion', 'produccion', 'buffer', 'publicado']

  return (
    <div className="p-6 max-w-4xl">
      <button
        onClick={() => navigate(-1)}
        className="text-text-secondary hover:text-text-primary text-sm mb-4 inline-block"
      >
        &larr; Volver
      </button>

      <div className="bg-surface rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <h1 className="text-2xl font-bold">{piece.title}</h1>
          <span className="text-xs bg-accent/20 text-accent px-2 py-1 rounded font-medium">
            {STAGE_LABELS[piece.stage] || piece.stage}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-3 mb-6 text-sm">
          {piece.format && (
            <span className="bg-surface-hover px-2 py-1 rounded text-text-secondary">
              Formato: {piece.format}
            </span>
          )}
          {piece.pillar && (
            <span className="bg-surface-hover px-2 py-1 rounded text-text-secondary">
              Pilar: {piece.pillar}
            </span>
          )}
          {piece.channel && (
            <span className="bg-surface-hover px-2 py-1 rounded text-text-secondary">
              Canal: {piece.channel}
            </span>
          )}
          {piece.series && (
            <span className="bg-surface-hover px-2 py-1 rounded text-text-secondary">
              Serie: {piece.series}
            </span>
          )}
          {piece.publishDate && (
            <span className="bg-surface-hover px-2 py-1 rounded text-text-secondary">
              Publicacion: {piece.publishDate}
            </span>
          )}
        </div>

        {/* Move buttons */}
        <div className="flex gap-2 mb-6">
          {stages.map(s => {
            const stageId = s === 'ideas' ? 'idea' : s
            const isCurrent = piece.stage === stageId
            return (
              <button
                key={s}
                disabled={isCurrent}
                onClick={() => handleMove(s)}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                  isCurrent
                    ? 'bg-accent text-white'
                    : 'bg-surface-hover text-text-secondary hover:text-text-primary hover:bg-surface-hover'
                }`}
              >
                {STAGE_LABELS[stageId] || s}
              </button>
            )
          })}
        </div>

        {/* Content body */}
        <div className="border-t border-surface-hover pt-4">
          <h3 className="text-sm font-semibold text-text-secondary mb-3">Contenido</h3>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap text-sm text-text-primary leading-relaxed">
            {piece.body || <span className="text-text-secondary italic">Sin contenido</span>}
          </div>
        </div>
      </div>
    </div>
  )
}
