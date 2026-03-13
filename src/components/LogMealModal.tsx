import { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2, Search, Check, Camera } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

interface LoggedItem {
  food_name: string;
  weight_g: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  baseFood?: any;
}

interface Props {
  initialFood?: any;
  onClose: () => void;
  onSaved: () => void;
}

function calcNutrition(food: any, grams: number) {
  const r = grams / 100;
  const f = food.fat_per_100g ?? food.fat_g_per_100g ?? 0;
  return {
    calories: Math.round(food.calories_per_100g * r),
    protein: Math.round(food.protein_per_100g * r * 10) / 10,
    carbs: Math.round(food.carbs_per_100g * r * 10) / 10,
    fat: Math.round(f * r * 10) / 10,
  };
}

export default function LogMealModal({ initialFood, onClose, onSaved }: Props) {
  const [mealType, setMealType] = useState('other');
  const [items, setItems] = useState<LoggedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Search state
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<any>(null);

  // AI Upload state
  const [analyzingImage, setAnalyzingImage] = useState(false);
  const [pendingAIFood, setPendingAIFood] = useState<{ primary_food: string, possible_alternatives: string[], weight_g: number } | null>(null);
  const [fetchingNutrition, setFetchingNutrition] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { authorizedFetch } = useAuth();

  useEffect(() => {
    if (initialFood) {
      const n = calcNutrition(initialFood, initialFood.default_serving_g);
      setItems([{
        food_name: initialFood.name,
        weight_g: String(initialFood.default_serving_g),
        calories: String(n.calories),
        protein_g: String(n.protein),
        carbs_g: String(n.carbs),
        fat_g: String(n.fat),
        baseFood: initialFood
      }]);
    } else {
      setItems([{ food_name: '', weight_g: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }]);
    }
  }, [initialFood]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await authorizedFetch(`/api/foods?limit=5&q=${encodeURIComponent(query)}`).then(r => r.json());
        setResults(res.items || []);
      } finally { setSearching(false); }
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [query]);

  function addFoodFromDb(food: any) {
    const n = calcNutrition(food, food.default_serving_g);
    const newItem = {
      food_name: food.name,
      weight_g: String(food.default_serving_g),
      calories: String(n.calories),
      protein_g: String(n.protein),
      carbs_g: String(n.carbs),
      fat_g: String(n.fat),
      baseFood: food
    };
    setItems(prev => {
      if (prev.length === 1 && !prev[0].food_name) return [newItem];
      return [...prev, newItem];
    });
    setQuery('');
    setResults([]);
  }

  function addItem() {
    setItems(prev => [...prev, { food_name: '', weight_g: '', calories: '', protein_g: '', carbs_g: '', fat_g: '' }]);
  }

  function updateItem(idx: number, field: keyof LoggedItem, value: string) {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it;
      const updated = { ...it, [field]: value };
      if (field === 'weight_g' && it.baseFood) {
        const grams = parseFloat(value) || 0;
        const n = calcNutrition(it.baseFood, grams);
        updated.calories = String(n.calories);
        updated.protein_g = String(n.protein);
        updated.carbs_g = String(n.carbs);
        updated.fat_g = String(n.fat);
      }
      return updated;
    }));
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setAnalyzingImage(true);

    try {
      // 1. Convert to Base64
      const reader = new FileReader();
      const base64Promise = new Promise<{ base64: string, mimeType: string }>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve({ base64, mimeType: file.type });
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const { base64, mimeType } = await base64Promise;

      // 2. Send to API
      const res = await authorizedFetch('/api/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze image');

      if (data.primary_food || data.food_name) {
        setPendingAIFood({
          primary_food: data.primary_food || data.food_name || 'Unknown food',
          possible_alternatives: data.possible_alternatives || [],
          weight_g: data.weight_g || 300
        });
      } else if (data.items && Array.isArray(data.items) && data.items.length > 0) {
        setPendingAIFood({
          primary_food: data.items[0].primary_food || data.items[0].food_name || 'Unknown food',
          possible_alternatives: data.items[0].possible_alternatives || [],
          weight_g: data.items[0].weight_g || 300
        });
      } else {
        throw new Error('AI could not detect any food in the image.');
      }
    } catch (err: any) {
      setError(err.message || 'Error processing image.');
    } finally {
      setAnalyzingImage(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function confirmAIFood(foodName: string) {
    if (!pendingAIFood) return;
    setError('');
    setFetchingNutrition(true);
    try {
      const res = await authorizedFetch('/api/estimate-nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ food_name: foodName, weight_g: pendingAIFood.weight_g }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to estimate nutrition');

      const newItem = {
        food_name: data.food_name || foodName,
        weight_g: String(data.weight_g || pendingAIFood.weight_g),
        calories: String(data.calories || 0),
        protein_g: String(data.protein_g || 0),
        carbs_g: String(data.carbs_g || 0),
        fat_g: String(data.fat_g || 0),
      };

      setItems(prev => {
        if (prev.length === 1 && !prev[0].food_name) return [newItem];
        return [...prev, newItem];
      });
      setPendingAIFood(null);
    } catch (err: any) {
      setError(err.message || 'Error estimating nutrition.');
    } finally {
      setFetchingNutrition(false);
    }
  }

  async function handleSave() {
    const validItems = items.filter(it => it.food_name.trim());
    if (validItems.length === 0) { setError('Add at least one food item'); return; }
    setSaving(true); setError('');
    try {
      const parsedItems = validItems.map(it => ({
        food_name: it.food_name.trim(),
        weight_g: parseFloat(it.weight_g) || 0,
        calories: parseFloat(it.calories) || 0,
        protein_g: parseFloat(it.protein_g) || 0,
        carbs_g: parseFloat(it.carbs_g) || 0,
        fat_g: parseFloat(it.fat_g) || 0,
      }));
      const totals = parsedItems.reduce((acc, it) => ({
        total_calories: acc.total_calories + it.calories,
        total_protein: acc.total_protein + it.protein_g,
        total_carbs: acc.total_carbs + it.carbs_g,
        total_fat: acc.total_fat + it.fat_g,
      }), { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });

      const res = await authorizedFetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meal_type: mealType, ...totals, input_type: 'text', items: parsedItems }),
      });
      if (!res.ok) throw new Error('Failed to save meal');
      onSaved(); onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl max-h-[92vh] flex flex-col shadow-2xl relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Log a Meal</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 min-h-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* AI Upload Section */}
          <div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleImageUpload}
              disabled={analyzingImage || fetchingNutrition}
            />

            {!pendingAIFood ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={analyzingImage || fetchingNutrition}
                className="w-full relative overflow-hidden group border-2 border-dashed border-indigo-200 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/50 transition-all cursor-pointer"
              >
                {analyzingImage ? (
                  <>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm font-semibold text-indigo-600">AI is scanning your meal...</p>
                    <p className="text-xs text-slate-400">This uncovers portions and macros</p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-indigo-50 rounded-full flex flex-col items-center justify-center text-indigo-500 group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    </div>
                    <p className="text-sm font-bold text-slate-700">Scan Meal with AI</p>
                    <p className="text-xs text-slate-400 text-center">Tap to snap a photo or upload an image.<br />AI will auto-fill everything for you.</p>
                  </>
                )}
              </button>
            ) : (
              <div className="w-full relative overflow-hidden group border-2 border-indigo-200 bg-indigo-50/30 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center gap-4 transition-all">
                {fetchingNutrition ? (
                  <div className="flex flex-col items-center gap-2 my-2">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-sm font-semibold text-indigo-600 text-center">Calculating precise nutrition for {pendingAIFood.primary_food}...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex flex-col items-center justify-center text-indigo-500">
                      <Check className="w-5 h-5" />
                    </div>
                    <div className="text-center w-full">
                      <p className="text-sm font-bold text-slate-600">AI thinks this is:</p>
                      <p className="text-xl font-black text-indigo-600 mb-5">{pendingAIFood.primary_food}</p>
                      <div className="w-full max-w-sm mx-auto space-y-2">
                        <button onClick={() => confirmAIFood(pendingAIFood.primary_food)} className="w-full py-2.5 bg-indigo-500 text-white text-sm font-bold rounded-xl hover:bg-indigo-600 shadow transition-transform active:scale-95">
                          Yes, it's {pendingAIFood.primary_food}
                        </button>
                        <div className="relative flex items-center justify-center py-2">
                          <div className="absolute inset-x-0 border-t border-slate-200"></div>
                          <span className="relative bg-indigo-50/30 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Or Select Alternative</span>
                        </div>
                        {pendingAIFood.possible_alternatives.filter(alt => alt && alt.trim() !== '').map((alt, idx) => (
                          <button key={idx} onClick={() => confirmAIFood(alt)} className="w-full py-2 bg-white text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors">
                            {alt}
                          </button>
                        ))}

                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const val = new FormData(e.currentTarget).get('customFood') as string;
                          if (val && val.trim()) confirmAIFood(val.trim());
                        }} className="flex gap-2 pt-2">
                          <input
                            name="customFood"
                            type="text"
                            placeholder="Type other food..."
                            className="flex-1 text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                          />
                          <button type="submit" className="py-2 px-4 bg-indigo-100 text-indigo-600 text-sm font-bold rounded-xl hover:bg-indigo-200 transition-colors">
                            Add
                          </button>
                        </form>

                        <button onClick={() => { setPendingAIFood(null); fileInputRef.current?.click(); }} className="mt-4 text-xs font-semibold text-slate-400 hover:text-slate-600 underline underline-offset-2 w-full text-center">
                          Try another image
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          <div className="relative flex items-center justify-center">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative bg-white px-3 text-[10px] font-bold text-slate-300 uppercase tracking-widest">OR MANUAL ENTRY</div>
          </div>

          {/* Database Search */}
          <div className="relative">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Quick Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search food by name..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 transition-all"
              />
              {searching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 animate-spin" />}
            </div>

            {/* Search Results Dropdown */}
            {results.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-10 overflow-hidden">
                {results.map(food => (
                  <button
                    key={food.id}
                    onClick={() => addFoodFromDb(food)}
                    className="w-full px-4 py-3 text-left hover:bg-indigo-50 flex items-center justify-between group transition-colors border-b border-slate-50 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800">{food.name}</p>
                      <p className="text-[10px] text-slate-400">{food.subcategory} · {food.calories_per_100g} kcal/100g</p>
                    </div>
                    <Plus className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="h-px bg-slate-100 mx-1" />

          {/* Meal type */}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">Meal Type</label>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map(t => (
                <button
                  key={t}
                  onClick={() => setMealType(t)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-medium capitalize transition-all ${mealType === t ? 'bg-indigo-500 text-white shadow-md shadow-indigo-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                >{t}</button>
              ))}
            </div>
          </div>

          {/* Food items list */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Food Items</label>
              <button onClick={addItem} className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 transition-colors">
                <Plus className="w-3 h-3" /> Add item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className={`rounded-2xl p-4 space-y-3 border transition-colors ${item.baseFood ? 'bg-indigo-50/30 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight mb-0.5">
                        {item.baseFood ? 'Database Match' : 'Manual / AI Entry'}
                      </p>
                      <input
                        type="text"
                        placeholder="e.g. Grilled Chicken"
                        value={item.food_name}
                        onChange={e => updateItem(idx, 'food_name', e.target.value)}
                        className="w-full text-sm font-semibold bg-transparent border-none p-0 focus:ring-0 placeholder:text-slate-300"
                      />
                    </div>
                    <button onClick={() => removeItem(idx)} className="shrink-0 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="space-y-1 sm:col-span-1 border-r border-transparent sm:border-slate-200 sm:pr-3">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1">Weight</label>
                      <div className="relative">
                        <input
                          type="number"
                          placeholder="100"
                          value={item.weight_g}
                          onChange={e => updateItem(idx, 'weight_g', e.target.value)}
                          className="w-full text-sm bg-white border border-slate-200 rounded-xl pl-3 pr-6 py-2 focus:outline-none focus:border-indigo-400"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">g</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1">Kcal</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.calories}
                        onChange={e => updateItem(idx, 'calories', e.target.value)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 font-bold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1">P (g)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.protein_g}
                        onChange={e => updateItem(idx, 'protein_g', e.target.value)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1">C (g)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.carbs_g}
                        onChange={e => updateItem(idx, 'carbs_g', e.target.value)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-slate-400 uppercase ml-1">F (g)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.fat_g}
                        onChange={e => updateItem(idx, 'fat_g', e.target.value)}
                        className="w-full text-sm bg-white border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3 rounded-xl border border-red-100 animate-fadeInUp">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-5 border-t border-slate-100 bg-white">
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-4 bg-indigo-500 text-white rounded-2xl font-bold hover:bg-indigo-600 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
            Log {items.length} {items.length === 1 ? 'Item' : 'Items'}
          </button>
        </div>
      </div>
    </div>
  );
}
