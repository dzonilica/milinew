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

function sanitizeGallery(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(x => x && typeof x.url === 'string' && x.url.trim())
    .slice(0, 20)
    .map(x => ({ url: String(x.url).trim() }));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifyToken(req)) return res.status(401).json({ error: 'Niste prijavljeni' });

  const { title, description, image_url, instagram_post_url, gallery, category } = req.body || {};

  if (!title || !title.trim())
    return res.status(400).json({ error: 'Naslov je obavezan' });

  const manualId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const cleanGallery = sanitizeGallery(gallery);
  const mainImage = image_url?.trim() || cleanGallery[0]?.url || null;

  const { data, error } = await supabase
    .from('news')
    .insert([{
      title: title.trim(),
      description: description?.trim() || '',
      image_url: mainImage,
      gallery: cleanGallery,
      category: category?.trim() || null,
      instagram_post_id: manualId,
      instagram_post_url: instagram_post_url?.trim() || null
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(200).json(data);
}
