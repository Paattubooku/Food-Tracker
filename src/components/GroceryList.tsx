import { ShoppingCart, AlertTriangle, Lightbulb, CheckCircle } from 'lucide-react';

interface GroceryData {
  available: boolean;
  message?: string;
  groceryList: {
    regulars: Array<{ name: string; frequency: number; avgPortion: string }>;
    nutritionGaps: Array<{ gap: string; message: string; suggestions: string[] }>;
    suggested: string[];
  };
  summary: { avgDailyCalories: number; avgDailyProtein: number; daysTracked: number; uniqueFoods: number };
}

export default function GroceryList({ data }: { data: GroceryData | null }) {
  if (!data) return <div className="card p-8 text-center text-slate-400 text-sm">Loading…</div>;

  if (!data.available) {
    return (
      <div className="card p-8 text-center">
        <ShoppingCart className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400 text-sm">{data.message}</p>
      </div>
    );
  }

  const { groceryList, summary } = data;

  return (
    <div className="space-y-4">
      {/* Summary strip */}
      <div className="card p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          {[
            { label: 'Foods tracked',  val: summary.uniqueFoods,        color: 'text-indigo-600' },
            { label: 'Days of data',   val: summary.daysTracked,        color: 'text-slate-700' },
            { label: 'Avg kcal/day',   val: summary.avgDailyCalories,   color: 'text-orange-500' },
            { label: 'Avg protein',    val: `${summary.avgDailyProtein}g`, color: 'text-indigo-500' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <p className={`text-lg font-bold ${color}`}>{val}</p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Regulars */}
      {groceryList.regulars.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <ShoppingCart className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Your Regular Items</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groceryList.regulars.map((item, i) => (
              <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                  <span className="text-sm font-medium text-slate-700 truncate">{item.name}</span>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{item.frequency}× · {item.avgPortion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nutrition gaps */}
      {groceryList.nutritionGaps.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">Fill Nutrition Gaps</h3>
          </div>
          <div className="space-y-4">
            {groceryList.nutritionGaps.map((gap, i) => (
              <div key={i}>
                <p className="text-sm font-semibold text-amber-700">{gap.gap}</p>
                <p className="text-xs text-slate-500 mb-2">{gap.message}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {gap.suggestions.map((s, j) => (
                    <div key={j} className="bg-amber-50 text-amber-800 text-xs rounded-lg px-2.5 py-1.5">🔹 {s}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart suggestions */}
      {groceryList.suggested.length > 0 && (
        <div className="card p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-semibold text-slate-700">Try Adding These</h3>
          </div>
          <div className="space-y-2">
            {groceryList.suggested.map((s, i) => (
              <div key={i} className="bg-indigo-50 text-indigo-800 text-sm rounded-xl px-3 py-2.5">💡 {s}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
