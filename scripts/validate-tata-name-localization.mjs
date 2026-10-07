import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import '../family-display.js';

const root = path.resolve(import.meta.dirname, '..');
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data/tatari.json'), 'utf8'));
const { getFamilyDisplayLabel, getTataDisplayName, getEvolutionChain } = globalThis.MONSABA_FAMILY;
const errors = [];
const normalizeChain = (value) => String(value).replace(/\s*→\s*/g, '→');
const forms = tatari.families.flatMap((family) => family.evolutions.map((evolution) => ({ family, evolution })));
const japaneseNamesFor = (locale) => [...new Set(forms
  .filter(({ evolution }) => evolution.nameVerification?.[locale] !== 'pending')
  .map(({ evolution }) => evolution.name))].sort((a, b) => b.length - a.length);

// Imported source statements retain their complete original labels. Only
// explicitly marked Japanese source blocks are exempt; primary names and UI
// outside those blocks remain subject to the original check.
const stripAllowedJapanese = (html) => {
  const $ = load(html);
  $('[lang="ja"][translate="no"]').remove();
  return $.html()
  .replace(/<([a-z][\w:-]*)\b[^>]*class="[^"]*(?:localized-original-name|tata-i18n-names)[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, '')
  .replace(/"alternateName"\s*:\s*\[[\s\S]*?\]/gi, '')
  .replace(/<(?:script|style)\b[\s\S]*?<\/(?:script|style)>/gi, '');
};

for (const { family, evolution } of forms) {
  for (const locale of ['en', 'zh-CN']) {
    const name = getTataDisplayName(evolution, locale);
    if ((!name || name === evolution.name) && evolution.nameVerification?.[locale] !== 'pending') errors.push(`${family.id}:T${evolution.stage}:${locale}: official primary name fallback`);
  }
}

for (const family of tatari.families) {
  for (const [locale, directory, secondaryPrefix] of [['en', 'en', 'Japanese: '], ['zh-CN', 'zh-cn', '日文名：']]) {
    const file = path.join(root, directory, 'tata', family.id, 'index.html');
    const html = fs.readFileSync(file, 'utf8');
    const label = getFamilyDisplayLabel(family, locale);
    const chain = getEvolutionChain(family, locale);
    if (!html.includes(`<h1>${label}</h1>`)) errors.push(`${family.id}:${locale}: localized H1 missing`);
    if (!html.match(new RegExp(`<title>[^<]*${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`))) errors.push(`${family.id}:${locale}: localized title missing`);
    if (!normalizeChain(html).includes(normalizeChain(chain))) errors.push(`${family.id}:${locale}: localized evolution chain missing`);
    for (const evolution of family.evolutions) {
      if (!html.includes(`<strong>${getTataDisplayName(evolution, locale)}</strong>`)) errors.push(`${family.id}:T${evolution.stage}:${locale}: localized evolution card missing`);
      if (!html.includes(`${secondaryPrefix}${evolution.name}`)) errors.push(`${family.id}:T${evolution.stage}:${locale}: Japanese secondary name missing`);
    }
  }
}

for (const [locale, directory] of [['en', 'en'], ['zh-CN', 'zh-cn']]) {
  const files = [];
  const walk = (directoryPath) => {
    for (const entry of fs.readdirSync(directoryPath, { withFileTypes: true })) {
      const full = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) files.push(full);
    }
  };
  walk(path.join(root, directory));
  for (const file of files) {
    const primary = stripAllowedJapanese(fs.readFileSync(file, 'utf8'));
    const remaining = japaneseNamesFor(locale).filter((name) => primary.includes(name));
    if (remaining.length) errors.push(`${path.relative(root, file)}: unintended Japanese Tata primary names: ${remaining.slice(0, 5).join(', ')}`);
  }
}

for (const file of ['search/search.js', 'compare/compare.js', 'consult/consult.js', 'team-builder/team-builder.js', 'my-monsaba/my-monsaba.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('getTataDisplayName') && !source.includes('getEvolutionChain')) errors.push(`${file}: shared localized Tata resolver is not used`);
}

if (errors.length) {
  console.error(`Tata primary-name localization failed (${errors.length})\n${errors.join('\n')}`);
  process.exit(1);
}

console.log(`Tata primary-name localization passed: ${tatari.families.length} families / ${forms.length} forms / unintended fallback 0 / explicit pending names ${forms.reduce((sum, { evolution }) => sum + Object.values(evolution.nameVerification || {}).filter(status => status === "pending").length, 0)}`);
