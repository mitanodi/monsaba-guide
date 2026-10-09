import fs from 'node:fs';
import path from 'node:path';
import { COPY } from '../tier-maker/copy.js';
import { renderFooter, renderHeader } from './shared-layout.mjs';
import { renderGa4Tag } from './update-ga4-tag.mjs';
import { BASE_URL } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const locales = [['ja', '', 'ja'], ['en', '/en', 'en'], ['zh-CN', '/zh-cn', 'zh-Hans']];
const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
for (const [locale, prefix] of locales) {
  const c = COPY[locale], route = `${prefix}/tier-maker/`;
  const alternates = [...locales.map(([, p, lang]) => [lang, `${p}/tier-maker/`]), ['x-default', '/tier-maker/']];
  const dictionary = locale === 'ja' ? {} : {...JSON.parse(fs.readFileSync(path.join(root, `data/i18n/${locale}.json`), 'utf8')), ...JSON.parse(fs.readFileSync(path.join(root, 'data/i18n/overrides.json'), 'utf8'))[locale]};
  if (locale !== 'ja') {
    for (const file of ['quality-overrides', 'phase3', 'phase4']) Object.assign(dictionary, JSON.parse(fs.readFileSync(path.join(root, `data/i18n/${file}.json`), 'utf8'))[locale]);
    dictionary['みんなの編成'] = locale === 'en' ? 'Community formations' : '社区阵容';
  }
  const translateAttributes = html => html.replace(/\b(aria-label|title)="([^"]+)"/g, (full, attr, value) => dictionary[value] ? `${attr}="${esc(dictionary[value])}"` : full);
  let footer = renderFooter().replace('<footer>', '<footer class="tm-footer">').replace(/>([^<>]+)</g, (full,text) => {
    const trimmed=text.trim(), translation=trimmed==='モンサバ攻略DB' ? c.site : dictionary[trimmed];
    return translation ? '>'+esc(text.replace(trimmed,translation))+'<' : full;
  });
  let header = renderHeader(route).replace(/>([^<>]+)</g, (full,text) => {const trimmed=text.trim(), translation=trimmed==='モンサバ攻略DB' ? c.site : dictionary[trimmed];return translation ? '>'+esc(text.replace(trimmed,translation))+'<' : full;});
  header = translateAttributes(header).replace(/<option value="([^"]+)"(?: selected)?>/g, (_, value) => `<option value="${value}"${value === locale ? ' selected' : ''}>`);
  footer = translateAttributes(footer);
  if(prefix) header=header.replace(/href="\/(?!\/)/g, `href="${prefix}/`);
  if(prefix) footer=footer.replace(/href="\/(?!\/)/g, `href="${prefix}/`);
  const html = `<!doctype html>
<html lang="${locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(c.title)} | ${esc(c.site)}</title><meta name="description" content="${esc(c.intro)}"><meta name="robots" content="noindex,follow">
<link rel="canonical" href="${BASE_URL}${route}">${alternates.map(([lang, url]) => `<link rel="alternate" hreflang="${lang}" href="${BASE_URL}${url}" data-i18n-alternate>`).join('')}
<meta property="og:locale" content="${{ ja: 'ja_JP', en: 'en_US', 'zh-CN': 'zh_CN' }[locale]}">${locales.filter(([lang]) => lang !== locale).map(([lang]) => `<meta property="og:locale:alternate" content="${{ ja: 'ja_JP', en: 'en_US', 'zh-CN': 'zh_CN' }[lang]}" data-i18n-alternate>`).join('')}
<meta property="og:title" content="${esc(c.title)} | ${esc(c.site)}"><meta property="og:description" content="${esc(c.intro)}"><meta property="og:type" content="website"><meta property="og:url" content="${BASE_URL}${route}"><meta name="twitter:card" content="summary">
<meta name="theme-color" content="#225ba9"><link rel="icon" href="/favicon.ico"><link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/astra.css"><link rel="stylesheet" href="/tier-maker/tier-maker.css">
${renderGa4Tag().replace('data-monsaba-ga4="loader"', 'data-monsaba-ga4="loader" type="text/plain"')}
</head><body data-locale="${locale}" class="tm-page" data-page-type="tool">
<a class="skip-link" href="#main-content">${esc(c.title)}</a>
${header}
<main class="tm-main" id="main-content"><div class="tm-hero"><h1>${esc(c.title)}</h1><p>${esc(c.intro)}</p><span class="tm-save-status">${esc(c.local)}</span></div><p class="tm-status" data-status role="status" aria-live="polite"></p><div data-tier-maker></div><noscript>${esc(c.loadError)} JavaScript</noscript></main>
${footer}<dialog data-dialog></dialog><dialog data-image-dialog></dialog><script src="/family-display.js"></script><script src="/site.js" defer></script><script src="/growth.js" defer></script>${prefix ? `<script src="/i18n/${prefix.slice(1)}-runtime.js" defer></script><script src="/i18n-runtime.js" defer></script>` : ''}<script type="module" src="/tier-maker/tier-maker.js"></script>
</body></html>
`;
  const filename = path.join(root, route.slice(1), 'index.html');
  const before = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : null;
  if (before !== html) {
    if (process.argv.includes('--check')) throw new Error(`Stale Tier Maker: ${route}`);
    fs.mkdirSync(path.dirname(filename), { recursive: true }); fs.writeFileSync(filename, html);
  }
}
console.log('Tier Maker: JA / EN / zh-CN');
