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

  // Validate username
  const clean = (username || '').trim();
  if (clean.length < 2)  return res.status(400).json({ error: 'Korisničko ime mora imati najmanje 2 znaka.' });
  if (clean.length > 30) return res.status(400).json({ error: 'Korisničko ime ne sme biti duže od 30 znakova.' });
  if (!/^[a-zA-ZА-Яа-яЈјЉљЊњЋћЏџ0-9_.\ -]+$/.test(clean))
    return res.status(400).json({ error: 'Korisničko ime sadrži nedozvoljen karakter.' });

  // Validate password
  if (!password || password.length < 6)
    return res.status(400).json({ error: 'Lozinka mora imati najmanje 6 znakova.' });

  // Check username availability (case-insensitive)
  const { data: existing } = await supabase
    .from('commenters')
    .select('id')
    .ilike('username', clean)
    .maybeSingle();

  if (existing) return res.status(400).json({ error: 'Ovo korisničko ime je zauzeto. Izaberi drugo.' });

  // Generate unique internal email (never shown to user)
  const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const email = `ks_${uid}@users.kragujevacsport.app`;

  // Create Supabase Auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: clean, username: clean }
  });

  if (authError) return res.status(500).json({ error: 'Greška pri kreiranju naloga.' });

  // Store username → user_id mapping
  const { error: insertError } = await supabase
    .from('commenters')
    .insert({ id: authData.user.id, username: clean });

  if (insertError) {
    await supabase.auth.admin.deleteUser(authData.user.id);
    return res.status(500).json({ error: 'Greška pri čuvanju korisničkog imena.' });
  }

  // Sign in to get session
  const { data: signIn, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) return res.status(200).json({ message: 'Registracija uspešna. Prijavi se.' });

  return res.status(200).json({ session: signIn.session, username: clean });
}
