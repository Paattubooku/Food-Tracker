interface Props {
  score: number;
  showLabel?: boolean;
}

export default function HealthScore({ score, showLabel = true }: Props) {
  const n = Number(score);
  let color = 'text-red-500 bg-red-50';
  let label = 'Poor';
  let dot = 'bg-red-400';

  if (n >= 8) { color = 'text-emerald-600 bg-emerald-50'; label = 'Excellent'; dot = 'bg-emerald-400'; }
  else if (n >= 6.5) { color = 'text-green-600 bg-green-50'; label = 'Good'; dot = 'bg-green-400'; }
  else if (n >= 5) { color = 'text-amber-600 bg-amber-50'; label = 'Fair'; dot = 'bg-amber-400'; }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {n.toFixed(1)}{showLabel && <span className="opacity-70">{label}</span>}
    </span>
  );
}
