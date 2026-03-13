import { useState, useEffect } from 'react';
import { Plus, Loader2 } from 'lucide-react';
import CalorieRing from '../components/CalorieRing';
import MacroBar from '../components/MacroBar';
import WeeklyChart from '../components/WeeklyChart';
import MealCard from '../components/MealCard';
import InsightCard from '../components/InsightCard';
import LogMealModal from '../components/LogMealModal';

async function safeFetch(url: string) {
  try { const r = await fetch(url); return r.ok ? r.json() : null; }
  catch { return null; }
}

export default function Dashboard() {
  const [todayData, setTodayData]   = useState<any>(null);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [insights, setInsights]     = useState<any[]>([]);
  const [summary, setSummary]       = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [t, w, ins, s] = await Promise.all([
      safeFetch('/api/dashboard?type=today'),
      safeFetch('/api/dashboard?type=weekly'),
      safeFetch('/api/insights?days=1'),
      safeFetch('/api/dashboard?type=summary'),
    ]);
    setTodayData(t); setWeeklyData(w);
    setInsights(Array.isArray(ins) ? ins : []);
    setSummary(s); setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 truncate">Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-400">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-indigo-500 text-white rounded-2xl font-semibold text-sm hover:bg-indigo-600 transition-colors shadow-lg shadow-indigo-200"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden xs:inline">Log Meal</span>
          <span className="xs:hidden">Log</span>
        </button>
      </div>

      {/* 30-day summary strip */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {[
            { label: 'Days Tracked', val: String(summary.daysTracked),      icon: '📅', color: 'text-indigo-600' },
            { label: 'Avg Calories', val: `${summary.avgCalories} kcal`,    icon: '🔥', color: 'text-orange-500' },
            { label: 'Avg Protein',  val: `${summary.avgProtein}g`,         icon: '🥩', color: 'text-indigo-500' },
            { label: 'Avg Score',    val: summary.avgScore ? `${summary.avgScore}/10` : '—', icon: '⭐', color: 'text-amber-500' },
          ].map(({ label, val, icon, color }) => (
            <div key={label} className="card p-3 text-center animate-fadeInUp">
              <div className="text-lg mb-0.5">{icon}</div>
              <p className={`text-base sm:text-lg font-bold ${color} leading-tight`}>{val}</p>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.slice(0, 3).map((ins, i) => (
            <InsightCard key={ins.id || i} insight={ins} />
          ))}
        </div>
      )}

      {/* Calorie ring + macros */}
      {todayData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <CalorieRing consumed={todayData.consumed.calories} goal={todayData.goals.calories} />
          <MacroBar consumed={todayData.consumed} goals={todayData.goals} />
        </div>
      )}

      {/* Weekly chart */}
      {weeklyData && <WeeklyChart data={weeklyData.days} goal={weeklyData.goal} />}

      {/* Today's meals */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm sm:text-base font-semibold text-slate-800">Today's Meals</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            {todayData?.mealCount ?? 0} logged
          </span>
        </div>
        {!todayData || todayData.meals.length === 0 ? (
          <div className="card p-8 sm:p-10 text-center">
            <div className="text-4xl mb-3">🍽</div>
            <p className="text-slate-400 text-sm">No meals logged today.</p>
            <button onClick={() => setShowModal(true)} className="mt-3 text-sm text-indigo-500 font-medium hover:text-indigo-700">
              + Log your first meal
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {todayData.meals.map((meal: any) => (
              <MealCard key={meal.id} meal={meal} onUpdate={() => loadAll()} />
            ))}
          </div>
        )}
      </div>

      {showModal && <LogMealModal onClose={() => setShowModal(false)} onSaved={loadAll} />}
    </div>
  );
}
