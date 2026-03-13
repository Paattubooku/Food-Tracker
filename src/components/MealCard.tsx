import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Trash2, Camera, MessageSquare, Pencil, Check, X, Loader2, ChevronDown } from 'lucide-react';
import HealthScore from './HealthScore';

const typeConfig: Record<string, { icon: string; color: string; bg: string }> = {
  breakfast: { icon: '🌅', color: 'text-amber-600', bg: 'bg-amber-50' },
  lunch:     { icon: '☀️', color: 'text-orange-600', bg: 'bg-orange-50' },
  dinner:    { icon: '🌙', color: 'text-indigo-600', bg: 'bg-indigo-50' },
  snack:     { icon: '🍿', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  other:     { icon: '🍽', color: 'text-slate-600',  bg: 'bg-slate-50' },
};

interface MealItem {
  id: string;
  food_name: string;
  weight_g: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

interface Meal {
  id: string;
  meal_type: string;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  health_score: number | null;
  is_corrected: boolean;
  input_type: string;
  logged_at: string;
  meal_items: MealItem[];
}

interface Props {
  meal: Meal;
  onDelete?: (id: string) => void;
  onUpdate?: (meal: Meal) => void;
}

export default function MealCard({ meal, onDelete, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cfg = typeConfig[meal.meal_type] || typeConfig.other;

  async function handleCorrection() {
    if (!correction.trim()) return;
    setSaving(true); setError('');
    try {
      const items = meal.meal_items.map(item => {
        const match = correction.toLowerCase().match(
          new RegExp(`${item.food_name.toLowerCase().split(' ')[0]}\\s+(\\d+)g?`)
        );
        if (match) {
          const newWeight = parseInt(match[1]);
          const ratio = newWeight / (item.weight_g || 1);
          return {
            food_name: item.food_name, weight_g: newWeight,
            calories: Math.round(item.calories * ratio),
            protein_g: Math.round(item.protein_g * ratio * 10) / 10,
            carbs_g:   Math.round(item.carbs_g   * ratio * 10) / 10,
            fat_g:     Math.round(item.fat_g     * ratio * 10) / 10,
          };
        }
        return { food_name: item.food_name, weight_g: item.weight_g, calories: item.calories,
                 protein_g: item.protein_g, carbs_g: item.carbs_g, fat_g: item.fat_g };
      });

      const totals = items.reduce((acc, it) => ({
        total_calories: acc.total_calories + it.calories,
        total_protein:  acc.total_protein  + it.protein_g,
        total_carbs:    acc.total_carbs    + it.carbs_g,
        total_fat:      acc.total_fat      + it.fat_g,
      }), { total_calories: 0, total_protein: 0, total_carbs: 0, total_fat: 0 });

      const res = await fetch('/api/meals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: meal.id, ...totals, is_corrected: true, items }),
      });
      if (!res.ok) throw new Error('Failed to update');
      const updated = await res.json();
      setEditing(false); setCorrection('');
      if (onUpdate) onUpdate(updated);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card card-hover animate-fadeInUp">
      <div className="p-3 sm:p-4">

        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-base shrink-0 ${cfg.bg}`}>
            {cfg.icon}
          </div>

          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-semibold capitalize ${cfg.color}`}>{meal.meal_type}</span>
              {meal.health_score != null && <HealthScore score={meal.health_score} />}
              {meal.is_corrected && (
                <span className="text-[10px] font-medium bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">✏️ edited</span>
              )}
              <div className="ml-auto flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                {meal.input_type === 'image' ? <Camera className="w-3 h-3" /> : <MessageSquare className="w-3 h-3" />}
                {format(parseISO(meal.logged_at), 'h:mm a')}
              </div>
            </div>

            {/* Food names */}
            {meal.meal_items?.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-1 text-xs text-slate-500 text-left w-full hover:text-slate-700 flex items-center gap-1"
              >
                <span className="truncate flex-1">
                  {meal.meal_items.map(i => i.food_name).join(', ')}
                </span>
                <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            )}

            {/* Macros */}
            <div className="mt-2 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="font-bold text-slate-900">{Math.round(meal.total_calories)} kcal</span>
              <span className="text-slate-400">P: <span className="text-indigo-600 font-medium">{Math.round(meal.total_protein)}g</span></span>
              <span className="text-slate-400">C: <span className="text-cyan-600 font-medium">{Math.round(meal.total_carbs)}g</span></span>
              <span className="text-slate-400">F: <span className="text-amber-600 font-medium">{Math.round(meal.total_fat)}g</span></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => setEditing(!editing)}
              className="p-1.5 rounded-lg text-slate-300 hover:bg-indigo-50 hover:text-indigo-500 transition-colors"
              title="Edit"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            {onDelete && (
              <button
                onClick={() => onDelete(meal.id)}
                className="p-1.5 rounded-lg text-slate-300 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Expanded items */}
        {expanded && meal.meal_items?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5">
            {meal.meal_items.map(item => (
              <div key={item.id} className="flex items-center justify-between text-xs gap-2">
                <span className="text-slate-600 font-medium truncate flex-1">{item.food_name}</span>
                <div className="flex items-center gap-2 text-slate-400 shrink-0">
                  <span className="font-mono">{item.weight_g}g</span>
                  <span className="font-medium text-slate-700">{Math.round(item.calories)} kcal</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Correction input */}
        {editing && (
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">
              e.g. <code className="bg-slate-100 px-1 rounded">rice 150g</code>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={correction}
                onChange={e => setCorrection(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCorrection()}
                placeholder="rice 150g, remove pickle…"
                className="flex-1 min-w-0 text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                autoFocus
              />
              <button
                onClick={handleCorrection}
                disabled={saving || !correction.trim()}
                className="shrink-0 px-3 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button
                onClick={() => { setEditing(false); setCorrection(''); }}
                className="shrink-0 px-3 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
