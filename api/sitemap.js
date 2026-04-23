import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function siteBase(req) {
  const env = process.env.SITE_URL;
  if (env) return env.replace(/\/$/, '');
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return proto + '://' + host;
}

function escapeXml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default async function handler(req, res) {
  const base = siteBase(req);

  const { data: news } = await supabase
    .from('news')
    .select('id, created_at, image_url, title')
    .order('created_at', { ascending: false })
    .limit(2000);

  const urls = [
    { loc: base + '/', changefreq: 'hourly', priority: '1.0' }
  ];

  (news || []).forEach(n => {
    urls.push({
      loc: base + '/vest.html?id=' + encodeURIComponent(n.id),
      lastmod: new Date(n.created_at).toISOString(),
      changefreq: 'weekly',
      priority: '0.8',
      image: n.image_url,
      title: n.title
    });
  });

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
    + 'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n'
    + urls.map(u => ''
      + '  <url>\n'
      + '    <loc>' + escapeXml(u.loc) + '</loc>\n'
      + (u.lastmod ? '    <lastmod>' + u.lastmod + '</lastmod>\n' : '')
      + (u.changefreq ? '    <changefreq>' + u.changefreq + '</changefreq>\n' : '')
      + (u.priority ? '    <priority>' + u.priority + '</priority>\n' : '')
      + (u.image ? '    <image:image>\n'
          + '      <image:loc>' + escapeXml(u.image) + '</image:loc>\n'
          + (u.title ? '      <image:title>' + escapeXml(u.title) + '</image:title>\n' : '')
          + '    </image:image>\n' : '')
      + '  </url>').join('\n')
    + '\n</urlset>\n';

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=1800');
  res.status(200).send(xml);
}
