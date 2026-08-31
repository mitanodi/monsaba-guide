import fs from 'node:fs';
import path from 'node:path';
import { createTataHtmlLocalizer } from './lib/localize-tata-html.mjs';

const root = path.resolve(import.meta.dirname, '..');
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data/tatari.json'), 'utf8'));
const localize = createTataHtmlLocalizer(tatari);
let count = 0;

for (const [directory, locale] of [['en', 'en'], ['zh-cn', 'zh-CN']]) {
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        const source = fs.readFileSync(full, 'utf8');
        const output = localize(source, locale);
        if (output !== source) fs.writeFileSync(full, output);
        count += 1;
      }
    }
  };
  walk(path.join(root, directory));
}

console.log(`Localized official Tata names across ${count} EN / zh-CN HTML files.`);
