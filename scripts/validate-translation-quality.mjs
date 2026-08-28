import fs from 'node:fs';
import path from 'node:path';
import { translationQuality } from './i18n-quality.mjs';

const root = path.resolve(import.meta.dirname, '..');
const errors = [];
const locales = Object.freeze([
  { key: 'en', directory: 'en' },
  { key: 'zh-CN', directory: 'zh-cn' }
]);
const placeholder = /MNSB[A-Z0-9_]*|\b(?:PLACEHOLDER|BRANDX|TRANSLATE|TODO|FIXME|__PLACEHOLDER__)\b|\[i18n[^\]]*\]/;
const renderedTemplate = /\{\{[^}]+\}\}|\$\{[^}]+\}/;
const missingValue = /(?:^|[>"'\s])(?:undefined|null)(?:$|[<"'\s])/i;
const invisible = /[\u200B-\u200D\u2060\uFEFF]/;
const duplicateGameName = /Clash of Critters\s*[（(]\s*Clash of Critters\s*[）)]/i;
const allowedUpperTokens = /^(?:GA4|UID|URL|HTML|CSS|JSON|JSON-LD|FAQ|API|DB|DNT|SEO|OG|T1|T2|T3|T4|SSS|SS|S|A|B|TOP|X)$/;
const retrySignal = new Int32Array(new SharedArrayBuffer(4));

function readFile(file) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    try { return fs.readFileSync(file, 'utf8'); } catch (error) {
      if (!['EBUSY', 'EPERM'].includes(error.code) || attempt === 11) throw error;
      Atomics.wait(retrySignal, 0, 0, 40 * (attempt + 1));
    }
  }
}

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.name.endsWith('.html') ? [full] : [];
  });
}

function plainText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<!--([\s\S]*?)-->/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|#160);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function report(condition, message) {
  if (!condition) errors.push(message);
}

function validateMeta(html, route, locale) {
  const fields = [
    ['title', html.match(/<title>([\s\S]*?)<\/title>/i)?.[1]],
    ['description', html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1]],
    ['og:title', html.match(/<meta\s+property="og:title"\s+content="([^"]*)"/i)?.[1]],
    ['og:description', html.match(/<meta\s+property="og:description"\s+content="([^"]*)"/i)?.[1]],
    ['twitter:title', html.match(/<meta\s+name="twitter:title"\s+content="([^"]*)"/i)?.[1]],
    ['twitter:description', html.match(/<meta\s+name="twitter:description"\s+content="([^"]*)"/i)?.[1]]
  ];
  for (const [name, value] of fields) {
    if (value === undefined && name.startsWith('twitter:')) continue;
    report(typeof value === 'string' && value.trim(), `${locale} ${route}: ${name} is missing or empty`);
    if (!value) continue;
    report(!placeholder.test(value), `${locale} ${route}: ${name} contains a placeholder`);
    report(!missingValue.test(value), `${locale} ${route}: ${name} contains a missing value`);
    report(!duplicateGameName.test(value), `${locale} ${route}: ${name} repeats the game name`);
  }
}

for (const locale of locales) {
  const directory = path.join(root, locale.directory);
  const files = walk(directory);
  report(files.length === 114, `${locale.key}: expected 114 HTML files, got ${files.length}`);
  for (const file of files) {
    const route = `/${locale.directory}/${path.relative(directory, path.dirname(file)).replaceAll('\\', '/')}`.replace(/\/$/, '') + '/';
    const html = readFile(file);
    const visible = plainText(html);
    validateMeta(html, route, locale.key);
    report(!placeholder.test(html), `${locale.key} ${route}: internal placeholder found`);
    report(!renderedTemplate.test(visible), `${locale.key} ${route}: template marker rendered as visible text`);
    report(!missingValue.test(html), `${locale.key} ${route}: undefined/null marker found`);
    report(!invisible.test(html), `${locale.key} ${route}: invisible Unicode character found`);
    report(!duplicateGameName.test(html), `${locale.key} ${route}: duplicated game name found`);
    report(!/aria-label="\s*"/i.test(html), `${locale.key} ${route}: empty aria-label found`);
    for (const pattern of translationQuality[locale.key].banned) {
      report(!pattern.test(visible), `${locale.key} ${route}: banned machine wording ${pattern}`);
      pattern.lastIndex = 0;
    }
    for (const token of visible.match(/\b[A-Z][A-Z0-9_]{7,}\b/g) || []) {
      if (allowedUpperTokens.test(token) || /^G-[A-Z0-9]+$/.test(token)) continue;
      report(!/^MNSB|PLACEHOLDER|BRANDX/.test(token), `${locale.key} ${route}: suspicious internal token ${token}`);
    }
  }

  const dictionary = readFile(path.join(root, `data/i18n/${locale.key}.json`));
  const runtime = readFile(path.join(root, `i18n/${locale.directory}-runtime.js`));
  report(!placeholder.test(dictionary), `${locale.key}: placeholder remains in translation JSON`);
  report(!placeholder.test(runtime), `${locale.key}: placeholder remains in runtime dictionary`);
  report(!invisible.test(dictionary), `${locale.key}: invisible Unicode remains in translation JSON`);
  report(!invisible.test(runtime), `${locale.key}: invisible Unicode remains in runtime dictionary`);
}

if (errors.length) {
  console.error(`translation quality validation failed (${errors.length})`);
  errors.slice(0, 150).forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log('translation quality validation passed: 114 English and 114 Simplified Chinese pages scanned with no placeholders or banned machine wording.');
