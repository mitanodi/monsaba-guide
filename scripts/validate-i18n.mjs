import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const invalidMarker = /[\[【［]\d{4}[\]】］]|MNSB(?:PN|DB|GAME)/;
const expect = (condition, message) => { if (!condition) errors.push(message); };
const retrySignal = new Int32Array(new SharedArrayBuffer(4));
function readAbsolute(file) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(file, 'utf8'); } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}
const read = (relative) => readAbsolute(path.join(root, relative));
const config = JSON.parse(read('data/i18n/config.json'));
const locales = Object.freeze([
  { key: 'en', directory: 'en', lang: 'en', hrefLang: 'en', og: 'en_US' },
  { key: 'zh-CN', directory: 'zh-cn', lang: 'zh-CN', hrefLang: 'zh-Hans', og: 'zh_CN' }
]);
const ignored = new Set(['.git', '.github', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn', 'assets', 'data', 'scripts']);

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name === 'index.html' || (directory === root && entry.name === '404.html') ? [full] : [];
  });
}
const routeFor = (file) => path.basename(file) === '404.html' ? '/404/' : (path.relative(root, path.dirname(file)).replaceAll('\\', '/') ? `/${path.relative(root, path.dirname(file)).replaceAll('\\', '/')}/` : '/');
const localizedRoute = (route, directory) => route === '/' ? `/${directory}/` : `/${directory}${route}`;
const outputFile = (source, directory) => path.join(root, directory, path.relative(root, source));
const sourceFiles = walk(root);
const sitemap = read('sitemap.xml');
const sitemapLocs = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]));
const protectedTerms = new Set(['日本語', '简体中文', 'おぢ']);
function collectProtected(value, key = '') {
  if (Array.isArray(value)) return value.forEach((item) => collectProtected(item, key));
  if (value && typeof value === 'object') return Object.entries(value).forEach(([childKey, child]) => collectProtected(child, childKey));
  if (typeof value === 'string' && /(?:name|familyName|skillName|tataName|officialTataName|databaseTataName)$/i.test(key) && /[\u3040-\u30ff\u3400-\u9fff]/.test(value)) protectedTerms.add(value);
}
for (const relative of ['data/tatari.json', 'data/tata-skills.json', 'data/content-guides.json', 'data/events.json', 'data/items.json', 'data/systems.json', 'data/stages.json', 'data/zombie-rush/seasons/season-1.json']) collectProtected(JSON.parse(read(relative)));
collectProtected(JSON.parse(read('data/i18n/localized-names.json')));
for (const term of ['系', 'パクマ', '魔法の農場リメイク', 'サンドワームゾンビ', 'スノーフィストゾンビ', 'ドアゾンビ', 'ナムアミダイジャ']) protectedTerms.add(term);
const sortedProtectedTerms = [...protectedTerms].sort((a, b) => b.length - a.length);
const untranslated = { en: new Set(), 'zh-CN': new Set() };
function collectUntranslated(html, locale) {
  const visible = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
  const values = [
    ...[...visible.matchAll(/>([^<>]+)</g)].map((match) => match[1]),
    ...[...visible.matchAll(/\b(?:alt|title|placeholder|aria-label|content)="([^"]+)"/g)].map((match) => match[1])
  ];
  for (const value of values) {
    let remainder = value;
    for (const term of sortedProtectedTerms) remainder = remainder.replaceAll(term, '');
    remainder = remainder.replace(/[・「」『』（）]/g, '');
    const pattern = locale === 'en' ? /[\u3040-\u30ff\u3400-\u9fff]/ : /[\u3040-\u30ff]/;
    if (pattern.test(remainder)) untranslated[locale].add(value.trim());
  }
}

expect(sourceFiles.length === 114, `Japanese page count: expected 114, got ${sourceFiles.length}`);
expect(config.preferenceKey === 'monsabaLanguage:v1', 'Language preference key changed');
expect(sitemapLocs.size === 318, `Sitemap URL count: expected 318, got ${sitemapLocs.size}`);
expect((sitemap.match(/<xhtml:link /g) || []).length === 1272, 'Sitemap must contain four alternates per URL');

