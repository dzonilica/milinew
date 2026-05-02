import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DOMAIN = 'https://kragujevacsport.com';
const NEWS_SITEMAP_WINDOW_DAYS = 2; // Google News only indexes articles from the past 2 days

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Formats an ISO string to YYYY-MM-DD for <lastmod>
function toW3CDate(isoString) {
  return isoString ? isoString.slice(0, 10) : null;
}

// Route dispatch:
//   /sitemap.xml           -> sitemap index
//   /sitemap-news.xml      -> Google News sitemap (articles from last 2 days)
//   /sitemap-articles.xml  -> full article sitemap (up to 50 000 URLs)
export default async function handler(req, res) {
  const url = req.url || '';

  if (url.includes('sitemap-news')) {
    return serveNewsSitemap(res);
  }
  if (url.includes('sitemap-articles')) {
    return serveArticlesSitemap(res);
  }
  return serveSitemapIndex(res);
}

// ─── Sitemap Index ────────────────────────────────────────────────────────────

function serveSitemapIndex(res) {
  const today = new Date().toISOString().slice(0, 10);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${DOMAIN}/sitemap-static.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-articles.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${DOMAIN}/sitemap-news.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>\n`;

  sendXml(res, xml);
}

// ─── Full Article Sitemap ─────────────────────────────────────────────────────
// Uses clean /vest/:id URLs (matched by the Vercel rewrite rule).
// Includes image sitemap extension so Google can index article images.

async function serveArticlesSitemap(res) {
  const { data: articles, error } = await supabase
    .from('news')
    .select('id, created_at, image_url, title')
    .order('created_at', { ascending: false })
    .limit(50000); // Sitemap Protocol hard limit

  if (error) {
    res.status(500).send('Supabase error: ' + error.message);
    return;
  }

  const rows = (articles || []).map(n => {
    const loc = escapeXml(`${DOMAIN}/vest/${n.id}`);
    const lastmod = toW3CDate(n.created_at);
    const imgLoc = n.image_url ? escapeXml(n.image_url) : null;
    const imgTitle = n.title ? escapeXml(n.title) : null;

    return `  <url>
    <loc>${loc}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}\
${imgLoc ? `    <image:image>
      <image:loc>${imgLoc}</image:loc>
${imgTitle ? `      <image:title>${imgTitle}</image:title>\n` : ''}\
    </image:image>\n` : ''}\
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${rows}
</urlset>\n`;

  sendXml(res, xml, 'public, s-maxage=600, stale-while-revalidate=3600');
}

// ─── Google News Sitemap ──────────────────────────────────────────────────────
// Google News only processes articles published in the past 2 days.
// Requires xmlns:news extension. No lastmod or image extensions in this sitemap.
// Spec: https://developers.google.com/search/docs/crawling-indexing/sitemaps/news-sitemap

async function serveNewsSitemap(res) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - NEWS_SITEMAP_WINDOW_DAYS);

  const { data: articles, error } = await supabase
    .from('news')
    .select('id, created_at, title')
    .gte('created_at', cutoff.toISOString())
    .order('created_at', { ascending: false })
    .limit(1000); // Google News hard limit per sitemap

  if (error) {
    res.status(500).send('Supabase error: ' + error.message);
    return;
  }

  const rows = (articles || []).map(n => {
    const loc = escapeXml(`${DOMAIN}/vest/${n.id}`);
    // Google News requires full W3C datetime with timezone, not just date
    const pubDate = n.created_at ? new Date(n.created_at).toISOString() : null;
    const title = n.title ? escapeXml(n.title) : 'Vest';

    return `  <url>
    <loc>${loc}</loc>
    <news:news>
      <news:publication>
        <news:name>Kragujevac Sport</news:name>
        <news:language>sr</news:language>
      </news:publication>
${pubDate ? `      <news:publication_date>${pubDate}</news:publication_date>\n` : ''}\
      <news:title>${title}</news:title>
    </news:news>
  </url>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${rows}
</urlset>\n`;

  // Short TTL: news sitemap must stay fresh for Googlebot News crawler
  sendXml(res, xml, 'public, s-maxage=300, stale-while-revalidate=600');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sendXml(res, xml, cacheControl = 'public, s-maxage=600, stale-while-revalidate=1800') {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  res.status(200).send(xml);
}
