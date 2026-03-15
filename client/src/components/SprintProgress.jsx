export default function SprintProgress({ progress, completed, total }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${progress}%`,
            backgroundColor: progress === 100 ? 'var(--color-success)' : 'var(--color-accent)',
          }}
        />
      </div>
      <span className="text-sm text-text-secondary whitespace-nowrap">
        {completed}/{total} ({progress}%)
      </span>
    </div>
  )
}
