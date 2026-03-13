import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Plus, Loader2, X, Check, ChevronDown } from 'lucide-react';
import LogMealModal from '../components/LogMealModal';

const CATEGORIES = [
  'All', 'Grains & Cereals', 'Lentils & Legumes', 'Meat & Poultry',
  'Fish & Seafood', 'Eggs & Dairy', 'Vegetables', 'Fruits',
  'Nuts & Seeds', 'Beverages', 'Snacks & Street Food', 'Oils & Condiments',
];

const CAT_ICONS: Record<string, string> = {
  'All': '🍽', 'Grains & Cereals': '🌾', 'Lentils & Legumes': '🫘',
  'Meat & Poultry': '🍗', 'Fish & Seafood': '🐟', 'Eggs & Dairy': '🥚',
  'Vegetables': '🥦', 'Fruits': '🍎', 'Nuts & Seeds': '🥜',
  'Beverages': '🧃', 'Snacks & Street Food': '🍟', 'Oils & Condiments': '🫙',
};

interface FoodItem {
  id: number; name: string; category: string; subcategory: string;
  calories_per_100g: number; protein_per_100g: number;
  carbs_per_100g: number; fat_per_100g: number; fiber_per_100g: number;
  default_serving_g: number; serving_unit: string;
  is_drink: boolean; tags: string;
}

function calcNutrition(food: FoodItem, grams: number) {
  const r = grams / 100;
  return {
    calories: Math.round(food.calories_per_100g * r),
    protein: Math.round(food.protein_per_100g * r * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * r * 10) / 10,
    fat: Math.round(food.fat_per_100g * r * 10) / 10,
  };
}

