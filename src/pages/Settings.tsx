import { useState, useEffect } from 'react';
import { Loader2, Save, Check } from 'lucide-react';

const ACTIVITY_LEVELS = [
  { value: 'sedentary',   label: 'Sedentary',   desc: 'Little/no exercise' },
  { value: 'light',       label: 'Light',        desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',     desc: '3–5 days/week' },
  { value: 'active',      label: 'Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active',  desc: 'Hard daily' },
];

export default function Settings() {
  const [form, setForm] = useState({
    calorie_goal: 2000, protein_goal: 150, carbs_goal: 250, fat_goal: 65,
    height_cm: '' as any, age: '' as any, gender: '', activity_level: 'moderate',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  useEffect(() => { loadUser(); }, []);

  async function loadUser() {
    try {
      const data = await fetch('/api/users').then(r => r.json());
      setForm({
        calorie_goal:   data.calorie_goal   || 2000,
        protein_goal:   data.protein_goal   || 150,
        carbs_goal:     data.carbs_goal     || 250,
        fat_goal:       data.fat_goal       || 65,
        height_cm:      data.height_cm      || '',
        age:            data.age            || '',
        gender:         data.gender         || '',
        activity_level: data.activity_level || 'moderate',
      });
    } finally { setLoading(false); }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setSaved(false);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } finally { setSaving(false); }
  }

  function set(key: string, val: any) { setForm(p => ({ ...p, [key]: val })); }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <form onSubmit={handleSave} className="space-y-5 w-full">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-xs sm:text-sm text-slate-400">Customize your goals and profile</p>
      </div>

      {/* Daily Goals */}
      <div className="card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Daily Goals</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {[
            { key: 'calorie_goal', label: 'Calories', unit: 'kcal', min: 800,  max: 10000 },
            { key: 'protein_goal', label: 'Protein',  unit: 'g',    min: 20,   max: 500 },
            { key: 'carbs_goal',   label: 'Carbs',    unit: 'g',    min: 50,   max: 800 },
            { key: 'fat_goal',     label: 'Fat',      unit: 'g',    min: 20,   max: 300 },
          ].map(({ key, label, unit, min, max }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">{label}</label>
              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400">
                <input
                  type="number" min={min} max={max}
                  value={(form as any)[key]}
                  onChange={e => set(key, parseInt(e.target.value) || 0)}
                  className="flex-1 min-w-0 px-3 py-2.5 text-sm focus:outline-none"
                />
                <span className="px-3 text-xs text-slate-400 bg-slate-50 border-l border-slate-200 py-2.5 shrink-0">{unit}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="card p-4 sm:p-6 space-y-4">
        <h2 className="text-sm sm:text-base font-semibold text-slate-800">Profile</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Height (cm)</label>
            <input
              type="number" min="100" max="250"
              value={form.height_cm}
              onChange={e => set('height_cm', e.target.value ? parseInt(e.target.value) : '')}
              placeholder="e.g. 175"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Age</label>
            <input
              type="number" min="10" max="120"
              value={form.age}
              onChange={e => set('age', e.target.value ? parseInt(e.target.value) : '')}
              placeholder="e.g. 28"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Gender</label>
            <select
              value={form.gender}
              onChange={e => set('gender', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-indigo-400 bg-white"
            >
              <option value="">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-2">Activity Level</label>
          {/* Scrollable row on mobile, grid on sm+ */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide sm:grid sm:grid-cols-5 sm:overflow-visible">
            {ACTIVITY_LEVELS.map(({ value, label, desc }) => (
              <button
                key={value} type="button"
                onClick={() => set('activity_level', value)}
                className={`shrink-0 sm:shrink p-2.5 rounded-xl text-left border transition-all min-w-[90px] sm:min-w-0 ${
                  form.activity_level === value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <p className="text-xs font-semibold">{label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Telegram info */}
      <div className="card p-4 sm:p-5 bg-indigo-50 border border-indigo-100">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🤖</span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-indigo-800">Connect Telegram Bot</h3>
            <p className="text-xs text-indigo-600 mt-1">Log meals by sending food photos to your Telegram bot.</p>
            <div className="mt-2 bg-white rounded-lg px-3 py-2 text-xs font-mono text-slate-600 border border-indigo-200 overflow-x-auto">
              /start · /today · /week · /weight · /goal · /insights · /predict · /grocery
            </div>
          </div>
        </div>
      </div>

      <button
        type="submit" disabled={saving}
        className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-2xl font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
      >
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Save className="w-5 h-5" />}
        {saved ? 'Saved!' : 'Save Settings'}
      </button>
    </form>
  );
}
