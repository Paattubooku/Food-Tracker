import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    // For demo: always use the seeded demo user
    const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', DEMO_USER_ID)
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { calorie_goal, protein_goal, carbs_goal, fat_goal, height_cm, age, gender, activity_level } = req.body;
      const updateData = {};
      if (calorie_goal !== undefined) updateData.calorie_goal = calorie_goal;
      if (protein_goal !== undefined) updateData.protein_goal = protein_goal;
      if (carbs_goal !== undefined) updateData.carbs_goal = carbs_goal;
      if (fat_goal !== undefined) updateData.fat_goal = fat_goal;
      if (height_cm !== undefined) updateData.height_cm = height_cm;
      if (age !== undefined) updateData.age = age;
      if (gender !== undefined) updateData.gender = gender;
      if (activity_level !== undefined) updateData.activity_level = activity_level;

      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', DEMO_USER_ID)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
