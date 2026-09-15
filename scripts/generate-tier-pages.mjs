import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { MODES, legacyRatings } from '../lib/tata-tier.mjs';
import { renderTierBoard, esc } from './lib/tier-board.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const write=(file,value)=>{if(!fs.existsSync(path.join(root,file))||read(file)!==value){if(process.argv.includes('--check'))throw new Error(`Regenerate stale Tier output: ${file}`);fs.writeFileSync(path.join(root,file),value);}};
const data=json('data/tata-tier.json'), families=json('data/tatari.json').families, images=json('data/tata-images.json').families, translations=json('data/i18n/tata-tier.json');
write('data/tier-ratings.json',JSON.stringify(legacyRatings(data),null,2)+'\n');

// Replace only selected source ranges, keeping unrelated markup and tracking intact.
function patchHtml(html, edits) {
  const $=load(html,{sourceCodeLocationInfo:true});
  const changes=[];
  for(const [selector,render] of edits) $(selector).each((i,el)=>{
    const location=el.sourceCodeLocation;
    if(location)changes.push({start:location.startOffset,end:location.endOffset,value:render($(el),$,i)});
  });
  changes.sort((a,b)=>b.start-a.start);
  for(const c of changes)html=html.slice(0,c.start)+c.value+html.slice(c.end);
  return html;
}

