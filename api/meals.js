import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(50, parseInt(req.query.limit || '10', 10));
      const date = req.query.date;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      let query = supabase
        .from('meals')
        .select('*', { count: 'exact' })
        .eq('user_id', DEMO_USER_ID)
        .order('logged_at', { ascending: false });

      if (date) {
        query = query
          .gte('logged_at', `${date}T00:00:00.000Z`)
          .lte('logged_at', `${date}T23:59:59.999Z`);
      } else {
        query = query.range(from, to);
      }

      const { data: meals, error, count } = await query;
      if (error) throw error;

      // Fetch items for each meal separately
      const mealsWithItems = await Promise.all((meals || []).map(async (meal) => {
        const { data: items } = await supabase
          .from('meal_items')
          .select('*')
          .eq('meal_id', meal.id);
        return { ...meal, meal_items: items || [] };
      }));

      return res.status(200).json({ meals: mealsWithItems, total: count || 0, page, limit });
    }

    if (req.method === 'POST') {
      const { meal_type, total_calories, total_protein, total_carbs, total_fat, input_type, health_score, items } = req.body;
      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .insert({
          user_id: DEMO_USER_ID,
          meal_type: meal_type || 'other',
          total_calories: total_calories || 0,
          total_protein: total_protein || 0,
          total_carbs: total_carbs || 0,
          total_fat: total_fat || 0,
          input_type: input_type || 'text',
          health_score: health_score || null,
          logged_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (mealError) throw mealError;

      if (items && items.length > 0) {
        const mealItems = items.map(item => ({
          meal_id: meal.id,
          food_name: item.food_name,
          weight_g: item.weight_g || 0,
          calories: item.calories || 0,
          protein_g: item.protein_g || 0,
          carbs_g: item.carbs_g || 0,
          fat_g: item.fat_g || 0,
        }));
        const { error: itemsError } = await supabase.from('meal_items').insert(mealItems);
        if (itemsError) throw itemsError;
      }

      const { data: insertedItems } = await supabase.from('meal_items').select('*').eq('meal_id', meal.id);
      return res.status(201).json({ ...meal, meal_items: insertedItems || [] });
    }

    if (req.method === 'PUT') {
      const { id, total_calories, total_protein, total_carbs, total_fat, health_score, is_corrected, items } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });

      const { data: meal, error: mealError } = await supabase
        .from('meals')
        .update({ total_calories, total_protein, total_carbs, total_fat, health_score, is_corrected })
        .eq('id', id)
        .eq('user_id', DEMO_USER_ID)
        .select()
        .single();
      if (mealError) throw mealError;

      if (items) {
        await supabase.from('meal_items').delete().eq('meal_id', id);
        if (items.length > 0) {
          const mealItems = items.map(item => ({
            meal_id: id,
            food_name: item.food_name,
            weight_g: item.weight_g || 0,
            calories: item.calories || 0,
            protein_g: item.protein_g || 0,
            carbs_g: item.carbs_g || 0,
            fat_g: item.fat_g || 0,
          }));
          await supabase.from('meal_items').insert(mealItems);
        }
      }

      const { data: updatedItems } = await supabase.from('meal_items').select('*').eq('meal_id', id);
      return res.status(200).json({ ...meal, meal_items: updatedItems || [] });
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      await supabase.from('meal_items').delete().eq('meal_id', id);
      const { error } = await supabase.from('meals').delete().eq('id', id).eq('user_id', DEMO_USER_ID);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
