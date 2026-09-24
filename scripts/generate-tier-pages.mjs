import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';
import { MODES, legacyRatings } from '../lib/tata-tier.mjs';
import { renderTierBoard, esc } from './lib/tier-board.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const json=file=>JSON.parse(read(file));
const write=(file,value)=>{if(!fs.existsSync(path.join(root,file))||read(file)!==value){if(process.argv.includes('--check'))throw new Error(`Regenerate stale Tier output: ${file}`);fs.writeFileSync(path.join(root,file),value);}};
const assetVersion=json('data/asset-build.json').version;
const ninjaAdMaxTier=`<aside class="wrap ninja-admax-slot" data-admax-slot="MONSABA_TIER" aria-label="広告"><span class="ninja-admax-label">広告</span><script>(function(){var tag=window.matchMedia('(max-width: 820px)').matches?'https://adm.shinobi.jp/s/27d44b57ec346ee2bce4628d6574f79b':'https://adm.shinobi.jp/s/1a63f0edf4570c706857b356204f1a61';document.write('<scr'+'ipt src="'+tag+'"></scr'+'ipt>');}());</script></aside>`;
const ninjaAdMaxTata=`<aside class="wrap ninja-admax-slot" data-admax-slot="MONSABA_TATA" data-admax-position="MID" aria-label="広告"><span class="ninja-admax-label">広告</span><script>(function(){var tag=window.matchMedia('(max-width: 820px)').matches?'https://adm.shinobi.jp/s/dfb46622bdef6255102d47782ae5475a':'https://adm.shinobi.jp/s/ed3e55b49454e200992898abbe7bb903';document.write('<scr'+'ipt src="'+tag+'"></scr'+'ipt>');}());</script></aside>`;
const ninjaAdMaxTataContent=(familyId,position)=>{const tags={TOP:{pc:'35f048413141014f4de639f6587f7d7e',sp:'16ba3b25ba46308a360f7d2e14b3721c'},BOTTOM:{pc:'a29aa98a252af3196ac97a024e430430',sp:'0dfce2d7520a570ab34d238ddf655603'}}[position];return `<aside class="wrap ninja-admax-slot ninja-admax-expansion" data-admax-slot="TATA_${position}_${familyId.toUpperCase()}" data-admax-position="${position}" data-admax-placement="2026-09-all-content" aria-label="広告"><span class="ninja-admax-label">広告</span><script>(function(){var tag=window.matchMedia('(max-width: 820px)').matches?'https://adm.shinobi.jp/s/${tags.sp}':'https://adm.shinobi.jp/s/${tags.pc}';document.write('<scr'+'ipt src="'+tag+'"></scr'+'ipt>');}());</script></aside>`;};
const imobileSlot=slot=>`<aside class="wrap imobile-ad-slot" aria-label="広告"><span class="imobile-ad-label">広告</span><script src="/imobile-ads.js?v=${assetVersion}" data-imobile-slot="${slot}"></script></aside>`;
const editorial=json('data/editorial-content.json').families;
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
  const boards=MODES.map((mode,i)=>renderTierBoard({data,families,images,locale,copy,mode,afterDescription:locale==='ja'&&mode==='normal'?imobileSlot('tier'):''})+(ads[i]||'')+(locale==='ja'&&i===MODES.length-1?ninjaAdMaxTier:'')).join('\n');
  const main=`<main id="main-content"><section class="page-hero tier-page-hero astra-compact-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="/${prefix}">${locale==='ja'?'トップ':locale==='en'?'Home':'首页'}</a><span>›</span><span>${esc(copy.labels[0])} Tier</span></nav><span class="attribute">${esc(copy.updated)} ${data.updated}</span><h1>${esc(copy.title)}</h1><p>${esc(copy.intro)}</p></div></section>${nav}${byline}<div id="tier-list">${filters}${copy.legend?`<p class="wrap tier-criteria-panel">${esc(copy.legend)}</p>`:''}${boards}</div></main>`;
  html=html.replace(/<main\b[^>]*>[\s\S]*?<\/main>/,main);
  html=patchHtml(html,[['title',()=>`<title>${esc(copy.title)}</title>`],['meta[name="description"]',()=>`<meta name="description" content="${esc(copy.intro)}">`],['script[type="application/ld+json"]',el=>{
    const structured=JSON.parse(el.text());
    for(const node of structured['@graph']||[structured])if(node['@type']==='Article'){node.name=copy.title;node.headline=copy.title;node.description=copy.intro;node.dateModified=data.updated;}
    return `<script type="application/ld+json">${JSON.stringify(structured).replaceAll('<','\\u003c')}</script>`;
  }]]);
  html=html.replace(/<link[^>]+href="\/(?:astra(?:-tier)?\.css|tata-tier\/tier-boards\.css|imobile-ads\.css)[^>]*>/g,'')
    .replace(/(<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"[^>]*data-monsaba-ga4="loader")(?: type="[^"]*")?>/g,'$1 type="text/plain">')
    .replace('</head>',`<link rel="stylesheet" href="/astra.css?v=${assetVersion}"><link rel="stylesheet" href="/astra-tier.css?v=${assetVersion}"><link rel="stylesheet" href="/tata-tier/tier-boards.css?v=${assetVersion}">${locale==='ja'?'<link rel="stylesheet" href="/imobile-ads.css?v='+assetVersion+'">':''}</head>`);
  html=html.replace(/(src="\/tata-tier\/tata-tier\.js)(?:\?[^\"]*)?"/g,`$1?v=${assetVersion}"`);
  if(locale!=='ja'&&!html.includes(`/i18n/${prefix.slice(0,-1)}-runtime.js?v=${assetVersion}`)){
    html=html.replace('</body>',`<script src="/i18n/${prefix.slice(0,-1)}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script></body>`);
  }
  write(file,html);

  // Existing detail pages retain their content, SEO, images, ads and layout.
  for(const entry of data.families) {
    const detail=`${prefix}tata/${entry.slug}/index.html`;
    const label=ranking=>ranking.tier==='HOLD'?copy.hold:ranking.tier;
    const summary=MODES.map((mode,i)=>`${copy.labels[i]} ${label(entry.rankings[mode])}${entry.rankings[mode].status==='provisional'?' ※':''}`).join(' / ');
    let source=patchHtml(read(detail),[['.ninja-admax-slot',()=> ''],['.imobile-ad-slot',()=> '']]);
    source=source.replace(/<link[^>]+href="\/imobile-ads\.css[^>]*>/g,'');
    if(!load(source)('.mode-rating-grid').length) source=patchHtml(source,[['.quick-purpose-label + h2 + p',()=>'<div class="mode-rating-grid"></div>']]);
    source=patchHtml(source,[
      ['.mode-rating-grid',()=>`<div class="mode-rating-grid">${MODES.map((mode,i)=>`<div data-ranking-mode="${mode}" data-status="${entry.rankings[mode].status}"><span>${esc(copy.labels[i])}</span><b>${esc(label(entry.rankings[mode]))}</b>${entry.rankings[mode].status==='provisional'?`<small>${esc(copy.provisional)}</small>`:''}</div>`).join('')}</div>`],
      ['.tata-hero-meta > span:first-child > b',()=>`<b>${entry.rankings.overall.tier}</b>`],
      ['.tata-quick-answers > h2:first-of-type + p',()=>`<p data-tier-summary>${esc(summary)}</p>`]
    ]);
    if (['riifuro','sabooru','tsubutsumuri'].includes(entry.familyId)) {
      source=patchHtml(source,[['.rating-hold-note',()=> ''],['.source-note > p:first-of-type', (el,$)=>$.html(el)
        .replace('Tierは当サイト独自の暫定評価です。','Tierは当サイト独自の評価です。')
        .replace('Tier is a provisional evaluation unique to this site.','Tier is an independent assessment by this site.')
        .replace('等级是本网站特有的临时评估。','强度为本站独立评价。')]]);
    }
    // Update any earlier compact evaluation table using its existing labels.
    source=patchHtml(source,[['.related-tata-grid article', (el,$)=>{
      const id=el.find('a[href*="/tata/"]').first().attr('href')?.split('/').filter(Boolean).at(-1);
      const rating=data.families.find(f=>f.familyId===id)?.rankings.overall.tier;
      const translated=editorial[entry.familyId]?.related.find(r=>r.familyId===id)?.localizedText?.[locale];
      if(translated)el.find('p').text(translated);
      return rating?$.html(el).replace(/(総合|Overall\s*|综合)(SSS|SS|S|A|B|C|D)(評価|\s*rating)?/gi,`$1${rating}$3`):$.html(el);
    }]]);
    if(locale==='ja'){
      // Detail articles around 5,000 visible characters have a natural source
      // note at the end; shorter pages retain just TOP + existing MID.
      const longDetail=load(source).text().replace(/\s+/g,' ').length>=5000;
      source=patchHtml(source,[
        ['.tata-quick-answers',(el,$)=>`${$.html(el)}${ninjaAdMaxTataContent(entry.familyId,'TOP')}`],
        ['section:has(> h2:contains("スキル一覧"))',(el,$)=>`${$.html(el)}${ninjaAdMaxTata}`],
        ...(longDetail?[['.source-note',(el,$)=>`${$.html(el)}${ninjaAdMaxTataContent(entry.familyId,'BOTTOM')}`]]:[])
      ]);
      if(entry.familyId==='gaoden'&&locale==='ja'){
        source=patchHtml(source,[['section:has(> h2:contains("進化すると何が変わる？"))',(el,$)=>`${$.html(el)}${imobileSlot('gaoden')}`]]);
        source=source.replace('</head>','<link rel="stylesheet" href="/imobile-ads.css?v='+assetVersion+'"></head>');
      }
    }
    write(detail,source);
  }
  // Keep the existing beginner card layout and copy, synchronizing its ratings
  // and adding the operator-selected families through the same source data.
  const beginnerFile=`${prefix}beginner-guide/index.html`;
  const beginner=load(read(beginnerFile));
  const existing=new Map(beginner('[data-beginner-family]').toArray().map(el=>[beginner(el).attr('data-beginner-family'),beginner.html(el)]));
  const beginnerCopy={
    ja:['初心者評価','育成目標：','個別ページで進化差分を確認','手持ち登録状況を確認中','詳細を見る','手持ちに登録','編成で使う'],
    en:['Beginner rating','Upgrade goal:','Check evolution differences on the detail page','Checking your roster','See details','Add to Roster','Use in Team Builder'],
    'zh-CN':['新手评价','养成目标：','在详情页查看进化差异','正在确认持有状态','查看详情','加入持有阵容','用于阵容编辑器']
  }[locale];
  const beginnerEntries=data.families.filter(e=>data.beginnerGuideFamilies.includes(e.familyId))
    .sort((a,b)=>['SSS','SS','S','A','B','C','D','HOLD'].indexOf(a.rankings.beginner.tier)-['SSS','SS','S','A','B','C','D','HOLD'].indexOf(b.rankings.beginner.tier)||a.familyId.localeCompare(b.familyId));
  const cards=beginnerEntries.map(entry=>{
    const f=families.find(f=>f.id===entry.familyId),image=images.find(i=>i.familyId===f.id).stage1;
    const name=globalThis.MONSABA_FAMILY.getFamilyDisplayLabel(f,locale);
    const modes=['overall',...['normal','zombie'].filter(m=>['SSS','SS'].includes(entry.rankings[m].tier)),existing.has(f.id)&&load(existing.get(f.id))('article').attr('data-beginner-modes')?.split(' ').includes('evolution')?'evolution':''].filter(Boolean).join(' ');
    const meta=`${copy.attributes[f.attribute]} · ${beginnerCopy[0]} ${entry.rankings.beginner.tier}`;
    if(existing.has(f.id)) {
      const card=load(existing.get(f.id),{},false);
      card('article').attr('data-beginner-modes',modes);
      card('.beginner-card-meta').text(meta);
      return card.html();
    }
    return `<article class="guide-panel beginner-tata-card" data-beginner-modes="${modes}" data-beginner-family="${f.id}"><img class="beginner-tata-image" src="${esc(image.src)}" width="256" height="256" alt="${esc(name)} T1" loading="lazy" decoding="async"><div><p class="beginner-card-meta">${esc(meta)}</p><h3><a href="/${prefix}tata/${f.id}/">${esc(name)}</a></h3><p></p><p><b>${beginnerCopy[1]}</b>${beginnerCopy[2]}</p><p class="beginner-owned-status" aria-live="polite">${beginnerCopy[3]}</p><div class="tool-actions"><a class="ghost-button" href="/${prefix}tata/${f.id}/">${beginnerCopy[4]}</a><a class="ghost-button" href="/${prefix}my-monsaba/">${beginnerCopy[5]}</a><a class="ghost-button" href="/${prefix}team-builder/?roster=1" data-beginner-team="">${beginnerCopy[6]}</a></div></div></article>`;
  }).join('');
  write(beginnerFile,patchHtml(read(beginnerFile),[['#training .beginner-card-grid',()=>`<div class="beginner-card-grid">${cards}</div>`]]));
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
