import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';
import { validateTataNameSources } from './lib/validate-tata-name-sources.mjs';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const json = (file) => JSON.parse(read(file));

const source = json('data/tata-name-i18n-sources.json');
const tatari = json('data/tatari.json');
const skills = json('data/tata-skills.json');
const generatedHtml = new Map();
for (const family of tatari.families || []) {
  generatedHtml.set(`ja:${family.id}`, read(`tata/${family.id}/index.html`));
  generatedHtml.set(`en:${family.id}`, read(`en/tata/${family.id}/index.html`));
  generatedHtml.set(`zh-CN:${family.id}`, read(`zh-cn/tata/${family.id}/index.html`));
}

const { errors, stats } = validateTataNameSources({ source, tatari, skills, generatedHtml });
const aliases = globalThis.MONSABA_FAMILY;
for (const family of tatari.families || []) {
  const familyAliases = aliases.getFamilySearchAliases(family);
  for (const evolution of family.evolutions || []) {
    if (!familyAliases.includes(evolution.nameEn)) errors.push(`[Missing Tata search alias]\nfamily=${family.id}\nstage=${evolution.stage}\nlocale=en\nname=${JSON.stringify(evolution.nameEn)}`);
    if (!familyAliases.includes(evolution.nameZhHans)) errors.push(`[Missing Tata search alias]\nfamily=${family.id}\nstage=${evolution.stage}\nlocale=zh-CN\nname=${JSON.stringify(evolution.nameZhHans)}`);
  }
}

const requiredImplementations = [
  ['family-display.js', 'evolution?.nameEn', 'Shared family aliases do not include English official names'],
  ['family-display.js', 'evolution?.nameZhHans', 'Shared family aliases do not include Simplified Chinese official names'],
  ['search/search.js', 'item.nameEn', 'Site search does not match English official names'],
  ['search/search.js', 'item.nameZhHans', 'Site search does not match Simplified Chinese official names'],
  ['consult/consult.js', 'stage.nameEn', 'Consult does not resolve English official names'],
  ['consult/consult.js', 'stage.nameZhHans', 'Consult does not resolve Simplified Chinese official names']
];
for (const [file, needle, message] of requiredImplementations) {
  if (!read(file).includes(needle)) errors.push(`[Missing Tata name integration]\nfile=${file}\nrequirement=${JSON.stringify(message)}`);
}

if (errors.length) {
  console.error(`Tata name source validation failed (${errors.length})\n\n${errors.join('\n\n')}`);
  process.exit(1);
}

console.log(`Tata name source validation passed: ${stats.formsChecked} forms / EN ${stats.enSourceCoverage}/${stats.formsChecked} / zh-CN ${stats.zhCnSourceCoverage}/${stats.formsChecked} / needs-review 0`);
