import supabase from './_supabase.js';

export async function getUserId(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Fallback to demo user if no auth header (for backward compatibility during migration)
    return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    return user.id;
  } catch (err) {
    return 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  }
}
