import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};

  if (!username || !password)
    return res.status(400).json({ error: 'Unesite korisničko ime i lozinku.' });

  // Look up username → user_id (case-insensitive)
  const { data: commenter } = await supabase
    .from('commenters')
    .select('id')
    .ilike('username', username.trim())
    .maybeSingle();

  if (!commenter)
    return res.status(400).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

  // Get the internal email for this user
  const { data: { user }, error: getUserError } = await supabase.auth.admin.getUserById(commenter.id);

  if (getUserError || !user)
    return res.status(400).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

  // Sign in with the internal email + password
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (signInError)
    return res.status(400).json({ error: 'Pogrešno korisničko ime ili lozinka.' });

  return res.status(200).json({ session: signIn.session, username: username.trim() });
}
