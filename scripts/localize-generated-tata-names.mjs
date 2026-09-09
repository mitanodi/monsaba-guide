import fs from 'node:fs';
import path from 'node:path';
import { createTataHtmlLocalizer } from './lib/localize-tata-html.mjs';

const root = path.resolve(import.meta.dirname, '..');
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data/tatari.json'), 'utf8'));
const localize = createTataHtmlLocalizer(tatari);
const familyById=new Map(tatari.families.map(family=>[family.id,family]));
const displayName=(form,locale)=>locale==='en'?form.nameEn:form.nameZhHans;
const fixDuplicateFormNames=(html,file,locale)=>{
  const normalized=file.replaceAll('\\','/');const match=normalized.match(/\/(?:en|zh-cn)\/tata\/([^/]+)\/index\.html$/);const family=match&&familyById.get(match[1]);
  if(!family) return html;
  const lastByJapanese=new Map(family.evolutions.map(form=>[form.name,form]));
  const fallbackChain=family.evolutions.map(form=>displayName(lastByJapanese.get(form.name),locale)).join(' → ');
  const correctChain=family.evolutions.map(form=>displayName(form,locale)).join(' → ');
  let result=html.replaceAll(fallbackChain,correctChain).replaceAll(fallbackChain.replaceAll(' ',''),correctChain.replaceAll(' ',''));
  for(const form of family.evolutions){
    const wrong=displayName(lastByJapanese.get(form.name),locale);const correct=displayName(form,locale);
    if(wrong===correct) continue;
    result=result.replaceAll(`T${form.stage}</small><strong>${wrong}</strong>`,`T${form.stage}</small><strong>${correct}</strong>`).replaceAll(`T${form.stage} ${wrong}`,`T${form.stage} ${correct}`).replaceAll(`T${form.stage}：${wrong}`,`T${form.stage}：${correct}`).replaceAll(`Evolution ${form.stage}: ${wrong}`,`Evolution ${form.stage}: ${correct}`).replaceAll(`第${form.stage}次演进：${wrong}`,`第${form.stage}次演进：${correct}`);
  }
  return result;
};
let count = 0;

for (const [directory, locale] of [['en', 'en'], ['zh-cn', 'zh-CN']]) {
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) {
        const source = fs.readFileSync(full, 'utf8');
        const output = fixDuplicateFormNames(localize(source, locale),full,locale);
        if (output !== source) fs.writeFileSync(full, output);
        count += 1;
      }
    }
  };
  walk(path.join(root, directory));
}

console.log(`Localized official Tata names across ${count} EN / zh-CN HTML files.`);
