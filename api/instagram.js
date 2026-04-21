import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization;
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Niste prijavljeni' });

  try {
    jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Nevažeći token' });
  }

  const { url } = req.body || {};
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({ error: 'Unesite validan Instagram URL (instagram.com/p/...)' });
  }

  // Normalize URL — ensure it ends with /
  const cleanUrl = url.trim().replace(/\/?$/, '/');

  // Strategy 1: Instagram oEmbed (works without token for public posts)
  try {
    const oembedRes = await fetch(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(cleanUrl)}&omitscript=true`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    if (oembedRes.ok) {
      const data = await oembedRes.json();
      if (data.thumbnail_url) {
        return res.json({
          image_url: data.thumbnail_url,
          description: '',
          instagram_post_url: cleanUrl,
          source: 'oembed'
        });
      }
    }
  } catch (_) {}

  // Strategy 2: Scrape OG tags from Instagram page using social bot UA
  try {
    const pageRes = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'sr,en;q=0.5',
        'Cache-Control': 'no-cache',
      },
      redirect: 'follow',
    });

    if (!pageRes.ok) throw new Error(`HTTP ${pageRes.status}`);
    const html = await pageRes.text();

    const getOg = (prop) => {
      const m = html.match(new RegExp(`<meta[^>]+property="${prop}"[^>]+content="([^"]+)"`, 'i'))
        || html.match(new RegExp(`<meta[^>]+content="([^"]+)"[^>]+property="${prop}"`, 'i'));
      return m ? decodeEntities(m[1]) : null;
    };

    const image_url = getOg('og:image');
    let description = getOg('og:description') || '';

    // Instagram og:description format: "X likes, Y comments - USER: [caption]"
    // Extract just the caption part after ": "
    const colonIdx = description.indexOf(': ');
    if (colonIdx !== -1) description = description.slice(colonIdx + 2).trim();

    return res.json({
      image_url,
      description,
      instagram_post_url: cleanUrl,
      source: 'scrape'
    });
  } catch (e) {
    return res.status(500).json({
      error: 'Ne mogu da učitam objavu. Proveri da li je profil javan i da li je link tačan.'
    });
  }
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\\n/g, '\n');
}
