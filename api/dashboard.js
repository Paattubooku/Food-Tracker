import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const type = req.query.type || 'today';

    // Get user goals
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('calorie_goal, protein_goal, carbs_goal, fat_goal')
      .eq('id', DEMO_USER_ID)
      .single();
    if (userError) throw userError;

    if (type === 'today') {
      const today = new Date().toISOString().split('T')[0];
      const { data: meals, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .gte('logged_at', `${today}T00:00:00.000Z`)
        .lte('logged_at', `${today}T23:59:59.999Z`)
        .order('logged_at', { ascending: true });
      if (error) throw error;

      // Fetch items for each meal separately
      const mealsWithItems = await Promise.all((meals || []).map(async (meal) => {
        const { data: items } = await supabase
          .from('meal_items')
          .select('*')
          .eq('meal_id', meal.id);
        return { ...meal, meal_items: items || [] };
      }));

      const totals = mealsWithItems.reduce((acc, m) => ({
        calories: acc.calories + Number(m.total_calories),
        protein: acc.protein + Number(m.total_protein),
        carbs: acc.carbs + Number(m.total_carbs),
        fat: acc.fat + Number(m.total_fat),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      return res.status(200).json({
        date: today,
        goals: { calories: user.calorie_goal, protein: user.protein_goal, carbs: user.carbs_goal, fat: user.fat_goal },
        consumed: totals,
        meals: mealsWithItems,
        mealCount: mealsWithItems.length,
        remaining: Math.max(0, user.calorie_goal - totals.calories),
      });
    }

    if (type === 'weekly') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 6);

      const { data: meals, error } = await supabase
        .from('meals')
        .select('logged_at, total_calories, total_protein, total_carbs, total_fat, health_score')
        .eq('user_id', DEMO_USER_ID)
        .gte('logged_at', start.toISOString())
        .lte('logged_at', end.toISOString())
        .order('logged_at', { ascending: true });
      if (error) throw error;

      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        days.push({ date: dateStr, calories: 0, protein: 0, carbs: 0, fat: 0, avgScore: 0, mealCount: 0 });
      }

      for (const m of meals || []) {
        const dateStr = new Date(m.logged_at).toISOString().split('T')[0];
        const day = days.find(d => d.date === dateStr);
        if (day) {
          day.calories += Number(m.total_calories);
          day.protein += Number(m.total_protein);
          day.carbs += Number(m.total_carbs);
          day.fat += Number(m.total_fat);
          day.mealCount++;
          if (m.health_score) {
            day.avgScore = (day.avgScore * (day.mealCount - 1) + Number(m.health_score)) / day.mealCount;
          }
        }
      }

      return res.status(200).json({
        days,
        goal: user.calorie_goal,
        weekTotal: days.reduce((s, d) => s + d.calories, 0),
        avgDaily: Math.round(days.reduce((s, d) => s + d.calories, 0) / 7),
      });
    }

    if (type === 'summary') {
      const start = new Date();
      start.setDate(start.getDate() - 29);
      const { data: meals } = await supabase
        .from('meals')
        .select('total_calories, total_protein, total_carbs, total_fat, health_score, logged_at')
        .eq('user_id', DEMO_USER_ID)
        .gte('logged_at', start.toISOString())
        .order('logged_at', { ascending: true });

      const daysMap = {};
      for (const m of meals || []) {
        const d = new Date(m.logged_at).toISOString().split('T')[0];
        if (!daysMap[d]) daysMap[d] = { calories: 0, protein: 0, scores: [] };
        daysMap[d].calories += Number(m.total_calories);
        daysMap[d].protein += Number(m.total_protein);
        if (m.health_score) daysMap[d].scores.push(Number(m.health_score));
      }

      const dayEntries = Object.values(daysMap);
      const daysTracked = dayEntries.length;
      const avgCalories = daysTracked > 0 ? Math.round(dayEntries.reduce((s, d) => s + d.calories, 0) / daysTracked) : 0;
      const avgProtein = daysTracked > 0 ? Math.round(dayEntries.reduce((s, d) => s + d.protein, 0) / daysTracked) : 0;
      const allScores = dayEntries.flatMap(d => d.scores);
      const avgScore = allScores.length > 0 ? (allScores.reduce((s, v) => s + v, 0) / allScores.length).toFixed(1) : null;

      return res.status(200).json({ daysTracked, avgCalories, avgProtein, avgScore, totalMeals: (meals || []).length });
    }

    return res.status(400).json({ error: 'Unknown type' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
