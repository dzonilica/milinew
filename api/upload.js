import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export const config = {
  api: { bodyParser: { sizeLimit: '12mb' } }
};

const EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif'
};

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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!verifyToken(req)) return res.status(401).json({ error: 'Niste prijavljeni' });

  const { data_url, folder } = req.body || {};
  if (!data_url || typeof data_url !== 'string')
    return res.status(400).json({ error: 'Nedostaje slika' });

  const m = data_url.match(/^data:([a-zA-Z0-9+/.-]+);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Nevažeći format slike' });

  const mime = m[1].toLowerCase();
  const ext = EXT_BY_MIME[mime];
  if (!ext) return res.status(400).json({ error: 'Podržani formati: JPG, PNG, WebP, GIF, AVIF' });

  const buffer = Buffer.from(m[2], 'base64');
  if (buffer.length > 10 * 1024 * 1024)
    return res.status(413).json({ error: 'Slika je veća od 10MB' });

  const safeFolder = ['news', 'ads'].includes(folder) ? folder : 'news';
  const filename = `${safeFolder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error: upErr } = await supabase.storage
    .from('media')
    .upload(filename, buffer, { contentType: mime, upsert: false });

  if (upErr) return res.status(500).json({ error: upErr.message });

  const { data: pub } = supabase.storage.from('media').getPublicUrl(filename);

  return res.status(200).json({ url: pub.publicUrl, path: filename });
}
