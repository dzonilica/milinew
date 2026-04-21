import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Unesite korisničko ime i lozinku' });

  const ADMIN_USER   = process.env.ADMIN_USERNAME || 'admin';
  const ADMIN_PASS   = process.env.ADMIN_PASSWORD || 'admin123';
  const JWT_SECRET   = process.env.JWT_SECRET     || 'dev-secret-change-me';

  if (username !== ADMIN_USER || password !== ADMIN_PASS)
    return res.status(401).json({ error: 'Pogrešno korisničko ime ili lozinka' });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
  return res.status(200).json({ token, username });
}
