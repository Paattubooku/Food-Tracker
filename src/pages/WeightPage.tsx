import { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import WeightChart from '../components/WeightChart';
import WeightPrediction from '../components/WeightPrediction';
import { format, parseISO } from 'date-fns';

export default function WeightPage() {
  const [history, setHistory]     = useState<any[]>([]);
  const [prediction, setPrediction] = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [weight, setWeight]       = useState('');
  const [note, setNote]           = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [h, p] = await Promise.all([
        fetch('/api/weight?limit=90').then(r => r.json()),
        fetch('/api/prediction?days=30').then(r => r.json()).catch(() => null),
      ]);
      setHistory(h || []); setPrediction(p);
    } finally { setLoading(false); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = parseFloat(weight);
    if (isNaN(val) || val < 20 || val > 300) { setError('Enter a valid weight (20–300 kg)'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/weight', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight_kg: val, note: note || undefined }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setWeight(''); setNote(''); await loadData();
    } catch (err: any) { setError(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this entry?')) return;
    await fetch('/api/weight', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    loadData();
  }

  const latest     = history.length > 0 ? history[history.length - 1] : null;
  const first      = history.length > 1 ? history[0] : null;
  const totalChange = latest && first ? (Number(latest.weight_kg) - Number(first.weight_kg)).toFixed(1) : null;
  const changeNum   = totalChange ? parseFloat(totalChange) : 0;

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Weight Tracking</h1>

      {/* Stats */}
      {latest && (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: 'Current',      val: `${Number(latest.weight_kg).toFixed(1)} kg`, color: 'text-slate-900' },
            { label: 'Starting',     val: first ? `${Number(first.weight_kg).toFixed(1)} kg` : '—', color: 'text-slate-600' },
            { label: 'Change',       val: totalChange ? `${changeNum > 0 ? '+' : ''}${totalChange} kg` : '—',
              color: changeNum < 0 ? 'text-emerald-600' : changeNum > 0 ? 'text-red-500' : 'text-slate-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="card p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs text-slate-400 mb-1">{label}</p>
              <p className={`text-base sm:text-xl font-bold ${color} leading-tight`}>{val}</p>
            </div>
          ))}
        </div>
      )}

      {/* Log form */}
      <form onSubmit={handleSubmit} className="card p-4 sm:p-5">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Log Today's Weight</h3>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <input
            type="number" step="0.1" min="20" max="300"
            value={weight} onChange={e => setWeight(e.target.value)}
            placeholder="Weight in kg (e.g. 75.5)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
            required
          />
          <input
            type="text"
            value={note} onChange={e => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400"
          />
          <button
            type="submit" disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-500 text-white rounded-xl text-sm font-semibold hover:bg-indigo-600 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Log
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </form>

      <WeightChart data={history} />
      {prediction && <WeightPrediction data={prediction} />}

      {/* History list */}
      {history.length > 0 && (
        <div className="card p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">History</h3>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {[...history].reverse().map((entry, i) => {
              const prev = history[history.length - 2 - i];
              const diff = prev ? Number(entry.weight_kg) - Number(prev.weight_kg) : null;
              return (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 gap-2">
                  <span className="text-sm text-slate-600 min-w-0 truncate">
                    {format(parseISO(entry.logged_at), 'MMM d, yyyy')}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    {diff !== null && (
                      <span className={`text-xs font-medium ${
                        diff < 0 ? 'text-emerald-500' : diff > 0 ? 'text-red-400' : 'text-slate-400'
                      }`}>
                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-900">{Number(entry.weight_kg).toFixed(1)} kg</span>
                    <button onClick={() => handleDelete(entry.id)} className="p-1 text-slate-200 hover:text-red-400">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
