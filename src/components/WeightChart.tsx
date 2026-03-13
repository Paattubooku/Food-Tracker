import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, parseISO } from 'date-fns';

interface WeightLog {
  logged_at: string;
  weight_kg: number;
}

interface Props {
  data: WeightLog[];
}

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-sm">
      <p className="text-slate-400 text-xs">{format(parseISO(d.date), 'MMM d, yyyy')}</p>
      <p className="font-bold text-indigo-600">{Number(d.weight).toFixed(1)} kg</p>
    </div>
  );
};

export default function WeightChart({ data }: Props) {
  if (!data || data.length === 0) {
    return (
      <div className="card p-6">
        <h3 className="text-sm font-semibold text-slate-500 mb-4">Weight History</h3>
        <div className="flex items-center justify-center h-32 text-slate-400 text-sm">No weight data yet</div>
      </div>
    );
  }

  const chartData = data.map(w => ({ date: w.logged_at, weight: Number(w.weight_kg) }));
  const weights = chartData.map(d => d.weight);
  const minW = Math.floor(Math.min(...weights) - 1);
  const maxW = Math.ceil(Math.max(...weights) + 1);

  return (
    <div className="card p-6">
      <h3 className="text-sm font-semibold text-slate-500 mb-4">Weight History</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="date"
            tickFormatter={v => format(parseISO(v), 'MMM d')}
            tick={{ fontSize: 11, fill: '#94a3b8' }}
            axisLine={false} tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis domain={[minW, maxW]} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone" dataKey="weight"
            stroke="#4f46e5" strokeWidth={2.5}
            dot={{ fill: '#4f46e5', r: 4, strokeWidth: 0 }}
            activeDot={{ r: 6, fill: '#4f46e5' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
