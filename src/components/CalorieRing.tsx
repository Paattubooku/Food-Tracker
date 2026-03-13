interface Props {
  consumed: number;
  goal: number;
}

export default function CalorieRing({ consumed, goal }: Props) {
  const pct = Math.min(1, consumed / Math.max(1, goal));
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const over = consumed > goal;
  const remaining = Math.max(0, goal - consumed);

  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-500">Today's Calories</h3>

      {/* Ring + stats side by side */}
      <div className="flex items-center gap-4 sm:gap-6 w-full">
        {/* Ring — fluid, max 130px */}
        <div className="relative shrink-0 w-[110px] sm:w-[130px]">
          <svg viewBox="0 0 120 120" className="w-full h-auto" aria-hidden="true">
            <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="60" cy="60" r={r}
              fill="none"
              stroke={over ? '#ef4444' : '#4f46e5'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold" style={{ color: over ? '#ef4444' : '#0f172a' }}>
              {Math.round(consumed)}
            </span>
            <span className="text-[10px] text-slate-400">/ {goal}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex-1 grid grid-cols-1 gap-2">
          <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3">
            <p className="text-sm sm:text-base font-bold" style={{ color: over ? '#ef4444' : '#4f46e5' }}>
              {over ? `+${Math.round(consumed - goal)}` : Math.round(remaining)}
            </p>
            <p className="text-xs text-slate-400">{over ? 'kcal over' : 'kcal left'}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-2.5 sm:p-3">
            <p className="text-sm sm:text-base font-bold text-slate-700">{Math.round(pct * 100)}%</p>
            <p className="text-xs text-slate-400">of daily goal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
