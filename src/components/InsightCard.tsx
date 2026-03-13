interface Insight {
  id?: string;
  insight_type?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'success' | 'danger';
  insight_date?: string;
}

const styles: Record<string, { bg: string; border: string; icon: string; title: string }> = {
  info: { bg: 'bg-blue-50', border: 'border-blue-100', icon: '💡', title: 'text-blue-800' },
  warning: { bg: 'bg-amber-50', border: 'border-amber-100', icon: '⚠️', title: 'text-amber-800' },
  success: { bg: 'bg-emerald-50', border: 'border-emerald-100', icon: '✅', title: 'text-emerald-800' },
  danger: { bg: 'bg-red-50', border: 'border-red-100', icon: '🚨', title: 'text-red-800' },
};

export default function InsightCard({ insight }: { insight: Insight }) {
  const s = styles[insight.severity] || styles.info;
  return (
    <div className={`rounded-2xl border p-4 ${s.bg} ${s.border} animate-fadeInUp`}>
      <div className="flex items-start gap-3">
        <span className="text-xl mt-0.5">{s.icon}</span>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm font-semibold ${s.title}`}>{insight.title}</h4>
          <p className="mt-1 text-sm text-slate-600 leading-relaxed">{insight.message}</p>
          {insight.insight_date && (
            <p className="mt-1.5 text-xs text-slate-400">
              {new Date(insight.insight_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
