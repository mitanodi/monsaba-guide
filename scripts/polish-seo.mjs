import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL, HERO_BY_ROUTE, LAST_MODIFIED, toAbsoluteUrl } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const pageConfig = {
  'index.html': { route: '/', type: 'WebSite', crumbs: [] },
  'zombie-rush/index.html': { route: '/zombie-rush/', type: 'Article', crumbs: ['ゾンビラッシュ攻略'] },
  'boss-rally/index.html': { route: '/boss-rally/', type: 'Article', crumbs: ['ボスラリー攻略'] },
  'badge-dojo/index.html': { route: '/badge-dojo/', type: 'Article', crumbs: ['バッジ道場攻略'] },
  'tata-tier/index.html': { route: '/tata-tier/', type: 'Article', crumbs: ['総合タタTier'] },
  'consult/index.html': { route: '/consult/', type: 'WebPage', crumbs: ['攻略相談所'] },
  'normal-guide/index.html': { route: '/normal-guide/', type: 'Article', crumbs: ['通常攻略'] },
  'evolution-priority/index.html': { route: '/evolution-priority/', type: 'Article', crumbs: ['進化優先度'] },
  'attribute/grass/index.html': { route: '/attribute/grass/', type: 'CollectionPage', crumbs: ['草属性攻略'] },
  'attribute/water/index.html': { route: '/attribute/water/', type: 'CollectionPage', crumbs: ['水属性攻略'] },
  'attribute/fire/index.html': { route: '/attribute/fire/', type: 'CollectionPage', crumbs: ['火属性攻略'] },
  'attribute/thunder/index.html': { route: '/attribute/thunder/', type: 'CollectionPage', crumbs: ['雷属性攻略'] },
  'attribute/rock/index.html': { route: '/attribute/rock/', type: 'CollectionPage', crumbs: ['岩属性攻略'] }
};

const escapeJsonForHtml = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const capture = (html, pattern, label, file) => {
  const match = html.match(pattern);
  if (!match) throw new Error(`${file}: ${label} が見つかりません`);
  return match[1];
};
const upsertMeta = (html, keyType, key, content) => {
  const re = new RegExp(`<meta ${keyType}="${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}" content="[^"]*" \\/>`);
  const tag = `<meta ${keyType}="${key}" content="${content}" />`;
  if (re.test(html)) return html.replace(re, tag);
  return html.replace('</head>', `  ${tag}\n</head>`);
};
const addSharedStaticMarkup = (html) => {
  if (!html.includes('class="skip-link"')) html = html.replace(/(<body(?:\s[^>]*)?>)/, '$1<a class="skip-link" href="#main-content">本文へスキップ</a>');
  html = html.replace(/<main(?![^>]*\bid=)/, '<main id="main-content"');
  if (!html.includes('class="footer-links"')) {
    html = html.replace(/<div class="footer-meta">([^<]*)<\/div>/, '<div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/privacy/">プライバシー</a><a href="/updates/">更新履歴</a><a href="/about-data/">データ方針</a></nav><div class="footer-meta">$1</div></div>');
  }
  return html;
};

for (const [file, config] of Object.entries(pageConfig)) {
  const absolute = path.join(root, file);
  let html = fs.readFileSync(absolute, 'utf8');
  const title = capture(html, /<title>([^<]+)<\/title>/, 'title', file);
  const description = capture(html, /<meta name="description" content="([^"]+)" \/>/, 'description', file);
  const url = toAbsoluteUrl(config.route);
  const hero = HERO_BY_ROUTE[config.route] || (config.route.startsWith('/attribute/') ? HERO_BY_ROUTE['/tata-tier/'] : HERO_BY_ROUTE['/']);
  const image = toAbsoluteUrl(hero);
  const imageAlt = `${title}のページ画像`;

  html = upsertMeta(html, 'property', 'og:image', image);
  html = upsertMeta(html, 'name', 'twitter:image', image);
  html = upsertMeta(html, 'property', 'og:image:alt', imageAlt);
  html = upsertMeta(html, 'property', 'og:url', url);

  const primary = {
    '@type': config.type,
    '@id': url,
    url,
    name: title,
    ...(config.type === 'Article' ? { headline: title } : {}),
    description,
    image,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    dateModified: LAST_MODIFIED,
    inLanguage: 'ja'
  };
  const graph = [primary];
  if (config.crumbs.length) {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'モンサバ攻略DB', item: `${BASE_URL}/` },
        ...config.crumbs.map((name, index) => ({ '@type': 'ListItem', position: index + 2, name, ...(index === config.crumbs.length - 1 ? {} : { item: url }) }))
      ]
    });
  }
  const jsonLd = `<script type="application/ld+json">${escapeJsonForHtml({ '@context': 'https://schema.org', '@graph': graph })}</script>`;
  html = /<script type="application\/ld\+json">[\s\S]*?<\/script>/.test(html)
    ? html.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, jsonLd)
    : html.replace('</head>', `  ${jsonLd}\n</head>`);
  html = addSharedStaticMarkup(html);
  fs.writeFileSync(absolute, html);
}

for (const directory of ['tata']) {
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(root, directory, entry.name, 'index.html');
    let html = fs.readFileSync(file, 'utf8');
    html = addSharedStaticMarkup(html);
    fs.writeFileSync(file, html);
  }
}

console.log(`SEO・共通静的マークアップを ${Object.keys(pageConfig).length + 63} ページへ適用しました。`);
