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
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (!verifyToken(req)) return res.status(401).json({ error: 'Niste prijavljeni' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'ID je obavezan' });

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('ads').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  if (req.method === 'PUT') {
    const { client_name, position, image_url, link_url, active, sort_order } = req.body || {};
    const update = {};
    if (client_name !== undefined) update.client_name = String(client_name).trim();
    if (position !== undefined) {
      if (!['top', 'middle', 'in_grid', 'bottom'].includes(position))
        return res.status(400).json({ error: 'Neispravna pozicija reklame' });
      update.position = position;
    }
    if (image_url !== undefined) update.image_url = String(image_url).trim();
    if (link_url !== undefined) update.link_url = link_url ? String(link_url).trim() : null;
    if (active !== undefined) update.active = !!active;
    if (sort_order !== undefined && Number.isFinite(+sort_order)) update.sort_order = +sort_order;

    const { data, error } = await supabase.from('ads').update(update).eq('id', id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
