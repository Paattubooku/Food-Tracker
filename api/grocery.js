import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const [userRes, patternsRes, weekMealsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', DEMO_USER_ID).single(),
      supabase.from('food_patterns').select('*').eq('user_id', DEMO_USER_ID).order('frequency', { ascending: false }).limit(30),
      supabase.from('meals').select('total_calories, total_protein, logged_at').eq('user_id', DEMO_USER_ID)
        .gte('logged_at', new Date(Date.now() - 7 * 86400000).toISOString())
        .order('logged_at', { ascending: false }),
    ]);

    const user = userRes.data;
    const patterns = patternsRes.data || [];

    if (patterns.length === 0) {
      return res.status(200).json({ available: false, message: 'Log meals for at least a week so I can learn your eating patterns.' });
    }

    const weekMeals = weekMealsRes.data || [];
    const daysTracked = new Set(weekMeals.map(m => new Date(m.logged_at).toISOString().split('T')[0])).size;
    const avgDailyCalories = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.total_calories), 0) / Math.max(1, daysTracked)) : 0;
    const avgDailyProtein = weekMeals.length > 0 ? Math.round(weekMeals.reduce((s, m) => s + Number(m.total_protein || 0), 0) / Math.max(1, daysTracked)) : 0;

    const proteinKeywords = ['egg', 'chicken', 'fish', 'paneer', 'dal', 'daal', 'lentil', 'tofu', 'meat', 'mutton', 'prawn', 'curd', 'yogurt', 'rajma', 'chole', 'chana', 'sprout'];
    const vegKeywords = ['salad', 'spinach', 'palak', 'broccoli', 'carrot', 'beans', 'gobi', 'cauliflower', 'tomato', 'capsicum', 'cucumber', 'cabbage', 'peas', 'bhindi'];

    const allFoodNames = patterns.map(p => p.food_name.toLowerCase());
    const vegCount = patterns.filter(p => vegKeywords.some(k => p.food_name.toLowerCase().includes(k))).length;

    const regulars = patterns
      .filter(p => p.frequency >= 3)
      .slice(0, 12)
      .map(f => ({ name: capitalize(f.food_name), frequency: f.frequency, avgPortion: `${Math.round(f.average_weight_g)}g` }));

    const nutritionGaps = [];
    if (avgDailyProtein < user.protein_goal * 0.8) {
      nutritionGaps.push({
        gap: 'Low Protein',
        message: `Avg daily protein: ${avgDailyProtein}g (goal: ${user.protein_goal}g)`,
        suggestions: ['Eggs (6-12 pack)', 'Paneer (200g)', 'Chicken breast (500g)', 'Moong dal (500g)', 'Greek yogurt / Curd', 'Chana / Chickpeas'],
      });
    }
    if (vegCount < 3) {
      nutritionGaps.push({
        gap: 'Low Vegetable Variety',
        message: 'You eat fewer than 3 types of vegetables regularly',
        suggestions: ['Spinach (Palak)', 'Broccoli / Gobi', 'Carrots', 'Bell Peppers', 'Green beans', 'Cucumber'],
      });
    }

    const smartSuggestions = [
      { check: !allFoodNames.some(n => n.includes('curd') || n.includes('yogurt')), item: 'Curd / Yogurt — great for gut health and protein' },
      { check: !allFoodNames.some(n => n.includes('fruit') || n.includes('banana') || n.includes('apple')), item: 'Fresh fruits — bananas, apples, or seasonal fruits for vitamins' },
      { check: !allFoodNames.some(n => n.includes('sprout') || n.includes('chana')), item: 'Sprouts / Boiled chana — high protein, low cost snack' },
      { check: !allFoodNames.some(n => n.includes('oat') || n.includes('muesli')), item: 'Oats — great for fiber and a healthy breakfast' },
      { check: !allFoodNames.some(n => n.includes('nut') || n.includes('almond') || n.includes('walnut')), item: 'Mixed nuts (almonds, walnuts) — healthy fats and snacking' },
    ];
    const suggested = smartSuggestions.filter(s => s.check).map(s => s.item);

    return res.status(200).json({
      available: true,
      groceryList: { regulars, nutritionGaps, suggested },
      summary: { avgDailyCalories, avgDailyProtein, daysTracked, uniqueFoods: patterns.length },
    });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}

function capitalize(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
