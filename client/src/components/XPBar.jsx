export default function XPBar({ totalXP, level, title, xpProgress, currentLevelXP, nextLevelXP }) {
  if (!level) return null

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-bold text-accent">L{level}</span>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">{title}</span>
          <span className="text-xs text-text-secondary">{totalXP} / {nextLevelXP} XP</span>
        </div>
        <div className="w-32 h-2 bg-surface rounded-full overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-500"
            style={{ width: `${xpProgress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