// ── Food Card ────────────────────────────────────────────────────────────────
function FoodCard({ food, onAdd }: { food: FoodItem; onAdd: (f: FoodItem) => void }) {
  const [expanded, setExpanded] = useState(false);
  const n = calcNutrition(food, food.default_serving_g);
  const unit = food.serving_unit === 'ml' ? 'ml' : 'g';

  return (
    <div className="card card-hover">
      <div className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${food.is_drink ? 'bg-cyan-50' : 'bg-indigo-50'
            }`}>
            {food.is_drink ? '🧃' : CAT_ICONS[food.category] || '🍽'}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-slate-800 leading-tight truncate">{food.name}</h3>
                <p className="text-[11px] text-slate-400">{food.subcategory}</p>
              </div>
              <button
                onClick={() => onAdd(food)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 bg-indigo-500 text-white rounded-xl text-xs font-semibold hover:bg-indigo-600"
              >
                <Plus className="w-3 h-3" /> Add
              </button>
            </div>

            {/* Per 100g */}
            <div className="mt-1.5 flex items-center flex-wrap gap-x-2 gap-y-1">
              <span className="text-sm font-bold text-slate-900">
                {Math.round(food.calories_per_100g)}
                <span className="text-[11px] font-normal text-slate-400"> kcal/100g</span>
              </span>
              {[
                { l: 'P', v: food.protein_per_100g, c: 'bg-indigo-50 text-indigo-600' },
                { l: 'C', v: food.carbs_per_100g, c: 'bg-cyan-50 text-cyan-600' },
                { l: 'F', v: food.fat_per_100g, c: 'bg-amber-50 text-amber-600' },
              ].map(({ l, v, c }) => (
                <span key={l} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c}`}>
                  {l} {v}g
                </span>
              ))}
            </div>

            {/* Serving info toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-1 flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
            >
              <span>Serving {food.default_serving_g}{unit} = {n.calories} kcal</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Expanded serving breakdown */}
        {expanded && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <div className="grid grid-cols-4 gap-2 mb-2">
              {[
                { label: 'Calories', val: `${n.calories} kcal`, color: 'text-slate-700' },
                { label: 'Protein', val: `${n.protein}g`, color: 'text-indigo-600' },
                { label: 'Carbs', val: `${n.carbs}g`, color: 'text-cyan-600' },
                { label: 'Fat', val: `${n.fat}g`, color: 'text-amber-600' },
              ].map(({ label, val, color }) => (
                <div key={label} className="text-center bg-slate-50 rounded-lg p-2">
                  <p className={`text-xs font-bold ${color}`}>{val}</p>
                  <p className="text-[10px] text-slate-400">{label}</p>
                </div>
              ))}
            </div>
            {food.tags && (
              <div className="flex flex-wrap gap-1">
                {food.tags.split(' ').slice(0, 5).map(tag => (
                  <span key={tag} className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function FoodDatabase() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [drinkFilter, setDrinkFilter] = useState<'all' | 'food' | 'drink'>('all');
  const [logItem, setLogItem] = useState<FoodItem | null>(null);
  const [added, setAdded] = useState<Set<number>>(new Set());
  const [offset, setOffset] = useState(0);
  const timer = useRef<any>(null);
  const LIMIT = 30;

  const fetchItems = useCallback(async (reset = true) => {
    if (reset) setLoading(true); else setLoadingMore(true);
    const currentOffset = reset ? 0 : offset;
    const p = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) });
    if (search.trim()) p.set('q', search.trim());
    if (category !== 'All') p.set('category', category);
    if (drinkFilter === 'drink') p.set('is_drink', 'true');
    if (drinkFilter === 'food') p.set('is_drink', 'false');
    try {
      const data = await fetch(`/api/foods?${p}`).then(r => r.json());
      if (reset) { setItems(data.items || []); setOffset(LIMIT); }
      else { setItems(prev => [...prev, ...(data.items || [])]); setOffset(prev => prev + LIMIT); }
      setTotal(data.total || 0);
    } finally {
      setLoading(false); setLoadingMore(false);
    }
  }, [search, category, drinkFilter, offset]);

  useEffect(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fetchItems(true), 300);
    return () => clearTimeout(timer.current);
  }, [search, category, drinkFilter]);

  function flashAdded(id: number) {
    setAdded(prev => new Set(prev).add(id));
    setTimeout(() => setAdded(prev => { const s = new Set(prev); s.delete(id); return s; }), 2500);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Food & Drinks</h1>
        <p className="text-xs sm:text-sm text-slate-400">{total} items · tap any to quick-log</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="text" value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search any food or drink…"
          className="w-full pl-10 pr-10 py-3 bg-white rounded-2xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 shadow-sm"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Food / Drink toggle */}
      <div className="flex gap-2">
        {([
          { id: 'all' as const, label: 'All', icon: '🍽' },
          { id: 'food' as const, label: 'Food', icon: '🥘' },
          { id: 'drink' as const, label: 'Drinks', icon: '🧃' },
        ]).map(({ id, label, icon }) => (
          <button
            key={id} onClick={() => setDrinkFilter(id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium transition-all ${drinkFilter === id
                ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200'
                : 'bg-white text-slate-600 border border-slate-200'
              }`}
          >
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>

      {/* Category pills — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        {CATEGORIES.map(cat => (
          <button
            key={cat} onClick={() => setCategory(cat)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${category === cat
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200'
              }`}
          >
            <span>{CAT_ICONS[cat]}</span>{cat}
          </button>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
        </div>
      ) : items.length === 0 ? (
        <div className="card p-10 text-center">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-slate-400">No results{search ? ` for "${search}"` : ''}.</p>
          <button onClick={() => { setSearch(''); setCategory('All'); }} className="mt-3 text-sm text-indigo-500">Clear filters</button>
        </div>
      ) : (
        <>
          <p className="text-xs text-slate-400">Showing {items.length} of {total}</p>
          {/* Single column on mobile, 2 cols on sm+ */}
          <div className="grid gap-3 sm:grid-cols-2">
            {items.map(food => (
              <div key={food.id} className="relative">
                {added.has(food.id) && (
                  <div className="absolute inset-0 z-10 bg-emerald-500/10 rounded-2xl border-2 border-emerald-400 flex items-center justify-center pointer-events-none">
                    <div className="bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Check className="w-3 h-3" /> Logged!
                    </div>
                  </div>
                )}
                <FoodCard food={food} onAdd={f => setLogItem(f)} />
              </div>
            ))}
          </div>

          {items.length < total && (
            <button
              onClick={() => fetchItems(false)} disabled={loadingMore}
              className="w-full py-3 border border-slate-200 rounded-2xl text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loadingMore && <Loader2 className="w-4 h-4 animate-spin" />}
              Load more ({total - items.length} remaining)
            </button>
          )}
        </>
      )}

      {logItem && (
        <LogMealModal
          initialFood={logItem}
          onSaved={() => { flashAdded(logItem.id); setLogItem(null); }}
          onClose={() => setLogItem(null)}
        />
      )}
    </div>
  );
}
