import { useState, useEffect } from 'react';
import { Loader2, RefreshCw, Brain, ShoppingCart } from 'lucide-react';
import InsightCard from '../components/InsightCard';
import GroceryList from '../components/GroceryList';

export default function InsightsPage() {
  const [insights, setInsights]   = useState<any[]>([]);
  const [grocery, setGrocery]     = useState<any>(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab]             = useState<'insights' | 'grocery'>('insights');

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [ins, groc] = await Promise.all([
        fetch('/api/insights?days=7').then(r => r.json()),
        fetch('/api/grocery').then(r => r.json()),
      ]);
      setInsights(Array.isArray(ins) ? ins : []);
      setGrocery(groc);
    } finally { setLoading(false); }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try { await fetch('/api/insights', { method: 'POST' }); await loadData(); }
    finally { setRefreshing(false); }
  }

  if (loading) return (
    <div className="flex justify-center py-16">
      <Loader2 className="w-7 h-7 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Insights</h1>
          <p className="text-xs sm:text-sm text-slate-400">AI-powered diet advice & planning</p>
        </div>
        <button
          onClick={handleRefresh} disabled={refreshing}
          className="shrink-0 flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          { id: 'insights' as const, icon: Brain,        label: 'Diet Advice' },
          { id: 'grocery'  as const, icon: ShoppingCart, label: 'Grocery List' },
        ]).map(({ id, icon: Icon, label }) => (
          <button
            key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
              tab === id
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-200'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'insights' && (
        <div className="space-y-3">
          {insights.length === 0 ? (
            <div className="card p-10 sm:p-12 text-center">
              <Brain className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No insights yet. Log some meals and tap Refresh!</p>
            </div>
          ) : (
            insights.map((ins, i) => <InsightCard key={ins.id || i} insight={ins} />)
          )}
        </div>
      )}

      {tab === 'grocery' && <GroceryList data={grocery} />}
    </div>
  );
}
