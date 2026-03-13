import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const daysAhead = Math.min(90, parseInt(req.query.days || '30', 10));

    const [weightRes, mealsRes, userRes] = await Promise.all([
      supabase.from('weight_logs').select('weight_kg, logged_at').eq('user_id', DEMO_USER_ID).order('logged_at', { ascending: true }).limit(90),
      supabase.from('meals').select('total_calories, logged_at').eq('user_id', DEMO_USER_ID).gte('logged_at', new Date(Date.now() - 14 * 86400000).toISOString()).order('logged_at', { ascending: false }),
      supabase.from('users').select('calorie_goal').eq('id', DEMO_USER_ID).single(),
    ]);

    const weightHistory = weightRes.data || [];
    const recentMeals = mealsRes.data || [];
    const user = userRes.data;

    if (weightHistory.length < 3) {
      return res.status(200).json({ available: false, message: 'Need at least 3 weight entries for prediction. Keep logging!' });
    }

    // Linear regression
    const points = weightHistory.map((w, i) => ({ x: i, y: Number(w.weight_kg) }));
    const n = points.length;
    const sumX = points.reduce((s, p) => s + p.x, 0);
    const sumY = points.reduce((s, p) => s + p.y, 0);
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
    const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
    const denom = n * sumX2 - sumX * sumX;
    const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
    const intercept = (sumY - slope * sumX) / n;

    const currentWeight = Number(weightHistory[weightHistory.length - 1].weight_kg);
    const lastIndex = n - 1;
    const predictedWeight = Math.round((intercept + slope * (lastIndex + daysAhead)) * 10) / 10;

    // Calorie-based calculation
    let avgDailyCalories = user.calorie_goal;
    if (recentMeals.length > 0) {
      const dayMap = {};
      for (const m of recentMeals) {
        const d = new Date(m.logged_at).toISOString().split('T')[0];
        dayMap[d] = (dayMap[d] || 0) + Number(m.total_calories);
      }
      const days = Object.keys(dayMap).length;
      avgDailyCalories = days > 0 ? Object.values(dayMap).reduce((s, v) => s + v, 0) / days : user.calorie_goal;
    }

    const dailyWeightChange = slope;
    const impliedSurplus = dailyWeightChange * 7700;
    const estimatedTDEE = avgDailyCalories - impliedSurplus;
    const dailyDeficit = estimatedTDEE - avgDailyCalories;
    const calorieBasedChange = (dailyDeficit * daysAhead) / 7700;
    const caloriePredicted = Math.round((currentWeight - calorieBasedChange) * 10) / 10;
    const blended = Math.round((predictedWeight * 0.6 + caloriePredicted * 0.4) * 10) / 10;
    const totalChange = Math.round((blended - currentWeight) * 10) / 10;

    let trend = 'stable';
    if (totalChange < -0.3) trend = 'losing';
    else if (totalChange > 0.3) trend = 'gaining';

    // Weekly projections
    const weeklyProjections = [];
    for (let week = 1; week <= Math.ceil(daysAhead / 7); week++) {
      const day = week * 7;
      const trendW = intercept + slope * (lastIndex + day);
      const calorieW = currentWeight - (dailyDeficit * day) / 7700;
      const blendedW = Math.round((trendW * 0.6 + calorieW * 0.4) * 10) / 10;
      weeklyProjections.push({
        week,
        date: new Date(Date.now() + day * 86400000).toISOString().split('T')[0],
        weight: blendedW,
      });
    }

    // History for chart
    const historyForChart = weightHistory.map(w => ({ date: w.logged_at, weight: Number(w.weight_kg) }));

    return res.status(200).json({
      available: true,
      currentWeight,
      predictedWeight: blended,
      totalChange,
      dailyChange: Math.round(slope * 100) / 100,
      trend,
      daysAhead,
      avgDailyCalories: Math.round(avgDailyCalories),
      estimatedTDEE: Math.round(estimatedTDEE),
      weeklyProjections,
      dataPoints: weightHistory.length,
      history: historyForChart,
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
