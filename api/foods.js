import supabase from './_supabase.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

    const { q, category, is_drink, limit = '50', offset = '0' } = req.query;

    let query = supabase
      .from('food_database')
      .select('*', { count: 'exact' })
      .order('name', { ascending: true })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (q && q.trim()) {
      query = query.ilike('name', `%${q.trim()}%`);
    }
    if (category && category !== 'All') {
      query = query.eq('category', category);
    }
    if (is_drink === 'true') {
      query = query.eq('is_drink', true);
    } else if (is_drink === 'false') {
      query = query.eq('is_drink', false);
    }

    const { data, error, count } = await query;
    if (error) throw error;

    return res.status(200).json({ items: data || [], total: count || 0 });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
