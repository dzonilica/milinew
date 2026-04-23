import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function verifyToken(req) {
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return false;
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    return true;
  } catch { return false; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const isAdmin = verifyToken(req);
    const q = supabase.from('ads').select('*').order('position').order('sort_order').order('id');
    const { data, error } = isAdmin ? await q : await q.eq('active', true);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    if (!verifyToken(req)) return res.status(401).json({ error: 'Niste prijavljeni' });
    const { client_name, position, image_url, link_url, active, sort_order } = req.body || {};

    if (!client_name?.trim()) return res.status(400).json({ error: 'Ime klijenta je obavezno' });
    if (!['left', 'right'].includes(position)) return res.status(400).json({ error: 'Pozicija mora biti left ili right' });
    if (!image_url?.trim()) return res.status(400).json({ error: 'Slika je obavezna' });

    const { data, error } = await supabase
      .from('ads')
      .insert([{
        client_name: client_name.trim(),
        position,
        image_url: image_url.trim(),
        link_url: link_url?.trim() || null,
        active: active !== false,
        sort_order: Number.isFinite(+sort_order) ? +sort_order : 0
      }])
      .select().single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
