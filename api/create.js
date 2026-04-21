import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' });

  // Auth check
  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Nevažeći token' });
  }

  const { title, description, image_url } = req.body || {};

  if (!title || !title.trim())
    return res.status(400).json({ error: 'Naslov je obavezan' });

  // Generate unique ID for manual posts
  const manualId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const { data, error } = await supabase
    .from('news')
    .insert([{
      title: title.trim(),
      description: description?.trim() || '',
      image_url: image_url?.trim() || null,
      instagram_post_id: manualId,
      instagram_post_url: null
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
