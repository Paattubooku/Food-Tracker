import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, parseISO } from 'date-fns';

interface DayData { date: string; calories: number; mealCount: number; avgScore: number; }
interface Props    { data: DayData[]; goal: number; }

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-100 p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-1">{d?.label}</p>
      <p className="text-indigo-600 font-mono">{Math.round(d?.calories || 0)} kcal</p>
      {d?.mealCount > 0 && <p className="text-slate-400 text-xs">{d.mealCount} meals</p>}
    </div>
  );
};

export default function WeeklyChart({ data, goal }: Props) {
  const chartData = data.map(d => ({
    ...d,
    label: format(parseISO(d.date), 'EEE'),
    calories: Math.round(d.calories),
  }));

  return (
    <div className="card p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-500">Weekly Overview</h3>
        <span className="text-xs text-slate-400">Goal: {goal} kcal</span>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -28 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
          <ReferenceLine y={goal} stroke="#4f46e5" strokeDasharray="4 4" strokeWidth={1.5} />
          <Bar dataKey="calories" radius={[5, 5, 0, 0]} fill="#4f46e5" maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
