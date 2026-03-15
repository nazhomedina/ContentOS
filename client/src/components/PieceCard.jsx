import { useNavigate } from 'react-router-dom'

const FORMAT_COLORS = {
  reel: 'bg-purple-600',
  carrusel: 'bg-blue-600',
  story: 'bg-pink-600',
  newsletter: 'bg-green-600',
  youtube: 'bg-red-600',
  thread: 'bg-sky-600',
}

const CHANNEL_LABELS = {
  instagram: 'IG',
  youtube: 'YT',
  newsletter: 'NL',
  twitter: 'TW',
}

export default function PieceCard({ piece, isDragging }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate(`/piece/${encodeURIComponent(piece.filename)}`)}
      className={`bg-surface rounded-lg p-3 cursor-pointer hover:bg-surface-hover transition-colors border border-transparent hover:border-accent/30 ${isDragging ? 'opacity-50 rotate-2' : ''}`}
    >
      <h4 className="text-sm font-medium text-text-primary mb-2 leading-tight">
        {piece.title}
      </h4>
      <div className="flex items-center gap-2 flex-wrap">
        {piece.format && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded text-white ${FORMAT_COLORS[piece.format] || 'bg-gray-600'}`}>
            {piece.format}
          </span>
        )}
        {piece.channel && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-secondary">
            {CHANNEL_LABELS[piece.channel] || piece.channel}
          </span>
        )}
        {piece.series && (
          <span className="text-[10px] text-text-secondary truncate max-w-[100px]">
            {piece.series}
          </span>
        )}
      </div>
    </div>
  )
}
