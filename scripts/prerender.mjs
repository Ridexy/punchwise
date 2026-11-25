// Renders every route to static HTML so pages are indexable without JavaScript,
// then writes sitemap.xml, robots.txt and 404.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const ssr = await import(pathToFileURL(path.join(root, 'dist-ssr', 'entry-server.js')).href);
const { render, ROUTES, NOT_FOUND, SITE_NAME, SITE_URL, CF_BEACON_TOKEN } = ssr;
const template = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

function head(m) {
  const url = SITE_URL + m.path;
  const tags = [
    `<title>${esc(m.title)}</title>`,
    `<meta name="description" content="${esc(m.description)}" />`,
    `<link rel="canonical" href="${url}" />`,
    m.index ? '' : '<meta name="robots" content="noindex" />',
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${SITE_URL}/og.jpg" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  const ld = [];
  if (m.tool) ld.push({ '@context': 'https://schema.org', '@type': 'WebApplication', name: m.title.split(' | ')[0], url, description: m.description,
    applicationCategory: 'BusinessApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' } });
  if (m.path !== '/' && m.index) ld.push({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL + '/' },
    { '@type': 'ListItem', position: 2, name: m.crumb, item: url }] });
  for (const o of ld) tags.push(`<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`);
  return tags.filter(Boolean).join('\n    ');
}

const analytics = CF_BEACON_TOKEN
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: CF_BEACON_TOKEN, spa: true })}'></script>`
  : '';

function page(m, url) {
  return template.replace('<!--head-->', head(m)).replace('<!--app-->', render(url)).replace('<!--analytics-->', analytics);
}

for (const m of ROUTES) {
  const dir = path.join(dist, m.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), page(m, m.path));
}
fs.writeFileSync(path.join(dist, '404.html'), page(NOT_FOUND, '/404'));

const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(path.join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.filter((r) => r.index).map((r) => `  <url><loc>${SITE_URL}${r.path}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`);
fs.writeFileSync(path.join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /view/\nDisallow: /saved/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
fs.rmSync(path.join(root, 'dist-ssr'), { recursive: true, force: true });
console.log(`prerendered ${ROUTES.length} routes + 404 for ${SITE_URL}${CF_BEACON_TOKEN ? ' (analytics on)' : ''}`);
