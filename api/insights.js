import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const days = Math.min(30, parseInt(req.query.days || '7', 10));
      const start = new Date();
      start.setDate(start.getDate() - days);
      const startStr = start.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('daily_insights')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .gte('insight_date', startStr)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      // Generate fresh insights based on current data
      const today = new Date().toISOString().split('T')[0];

      const [userRes, mealsRes, weightRes] = await Promise.all([
        supabase.from('users').select('*').eq('id', DEMO_USER_ID).single(),
        supabase.from('meals').select('total_calories, total_protein, total_carbs, total_fat, health_score, logged_at').eq('user_id', DEMO_USER_ID).gte('logged_at', `${today}T00:00:00Z`).lte('logged_at', `${today}T23:59:59Z`),
        supabase.from('weight_logs').select('weight_kg, logged_at').eq('user_id', DEMO_USER_ID).order('logged_at', { ascending: false }).limit(14),
      ]);

      const user = userRes.data;
      const todayMeals = mealsRes.data || [];
      const weightHistory = weightRes.data || [];

      const totals = todayMeals.reduce((acc, m) => ({
        calories: acc.calories + Number(m.total_calories),
        protein: acc.protein + Number(m.total_protein),
        carbs: acc.carbs + Number(m.total_carbs),
        fat: acc.fat + Number(m.total_fat),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

      const newInsights = [];

      // Calorie check
      const calPct = (totals.calories / user.calorie_goal) * 100;
      if (calPct >= 100) {
        newInsights.push({ type: 'calorie_warning', title: 'Calorie Goal Exceeded', message: `You've consumed ${Math.round(totals.calories)} kcal, which is ${Math.round(totals.calories - user.calorie_goal)} kcal over your goal.`, severity: 'danger' });
      } else if (calPct >= 80) {
        newInsights.push({ type: 'calorie_warning', title: 'Approaching Calorie Limit', message: `You have ${Math.round(user.calorie_goal - totals.calories)} kcal remaining today. Choose a light option for your next meal.`, severity: 'warning' });
      }

      // Protein check
      const protPct = (totals.protein / user.protein_goal) * 100;
      if (todayMeals.length >= 2 && protPct < 40) {
        newInsights.push({ type: 'protein_low', title: 'Protein Intake Low', message: `You've had ${Math.round(totals.protein)}g protein (goal: ${user.protein_goal}g). Add eggs, paneer, chicken, or dal to boost it.`, severity: 'warning' });
      }

      // Weight trend
      if (weightHistory.length >= 7) {
        const recent = weightHistory.slice(0, 7);
        const older = weightHistory.slice(7, 14);
        if (older.length > 0) {
          const recentAvg = recent.reduce((s, w) => s + Number(w.weight_kg), 0) / recent.length;
          const olderAvg = older.reduce((s, w) => s + Number(w.weight_kg), 0) / older.length;
          const diff = recentAvg - olderAvg;
          if (diff < -0.3) {
            newInsights.push({ type: 'improvement', title: 'Weight Trending Down 📉', message: `Your average weight dropped by ${Math.abs(diff).toFixed(1)} kg over the past week. Keep it up!`, severity: 'success' });
          } else if (diff > 0.5) {
            newInsights.push({ type: 'improvement', title: 'Weight Increasing', message: `Your weight has increased by ${diff.toFixed(1)} kg recently. Review your calorie intake.`, severity: 'warning' });
          }
        }
      }

      // Macro balance
      if (totals.calories > 200) {
        const carbPct = (totals.carbs * 4 / totals.calories) * 100;
        const fatPct = (totals.fat * 9 / totals.calories) * 100;
        if (carbPct > 65) {
          newInsights.push({ type: 'diet_advice', title: 'High Carb Intake', message: `${Math.round(carbPct)}% of your calories are from carbs. Balance with more protein and vegetables.`, severity: 'info' });
        }
        if (fatPct > 45) {
          newInsights.push({ type: 'diet_advice', title: 'High Fat Intake', message: `${Math.round(fatPct)}% of your calories are from fat. Consider grilled options over fried.`, severity: 'warning' });
        }
      }

      // Save to DB
      for (const insight of newInsights) {
        try {
          await supabase.from('daily_insights').insert({
            user_id: DEMO_USER_ID,
            insight_date: today,
            insight_type: insight.type,
            title: insight.title,
            message: insight.message,
            severity: insight.severity,
          });
        } catch (_) {}
      }

      return res.status(200).json(newInsights);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
