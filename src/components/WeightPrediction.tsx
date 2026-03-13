import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface WeeklyProjection {
  week: number;
  date: string;
  weight: number;
}

interface HistoryPoint {
  date: string;
  weight: number;
}

interface PredictionData {
  available: boolean;
  message?: string;
  currentWeight: number;
  predictedWeight: number;
  totalChange: number;
  trend: 'losing' | 'gaining' | 'stable';
  daysAhead: number;
  avgDailyCalories: number;
  estimatedTDEE: number;
  weeklyProjections: WeeklyProjection[];
  dataPoints: number;
  history: HistoryPoint[];
}

interface Props {
  data: PredictionData;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-sm">
      <p className="text-slate-400 text-xs">{d?.label}</p>
      {d?.actual != null && <p className="text-indigo-600 font-bold">{d.actual} kg <span className="font-normal text-slate-400">actual</span></p>}
      {d?.predicted != null && <p className="text-indigo-300 font-bold">{d.predicted} kg <span className="font-normal text-slate-400">predicted</span></p>}
    </div>
  );
};

export default function WeightPrediction({ data }: Props) {
  if (!data?.available) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-500 mb-3">Weight Prediction</h3>
        <p className="text-center text-sm text-slate-400 py-4">{data?.message || 'Need more data.'}</p>
      </div>
    );
  }

  const TrendIcon = data.trend === 'losing' ? TrendingDown : data.trend === 'gaining' ? TrendingUp : Minus;
  const trendColor = data.trend === 'losing' ? 'text-emerald-600' : data.trend === 'gaining' ? 'text-red-500' : 'text-slate-500';

  // Build chart data
  const chartData: any[] = [];
  for (const h of (data.history || []).slice(-14)) {
    chartData.push({ label: format(parseISO(h.date), 'MMM d'), actual: h.weight, predicted: null });
  }
  if (chartData.length > 0) {
    chartData[chartData.length - 1].predicted = chartData[chartData.length - 1].actual;
  }
  for (const wp of data.weeklyProjections) {
    chartData.push({ label: format(parseISO(wp.date), 'MMM d'), actual: null, predicted: wp.weight });
  }

  const allW = chartData.map(d => d.actual ?? d.predicted).filter(Boolean) as number[];
  const minW = allW.length ? Math.floor(Math.min(...allW) - 2) : 60;
  const maxW = allW.length ? Math.ceil(Math.max(...allW) + 2) : 100;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500">{data.daysAhead}-Day Prediction</h3>
        <div className={`flex items-center gap-1.5 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-sm font-semibold capitalize">{data.trend}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Current', val: `${data.currentWeight} kg`, color: 'text-slate-700' },
          { label: 'Predicted', val: `${data.predictedWeight} kg`, color: 'text-indigo-600' },
          { label: 'Change', val: `${data.totalChange > 0 ? '+' : ''}${data.totalChange} kg`, color: data.totalChange <= 0 ? 'text-emerald-600' : 'text-red-500' },
        ].map(({ label, val, color }) => (
          <div key={label} className="text-center bg-slate-50 rounded-xl p-3">
            <p className="text-xs text-slate-400 mb-1">{label}</p>
            <p className={`text-lg font-bold ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis domain={[minW, maxW]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line type="monotone" dataKey="actual" stroke="#4f46e5" strokeWidth={2.5} dot={{ fill: '#4f46e5', r: 3 }} connectNulls={false} />
          <Line type="monotone" dataKey="predicted" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="6 3" dot={{ fill: '#a5b4fc', r: 3 }} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-3 text-xs text-slate-400">
        <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-indigo-500" />Actual</div>
        <div className="flex items-center gap-1.5"><div className="w-4 border-t-2 border-dashed border-indigo-300" />Predicted</div>
      </div>

      <div className="mt-4 bg-slate-50 rounded-xl p-3 text-xs text-slate-500 flex gap-4">
        <span>🔥 Avg intake: <strong>{data.avgDailyCalories}</strong> kcal</span>
        <span>⚡ Est. TDEE: <strong>{data.estimatedTDEE}</strong> kcal</span>
        <span>📊 Data: <strong>{data.dataPoints}</strong> entries</span>
      </div>
    </div>
  );
}