for (const sourceFile of sourceFiles) {
  const route = routeFor(sourceFile);
  const source = readAbsolute(sourceFile);
  const sourceNoindex = /<meta name="robots" content="[^"]*noindex/i.test(source);
  const alternateRoutes = {
    ja: route,
    en: localizedRoute(route, 'en'),
    'zh-Hans': localizedRoute(route, 'zh-cn'),
    'x-default': route
  };
  expect(source.includes('<html lang="ja"'), `${route}: Japanese html lang missing`);
  if (route !== '/404/') for (const [hreflang, alternate] of Object.entries(alternateRoutes)) expect(source.includes(`hreflang="${hreflang}" href="${BASE_URL}${alternate}"`), `${route}: Japanese ${hreflang} alternate missing`);

  for (const locale of locales) {
    const localizedFile = outputFile(sourceFile, locale.directory);
    expect(fs.existsSync(localizedFile), `${route}: ${locale.key} page missing`);
    if (!fs.existsSync(localizedFile)) continue;
    const html = readAbsolute(localizedFile);
    collectUntranslated(html, locale.key);
    const localRoute = localizedRoute(route, locale.directory);
    const localizedNoindex = /<meta name="robots" content="[^"]*noindex/i.test(html);
    expect(localizedNoindex === sourceNoindex, `${localRoute}: robots policy differs from Japanese`);
    expect(html.includes(`<html lang="${locale.lang}"`), `${localRoute}: html lang mismatch`);
    expect(html.includes(`<body data-locale="${locale.key}"`), `${localRoute}: data-locale missing`);
    if (route !== '/404/') {
      expect(html.includes(`<link rel="canonical" href="${BASE_URL}${localRoute}">`), `${localRoute}: self canonical missing`);
      expect(html.includes(`<meta property="og:url" content="${BASE_URL}${localRoute}"`), `${localRoute}: og:url mismatch`);
    }
    expect(html.includes(`property="og:locale" content="${locale.og}"`), `${localRoute}: og:locale mismatch`);
    if (route !== '/404/') {
      expect((html.match(/data-i18n-alternate/g) || []).length === 6, `${localRoute}: alternate tag count mismatch`);
      for (const [hreflang, alternate] of Object.entries(alternateRoutes)) expect(html.includes(`hreflang="${hreflang}" href="${BASE_URL}${alternate}"`), `${localRoute}: ${hreflang} alternate missing`);
    }
    expect(html.includes(`<option value="${locale.key}" selected>`), `${localRoute}: language selector state missing`);
    expect(html.includes(`/i18n/${locale.directory}-runtime.js?v=${JSON.parse(read('data/asset-build.json')).version}`), `${localRoute}: versioned locale runtime missing`);
    expect(!/\b(?:undefined|null|\[i18n\.[^\]]+\])\b/.test(html), `${localRoute}: missing translation marker rendered`);
    expect(!invalidMarker.test(html), `${localRoute}: bootstrap marker rendered`);
    expect(!html.includes(`${BASE_URL}/${locale.directory}/assets/`), `${localRoute}: structured-data asset URL was localized`);
    expect(!/(?:href|src)="(?:\.\.?\/)+[^"?]+\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)/i.test(html), `${localRoute}: relative shared resource would resolve inside locale directory`);
    expect(!new RegExp(`(?:href|src)="\/${locale.directory}\/[^"?]+\\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)`, 'i').test(html), `${localRoute}: shared resource was incorrectly locale-prefixed`);
    const internalLinks = [...html.matchAll(/href="(\/[^"]*)"/g)].map((match) => match[1]);
    for (const href of internalLinks) {
      if (href.startsWith(`/${locale.directory}/`) || href.startsWith('/assets/') || href.startsWith('/api/') || href.startsWith('/data/') || /\.(?:css|js|json|xml|txt|webmanifest|ico|png|jpe?g|webp|svg)(?:[?#]|$)/i.test(href)) continue;
      expect(false, `${localRoute}: internal link escapes locale: ${href}`);
    }
    for (const block of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const data = JSON.parse(block[1]);
        const visit = (value, key = '') => {
          if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
          if (value && typeof value === 'object') return Object.entries(value).forEach(([childKey, child]) => visit(child, childKey));
          if (key === 'inLanguage') expect(value === locale.lang, `${localRoute}: JSON-LD inLanguage ${value}`);
        };
        visit(data);
      } catch { expect(false, `${localRoute}: invalid JSON-LD`); }
    }
    if (!sourceNoindex && route !== '/404/') expect(sitemapLocs.has(`${BASE_URL}${localRoute}`), `${localRoute}: missing from sitemap`);
    if (sourceNoindex || route === '/404/') expect(!sitemapLocs.has(`${BASE_URL}${localRoute}`), `${localRoute}: noindex/404 included in sitemap`);
  }
  if (!sourceNoindex && route !== '/404/') expect(sitemapLocs.has(`${BASE_URL}${route}`), `${route}: Japanese page missing from sitemap`);
}

for (const locale of locales) {
  const dictionary = JSON.parse(read(`data/i18n/${locale.key}.json`));
  expect(Object.keys(dictionary).length >= 5400, `${locale.key}: translation dictionary unexpectedly small`);
  expect(Object.values(dictionary).every((value) => typeof value === 'string' && value.trim()), `${locale.key}: empty translation value`);
  expect(Object.values(dictionary).every((value) => !invalidMarker.test(value)), `${locale.key}: bootstrap marker remains in translation dictionary`);
}
for (const locale of locales) expect(untranslated[locale.key].size === 0, `${locale.key}: untranslated UI/content: ${[...untranslated[locale.key]].slice(0, 100).join(' | ')}`);

const tatari = JSON.parse(read('data/tatari.json'));
const skills = JSON.parse(read('data/tata-skills.json'));
expect(tatari.families.length === 63, 'Tatari family count changed');
expect(tatari.families.flatMap((family) => family.evolutions).length === 224, 'Monster count changed');
expect(skills.totals?.stages === 224 && skills.totals?.skills === 224, `Skill stage count changed: ${skills.totals?.stages}`);
expect(read('site.js').includes("localStorage.setItem('monsabaLanguage:v1'"), 'Language preference is not stored');
expect(read('site.js').includes('location.search') && read('site.js').includes('location.hash'), 'Language switching does not preserve query/hash');
expect(read('i18n-runtime.js').includes('.official-x-post-text') && read('i18n-runtime.js').includes('.friend-comment'), 'UGC/X translation exclusion missing');
expect(read('app.js').includes("fetch('/data/tatari.json'"), 'Shared Tatari data must use a locale-independent root URL');
expect(read('data/adsense-config.json').includes('"enabled": false') && read('data/adsense-config.json').includes('"autoAds": false'), 'AdSense must remain disabled');
expect(read('ads.txt').trim() === 'google.com, pub-2710725734378326, DIRECT, f08c47fec0942fa0', 'ads.txt changed');

if (errors.length) {
  console.error(`i18n validation failed (${errors.length})`);
  errors.slice(0, 100).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}
console.log('i18n validation passed: 114 pages × 3 locales, 318 indexable URLs, reciprocal alternates and shared data verified.');
