import { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import MealCard from '../components/MealCard';
import { format, parseISO } from 'date-fns';

export default function History() {
  const [meals, setMeals]   = useState<any[]>([]);
  const [total, setTotal]   = useState(0);
  const [page, setPage]     = useState(1);
  const [loading, setLoading] = useState(true);
  const limit = 10;

  const loadMeals = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/meals?page=${page}&limit=${limit}`).then(r => r.json());
      setMeals(data.meals || []); setTotal(data.total || 0);
    } finally { setLoading(false); }
  }, [page]);

  useEffect(() => { loadMeals(); }, [loadMeals]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this meal?')) return;
    await fetch('/api/meals', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadMeals();
  }
  function handleUpdate(updated: any) {
    setMeals(prev => prev.map(m => m.id === updated.id ? updated : m));
  }

  const totalPages = Math.ceil(total / limit);
  const grouped: Record<string, any[]> = {};
  for (const m of meals) {
    const d = new Date(m.logged_at).toISOString().split('T')[0];
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(m);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Meal History</h1>
          <p className="text-xs sm:text-sm text-slate-400">{total} meals total</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : meals.length === 0 ? (
        <div className="card p-10 sm:p-12 text-center">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-slate-400">No meals logged yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dayMeals]) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs sm:text-sm font-semibold text-slate-500 shrink-0">
                  {format(parseISO(date), 'EEE, MMM d')}
                </span>
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 shrink-0">
                  {Math.round(dayMeals.reduce((s, m) => s + Number(m.total_calories), 0))} kcal
                </span>
              </div>
              <div className="space-y-3">
                {dayMeals.map(meal => (
                  <MealCard key={meal.id} meal={meal} onDelete={handleDelete} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-xl hover:bg-slate-100 disabled:opacity-30">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
