import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outputDir = path.join(root, 'data', 'i18n');
const targets = Object.freeze({ en: 'en', 'zh-CN': 'zh-CN' });
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/;
const invalidMarker = /[\[【［]\d{4}[\]】］]|MNSB(?:PN|DB|GAME)/;
const ignoredDirectories = new Set(['.git', '.vercel', 'node_modules', 'promo', 'en', 'zh-cn', 'i18n']);

function walk(directory, extensions) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) return walk(full, extensions);
    return extensions.has(path.extname(entry.name)) ? [full] : [];
  });
}

function normalize(value) {
  return String(value).replace(/\s+/g, ' ').trim();
}

function collectProtectedTerms() {
  const values = new Set();
  const visit = (value, key = '') => {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, key));
    if (!value || typeof value !== 'object') {
      if (typeof value === 'string' && /(?:name|familyName|skillName)$/i.test(key) && japanese.test(value)) values.add(value);
      return;
    }
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  };
  for (const relative of ['data/tatari.json', 'data/tata-skills.json', 'data/zombie-rush/seasons/season-1.json']) {
    visit(JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')));
  }
  return [...values].filter((value) => value.length > 1).sort((a, b) => b.length - a.length);
}

function collectStrings() {
  const strings = new Set();
  const add = (value) => {
    const text = normalize(value);
    if (text && japanese.test(text) && text.length <= 1200) strings.add(text);
  };
  for (const file of walk(root, new Set(['.html']))) {
    let html = fs.readFileSync(file, 'utf8');
    for (const block of html.matchAll(/<script\b[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
      try {
        const visit = (value) => {
          if (typeof value === 'string') add(value);
          else if (Array.isArray(value)) value.forEach(visit);
          else if (value && typeof value === 'object') Object.values(value).forEach(visit);
        };
        visit(JSON.parse(block[1]));
      } catch { /* Existing validators report malformed JSON-LD. */ }
    }
    html = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
    for (const match of html.matchAll(/>([^<>]+)</g)) add(match[1]);
    for (const match of html.matchAll(/\b(?:alt|title|placeholder|aria-label|content)="([^"]+)"/g)) add(match[1]);
  }
  for (const file of walk(root, new Set(['.js'])).filter((file) => !file.includes(`${path.sep}scripts${path.sep}`) && !file.includes(`${path.sep}tests${path.sep}`))) {
    const source = fs.readFileSync(file, 'utf8');
    for (const pattern of [/'((?:\\.|[^'\\])*)'/g, /"((?:\\.|[^"\\])*)"/g, /`((?:\\.|[^`\\])*)`/g]) {
      for (const match of source.matchAll(pattern)) {
        const value = match[1];
        if (!/[{};$]|=>|\b(?:const|let|var|function)\b/.test(value)) add(value);
      }
    }
  }
  return [...strings].sort((a, b) => a.localeCompare(b, 'ja'));
}

function decodeHtml(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/&#(\d+);/g, (_, number) => String.fromCodePoint(Number(number)))
    .replace(/&#x([0-9a-f]+);/gi, (_, number) => String.fromCodePoint(Number.parseInt(number, 16)))
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

const protectedTerms = collectProtectedTerms();
const protectedByToken = new Map(protectedTerms.map((term, index) => [`MNSBPN${String(index).padStart(4, '0')}X`, term]));
function protect(value) {
  let result = value.replaceAll('モンサバ攻略DB', 'MNSBDBBRANDX').replaceAll('モンスターサバイバル', 'MNSBGAMETITLEX').replaceAll('モンサバ', 'MNSBGAMESHORTX');
  for (const [token, term] of protectedByToken) result = result.replaceAll(term, token);
  return result;
}
function restore(value, locale) {
  let result = value
    .replaceAll('MNSBDBBRANDX', locale === 'en' ? 'Clash of Critters Guide DB' : 'Clash of Critters 攻略数据库')
    .replaceAll('MNSBGAMETITLEX', 'Clash of Critters')
    .replaceAll('MNSBGAMESHORTX', 'Clash of Critters');
  for (const [token, term] of protectedByToken) result = result.replaceAll(token, term);
  return normalize(result);
}

async function fetchTranslation(lines, locale) {
  const query = lines.map((line, index) => `[${String(index).padStart(4, '0')}] ${protect(line)}`).join('\n');
  const url = new URL('https://translate.google.com/m');
  url.searchParams.set('sl', 'ja');
  url.searchParams.set('tl', targets[locale]);
  url.searchParams.set('q', query);
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; MonsabaI18nBootstrap/1.0)' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const html = await response.text();
      const body = decodeHtml(html.match(/class="result-container">([\s\S]*?)<\/div>/)?.[1] || '');
      const translated = new Array(lines.length);
      for (const match of body.matchAll(/\[(\d{4})\]\s*([\s\S]*?)(?=\s*\[\d{4}\]\s|$)/g)) translated[Number(match[1])] = restore(match[2], locale);
      if (lines.length === 1 && !translated[0] && body) translated[0] = restore(body.replace(/^\[0000\]\s*/, ''), locale);
      if (translated.every((value) => value && !invalidMarker.test(value))) return translated;
      throw new Error(`marker mismatch (${translated.filter(Boolean).length}/${lines.length})`);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
    }
  }
  if (lines.length > 1) {
    const repaired = [];
    for (const line of lines) repaired.push((await fetchTranslation([line], locale))[0]);
    return repaired;
  }
  throw lastError;
}

function batchesOf(strings) {
  const batches = [];
  let current = [];
  let length = 0;
  for (const string of strings) {
    const protectedLength = protect(string).length + 12;
    if (current.length && length + protectedLength > 2600) {
      batches.push(current);
      current = [];
      length = 0;
    }
    current.push(string);
    length += protectedLength;
  }
  if (current.length) batches.push(current);
  return batches;
}

fs.mkdirSync(outputDir, { recursive: true });
const sourceStrings = collectStrings();
console.log(`Collected ${sourceStrings.length} Japanese UI/content strings.`);
for (const locale of Object.keys(targets)) {
  const file = path.join(outputDir, `${locale}.json`);
  const translations = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  for (const key of Object.keys(translations)) if (!sourceStrings.includes(key)) delete translations[key];
  for (const [key, value] of Object.entries(translations)) if (invalidMarker.test(value)) delete translations[key];
  fs.writeFileSync(file, `${JSON.stringify(Object.fromEntries(Object.entries(translations).sort(([a], [b]) => a.localeCompare(b, 'ja'))), null, 2)}\n`);
  const missing = sourceStrings.filter((source) => !translations[source]);
  const batches = batchesOf(missing);
  console.log(`${locale}: ${missing.length} missing strings in ${batches.length} batches.`);
  for (let index = 0; index < batches.length; index += 1) {
    const batch = batches[index];
    const values = await fetchTranslation(batch, locale);
    batch.forEach((source, item) => { translations[source] = values[item]; });
    fs.writeFileSync(file, `${JSON.stringify(Object.fromEntries(Object.entries(translations).sort(([a], [b]) => a.localeCompare(b, 'ja'))), null, 2)}\n`);
    console.log(`${locale}: batch ${index + 1}/${batches.length}`);
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
}
