import supabase from './_supabase.js';

const DEMO_USER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const limit = Math.min(365, parseInt(req.query.limit || '90', 10));
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', DEMO_USER_ID)
        .order('logged_at', { ascending: true })
        .limit(limit);
      if (error) throw error;
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      const { weight_kg, note } = req.body;
      if (!weight_kg || weight_kg < 20 || weight_kg > 300) {
        return res.status(400).json({ error: 'Weight must be 20-300 kg' });
      }
      const today = new Date().toISOString().split('T')[0];
      // Check if entry exists for today
      const { data: existing } = await supabase
        .from('weight_logs')
        .select('id')
        .eq('user_id', DEMO_USER_ID)
        .eq('logged_at', today)
        .single();

      let data, error;
      if (existing) {
        ({ data, error } = await supabase
          .from('weight_logs')
          .update({ weight_kg, note: note || null })
          .eq('id', existing.id)
          .select()
          .single());
      } else {
        ({ data, error } = await supabase
          .from('weight_logs')
          .insert({ user_id: DEMO_USER_ID, weight_kg, note: note || null, logged_at: today })
          .select()
          .single());
      }
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      if (!id) return res.status(400).json({ error: 'id required' });
      const { error } = await supabase.from('weight_logs').delete().eq('id', id).eq('user_id', DEMO_USER_ID);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
