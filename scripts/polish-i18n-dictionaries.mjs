import fs from 'node:fs';
import path from 'node:path';
import { polishTranslation } from './i18n-quality.mjs';

const root = path.resolve(import.meta.dirname, '..');
const i18nDirectory = path.join(root, 'data', 'i18n');
const glossary = JSON.parse(fs.readFileSync(path.join(i18nDirectory, 'glossary.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(i18nDirectory, 'overrides.json'), 'utf8'));
const qualityOverrides = JSON.parse(fs.readFileSync(path.join(i18nDirectory, 'quality-overrides.json'), 'utf8'));
const phase3Overrides = JSON.parse(fs.readFileSync(path.join(i18nDirectory, 'phase3.json'), 'utf8'));

for (const locale of ['en', 'zh-CN']) {
  const file = path.join(i18nDirectory, `${locale}.json`);
  const dictionary = JSON.parse(fs.readFileSync(file, 'utf8'));
  const preferred = { ...overrides[locale], ...qualityOverrides[locale], ...phase3Overrides[locale] };
  for (const term of glossary.terms) preferred[term.ja] = term[locale];
  for (const [source, translation] of Object.entries(dictionary)) {
    dictionary[source] = polishTranslation(preferred[source] || translation, locale, source);
  }
  const sorted = Object.fromEntries(Object.entries(dictionary).sort(([left], [right]) => left.localeCompare(right, 'ja')));
  fs.writeFileSync(file, `${JSON.stringify(sorted, null, 2)}\n`);
  console.log(`${locale}: polished ${Object.keys(sorted).length} translation entries`);
}