for(const [locale,prefix] of [['ja',''],['en','en/'],['zh-CN','zh-cn/']]) {
  const copy=translations[locale], file=`${prefix}tata-tier/index.html`;
  let html=read(file), $=load(html);
  const ads=$('main .astra-ad').toArray().map(el=>$.html(el));
  const byline=$('.article-byline').first().toString();
  const nav=`<nav id="tier-navigation" class="wrap tier-mode-nav" aria-label="${esc(copy.title)}">${MODES.map((mode,i)=>`<a href="#mode-${mode}">${esc(copy.labels[i])}</a>`).join('')}</nav>`;
  const filters=`<div class="wrap tier-filter" role="group" aria-label="${esc(copy.filter)}"><span>${esc(copy.filter)}</span>${[['all',copy.all],...Object.entries(copy.attributes)].map(([attr,label],i)=>`<button type="button" class="filter${i===0?' is-active':''}" data-tier-attribute="${attr}" aria-pressed="${i===0}">${esc(label)}</button>`).join('')}</div>`;
  const main=`<main id="main-content"><section class="page-hero tier-page-hero astra-compact-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/${prefix}">${locale==='ja'?'トップ':locale==='en'?'Home':'首页'}</a><span>›</span><span>${esc(copy.labels[0])} Tier</span></nav><span class="attribute">${esc(copy.updated)} ${data.updated}</span><h1>${esc(copy.title)}</h1><p>${esc(copy.intro)}</p></div></section>${nav}${byline}<div id="tier-list">${filters}<p class="wrap tier-criteria-panel">${esc(copy.legend)}</p>${MODES.map((mode,i)=>renderTierBoard({data,families,images,locale,copy,mode})+(ads[i]||'')).join('\n')}</div></main>`;
  html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,main);
  html=patchHtml(html,[['title',()=>`<title>${esc(copy.title)}</title>`],['meta[name="description"]',()=>`<meta name="description" content="${esc(copy.intro)}">`],['script[type="application/ld+json"]',el=>{
    const structured=JSON.parse(el.text());
    for(const node of structured['@graph']||[structured])if(node['@type']==='Article'){node.name=copy.title;node.headline=copy.title;node.description=copy.intro;node.dateModified=data.updated;}
    return `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script>`;
  }]]);
  html=html.replace(/<link[^>]+href="\/tata-tier\/tier-boards\.css[^>]*>/g,'').replace('</head>','<link rel="stylesheet" href="/tata-tier/tier-boards.css?v=20260916"></head>');
  html=html.replace(/(src="\/tata-tier\/tata-tier\.js)(?:\?[^\"]*)?"/g,'$1?v=20260916"');
  write(file,html);

  // Existing detail pages retain their content, SEO, images, ads and layout.
  for(const entry of data.families) {
    const detail=`${prefix}tata/${entry.slug}/index.html`;
    const label=ranking=>ranking.tier==='HOLD'?copy.hold:ranking.tier;
    const summary=MODES.map((mode,i)=>`${copy.labels[i]} ${label(entry.rankings[mode])}${entry.rankings[mode].status==='provisional'?' ※':''}`).join(' / ');
    let source=read(detail);
    if(!load(source)('.mode-rating-grid').length) source=patchHtml(source,[['.quick-purpose-label + h2 + p',()=>'<div class="mode-rating-grid"></div>']]);
    source=patchHtml(source,[
      ['.mode-rating-grid',()=>`<div class="mode-rating-grid">${MODES.map((mode,i)=>`<div data-ranking-mode="${mode}" data-status="${entry.rankings[mode].status}"><span>${esc(copy.labels[i])}</span><b>${esc(label(entry.rankings[mode]))}</b>${entry.rankings[mode].status==='provisional'?`<small>${esc(copy.provisional)}</small>`:''}</div>`).join('')}</div>`],
      ['.tata-hero-meta > span:first-child > b',()=>`<b>${entry.rankings.overall.tier}</b>`],
      ['.tata-quick-answers > h2:first-of-type + p',()=>`<p data-tier-summary>${esc(summary)}</p>`]
    ]);
    // Update any earlier compact evaluation table using its existing labels.
    source=patchHtml(source,[['.related-tata-grid article', (el,$)=>{
      const id=el.find('a[href*="/tata/"]').first().attr('href')?.split('/').filter(Boolean).at(-1);
      const rating=data.families.find(f=>f.familyId===id)?.rankings.overall.tier;
      return rating?$.html(el).replace(/(総合|Overall\s*|综合)(SSS|SS|S|A|B|C|D)(評価|\s*rating)?/g,`$1${rating}$3`):$.html(el);
    }]]);
    write(detail,source);
  }
  // Compact cards already used by the home page and evolution guide read the
  // same ratings; only their rating badges are changed here.
  for(const route of ['index.html','evolution-priority/index.html']) {
    const file=prefix+route;
    let source=patchHtml(read(file),[['.tier-badge',(el,$)=>{
      const card=el.closest('[data-family],[data-family-id],.priority-tata-card');
      const id=card.attr('data-family')||card.attr('data-family-id')||card.find('a[href*="/tata/"]').attr('href')?.split('/').filter(Boolean).at(-1);
      const entry=data.families.find(f=>f.familyId===id);
      if(!entry)return $.html(el);
      const text=el.text();
      const mode=/ゾンビ|Zombie|僵尸/.test(text)?'zombie':/総合|Overall|综合/.test(text)||el.is('[class*="rank-"]')?'overall':null;
      if(!mode)return $.html(el);
      const value=entry.rankings[mode].tier==='HOLD'?copy.hold:entry.rankings[mode].tier;
      el.text(text.replace(/HOLD|SSS|SS|S|A|B|C|D|評価保留|保留|Unrated|Pending|待定/g,value));
      if(el.is('[class*="rank-"]'))el.attr('class',el.attr('class').replace(/rank-\w+/g,`rank-${entry.rankings[mode].tier.toLowerCase()}`));
      return $.html(el);
    }]]);
    source=patchHtml(source,[['.catalog-card',(el,$)=>{
      const entry=data.families.find(f=>f.familyId===el.attr('data-family'));
      if(entry)el.attr('data-tier',entry.rankings.overall.tier);
      return $.html(el);
    }]]);
    write(file,source);
  }
}
console.log('Generated independent Tier boards: 65 families × 5 modes × 3 locales; detail ratings synchronized.');
