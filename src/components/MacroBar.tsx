interface MacroProps {
  consumed: { protein: number; carbs: number; fat: number };
  goals: { protein: number; carbs: number; fat: number };
}

const macros = [
  { key: 'protein' as const, label: 'Protein', color: '#4f46e5', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { key: 'carbs' as const, label: 'Carbs', color: '#06b6d4', bg: 'bg-cyan-50', text: 'text-cyan-600' },
  { key: 'fat' as const, label: 'Fat', color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600' },
];

export default function MacroBar({ consumed, goals }: MacroProps) {
  return (
    <div className="card p-5 space-y-4">
      <h3 className="text-sm font-semibold text-slate-500">Macronutrients</h3>
      {macros.map(({ key, label, color, text }) => {
        const pct = Math.min(100, (consumed[key] / Math.max(1, goals[key])) * 100);
        const over = consumed[key] > goals[key];
        return (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              <span className={`text-sm font-semibold font-mono ${text}`}>
                {Math.round(consumed[key])}g
                <span className="text-slate-400 font-sans text-xs font-normal"> / {goals[key]}g</span>
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: over ? '#ef4444' : color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
