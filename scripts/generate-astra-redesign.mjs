import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {load} from 'cheerio';
import {astraCopy} from './astra-copy.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),s);};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
const data=JSON.parse(read('data/tatari.json'));const count=data.families.length;
const imageMap=new Map(JSON.parse(read('data/tata-images.json')).families.map(f=>[f.stage1?.src,f]));
const offers=new Map(JSON.parse(read('data/affiliate-offers.json')).offers.map(o=>[o.id,o]));
// Long articles may carry up to five clearly-labelled slots. Short and utility pages stay sparse.
const adPlans={
  '/':[{offer:'warau_003',after:'.astra-journey'}],
  '/beginner-guide/':[
    {offer:'warau_003',after:'#normal'},{offer:'ipsos_isay_001',after:'#training'},
    {offer:'point_income_003',after:'#t3'},{offer:'warau_003',after:'#contents'},
    {offer:'ipsos_isay_001',before:'.next-reading'}
  ],
  '/evolution-priority/':[
    {offer:'warau_003',after:'#t3-roadmap'},{offer:'point_income_003',after:'#diagnosis'},
    {offer:'ipsos_isay_001',after:'.static-section:has(h2:contains("T3で大きく化けるタタ"))'},
    {offer:'macromill_002',after:'#transition-list'},{offer:'warau_003',before:'.source-note'}
  ],
  '/tata-tier/':[
    {offer:'warau_003',after:'#mode-overall'},{offer:'point_income_003',after:'#mode-normal'},
    {offer:'altema_point_005',after:'#mode-zombie'},{offer:'ipsos_isay_001',after:'#mode-dojo'}
  ],
  '/zombie-rush/':[
    {offer:'warau_003',after:'#basic'},{offer:'point_income_003',after:'#season-tier'},
    {offer:'ipsos_isay_001',after:'#prediction'},{offer:'altema_point_005',after:'#danger'},
    {offer:'warau_003',after:'#purabi-denjika'}
  ],
  '/normal-guide/':[{offer:'ipsos_isay_001',after:'#normal-bosses'}],
  '/boss-rally/':[{offer:'point_income_003',before:'.next-reading'}]
};
const version=JSON.parse(read('data/asset-build.json')).version;
// Existing canonical SEO remains authoritative. The new calendar is an additional route.
for(const locale of ['ja','en','zh-CN']){
  const p=locale==='ja'?'':locale==='en'?'en/':'zh-cn/', c=astraCopy[locale];
  let template=read(`${p}events/index.html`);
  let head=template.slice(0,template.indexOf('<body')).replace(/<title>[\s\S]*?<\/title>/,`<title>${c.calTitle}</title>`).replace(/(<meta name="description" content=")[^"]*/,`$1${c.calIntro}`).replaceAll('/events/"','/events/calendar/"').replaceAll('/events/#','/events/calendar/#');
  head=head.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/g,'');
  head+=`<script type="application/ld+json">${JSON.stringify({'@context':'https://schema.org','@graph':[{'@type':'WebPage',url:`https://monster-survival.com/${p}events/calendar/`,name:c.calTitle,inLanguage:locale},{'@type':'BreadcrumbList',itemListElement:[{'@type':'ListItem',position:1,name:c.backEvents,item:`https://monster-survival.com/${p}events/`},{'@type':'ListItem',position:2,name:c.calendar,item:`https://monster-survival.com/${p}events/calendar/`}]}]})}</script>`;
  head=head.replace('</head>','');
  const $=load(template);const header=$('.site-header').toString(),footer=$('footer').toString();
  write(`${p}events/calendar/index.html`,`${head}</head><body data-locale="${locale}"><a class="skip-link" href="#main-content">${c.calendar}</a>${header}<main id="main-content"><section class="page-hero"><div class="wrap"><nav class="breadcrumbs"><a href="/${p}events/">${c.backEvents}</a><span>›</span>${c.calendar}</nav><h1>${c.calTitle}</h1><p>${c.calIntro}</p></div></section></main>${footer}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js" defer></script><link rel="stylesheet" href="/calendar/calendar.css"><script type="module" src="/calendar/calendar.js"></script></body></html>`);
}
const ignored=new Set(['.git','.github','.vercel','node_modules','promo','assets','data','scripts','docs']);
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>ignored.has(e.name)?[]:e.isDirectory()?walk(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
for(const file of walk(root)){
  let html=fs.readFileSync(file,'utf8');if(!html.includes('<body'))continue;
  const relative=path.relative(root,file).replaceAll('\\','/');
  const locale=relative.startsWith('en/')?'en':relative.startsWith('zh-cn/')?'zh-CN':'ja';
  const prefix=locale==='ja'?'':locale==='en'?'/en':'/zh-cn',c=astraCopy[locale];
  const route='/'+relative.replace(/^(en|zh-cn)\//,'').replace(/index\.html$/,'');
  const href=p=>prefix+p;
  const bodyMatch=html.match(/<body([^>]*)>([\s\S]*?)<\/body>/);if(!bodyMatch)continue;
  const $=load(bodyMatch[2],{},false);
  $('.astra-primary-nav,.astra-today,.astra-journey,.astra-ad,.astra-experiment-bar,.astra-community-intro,.astra-search-help,.astra-home-title,.astra-home-search,.astra-compact-toggle,.astra-trust').remove();
  const navItems=[['⌂','home','/'],['◈','db','/#tatari'],['S','tier','/tata-tier/'],['▦','calendar','/events/calendar/'],['⌘','team','/team-builder/'],['↗','beginner','/beginner-guide/'],['◎','community','/team-builder/community/']];
  $('#global-navigation').prepend(`<div class="astra-primary-nav"><span class="astra-nav-caption">MONSTER SURVIVAL</span>${navItems.map(([i,k,p])=>`<a href="${href(p)}"${route===p?' aria-current="page"':''}><span aria-hidden="true">${i}</span>${c[k]}</a>`).join('')}<span class="astra-nav-caption">${c.explore}</span></div>`);
  const language=$('.language-switcher').first();$('.header-inner').append(language);
  $('footer').prepend(`<div class="wrap astra-experiment-bar"><b>${c.experiment}</b><span>${c.trust}</span><a href="?ads=off">${c.off}</a><a href="?ads=preview">${c.preview}</a></div>`);
  // Reserve slots in static HTML; no third-party scripts or trackers run in this branch.
  $('script[src*="monetization.js"]').attr('type','text/plain');
  $('[data-affiliate-offer]').remove();
  const journey=()=>`<section class="wrap astra-journey"><div class="astra-section-heading"><span class="astra-eyebrow">PLAYBOOK</span><h2>${c.journey}</h2></div><div class="astra-steps">${['/beginner-guide/','/tata-tier/','/evolution-priority/','/team-builder/'].map((p,i)=>`<a href="${href(p)}"><span class="astra-step-number">0${i+1}</span><b>${c.steps[i]}</b><small>${c.stepsText[i]} ↗</small></a>`).join('')}</div></section>`;
  const today=()=>`<section class="wrap astra-today" aria-labelledby="astra-today-title"><div class="astra-section-heading"><div><span class="astra-eyebrow">LIVE & NEXT</span><h2 id="astra-today-title">${c.today}</h2></div><a href="${href('/events/calendar/')}">${c.schedule} ↗</a></div><div class="astra-today-grid" data-astra-schedule><a href="${href('/events/calendar/')}">${c.calendar} ↗</a></div><p class="astra-schedule-source">${c.source}</p></section>`;
  if(route==='/'){
    $('.hero').addClass('astra-home-hero');
    $('.hero-copy').prepend(`<p class="astra-home-title">${c.intro}</p>`);
    $('.hero-copy .lead').text(c.lead);
    $('.hero-copy h1').removeAttr('class');
    $('.hero-copy').append(`<a class="astra-home-search" href="${href('/search/')}"><span aria-hidden="true">⌕</span>${c.search}<span aria-hidden="true">↗</span></a>`);
    const search=$('.hero-search-row');$('#tatari .section-head').after(search);
    $('#tatari').addClass('astra-catalog');
    $('#tatari .section-head').append(`<button type="button" class="ghost-button astra-compact-toggle" aria-pressed="false">${c.compact}</button>`);
    const hero=$('.hero');hero.after(today());$('.astra-today').after($('#tatari'));
    $('#tatari').after(journey());
    // Keep every existing static source paragraph and navigation reachable, but consolidate secondary home sections.
    if(!$('.astra-home-reference').length){
      const holder=$(`<details class="wrap astra-home-reference"><summary>${c.more}</summary><div></div></details>`);
      const other=$('main').contents().filter((_,el)=>!$(el).is('.hero,.astra-today,#tatari,.astra-journey,.astra-ad'));
      holder.find('div').append(other);$('main').append(holder);
    }
    $('.hero .site-stats').html(`<span><b>${count}</b>${locale==='ja'?'系統':locale==='en'?' families':' 个系列'}</span><span><b>${data.families.flatMap(f=>f.evolutions).length}</b>${locale==='ja'?'体':locale==='en'?' Tatari':' 个Tatari'}</span><span><b>5</b>${locale==='ja'?'属性':locale==='en'?' attributes':'种属性'}</span>`);
    $('.hero .hero-media img').attr({src:'/assets/astra/hero-360.webp',srcset:[120,240,360,600].map(w=>`/assets/astra/hero-${w}.webp ${w}w`).join(', '),sizes:'(max-width: 700px) 108px, 252px',loading:'eager'});
  }
  if(route==='/tata-tier/'&&!$('.tier-board').length){
    const byline=$('.article-byline');if(byline.length)byline.after($('#tier-list'));
    const chart=$('.tier-chart');if(chart.length){const section=chart.closest('section');section.addClass('astra-tier-primary');if(!section.find('.astra-tier-explanation').length){const prose=section.find('.section-head p');const details=$(`<details class="astra-tier-explanation"><summary>${c.details}</summary></details>`);prose.remove();details.append(prose);chart.after(details);}}
    $('.tier-page-hero').addClass('astra-compact-hero');
  }
  if(route.startsWith('/tata/')){
    $('.tata-character-hero').after($('.tata-quick-answers'));
    $('.tata-stage-index').addClass('astra-stage-nav');
  }
  if(route==='/beginner-guide/'||route==='/evolution-priority/')$('.page-hero').after(journey());
  if(route==='/events/'){
    $('script[src*="/calendar/calendar.js"]').remove();$('link[href*="/calendar/calendar.css"]').remove();
    $('.page-hero').after(today());
  }
  if(route==='/team-builder/'){
    $('.astra-mode-toolbar').addClass('tool-toolbar');
    const settings=$('#team-settings-title').closest('section');
    if(!settings.find('.astra-settings-details').length){
      const mode=$('#team-mode').closest('label').remove();
      const contents=settings.contents().remove();settings.append(`<div class="astra-mode-toolbar tool-toolbar"></div><details class="astra-settings-details"><summary>${c.settings}</summary></details>`);
      settings.find('.astra-mode-toolbar').append(mode);settings.find('details').append(contents);
    }
    const chips=$('#team-chip-settings');if(chips.length&&!chips.parent().is('details')){const detail=$(`<details class="astra-chip-details"><summary>${locale==='ja'?'チップを設定':locale==='en'?'Configure chips':'配置芯片'}</summary></details>`);chips.remove();detail.append(chips);$('.formation-board-footer').after(detail);}
    $('.page-hero').addClass('astra-compact-hero');
    const intro=$('.page-hero .family-page-head>div>p');$('#team-help-title').after(intro);
    const players=$('#team-player-settings');if(players.length&&!players.parent().is('details')){const detail=$(`<details class="astra-player-details"><summary>${locale==='ja'?'Player設定・上限解放':locale==='en'?'Player settings & limits':'Player设置与上限'}</summary></details>`);players.remove();detail.append(players);$('.formation-board-footer').after(detail);}
  }
  if(route.startsWith('/team-builder/community/'))$('.page-hero').after(`<section class="wrap astra-community-intro"><span class="astra-eyebrow">PLAYER KNOWLEDGE</span><h2>${c.communityTitle}</h2><p>${c.communityText}</p><a class="button" href="${href('/team-builder/')}">${c.team} ↗</a><p class="astra-read-only">${c.readOnly}</p></section>`);
  if(route==='/search/')$('.page-hero').after(`<div class="wrap astra-search-help"><p>${c.searchHint}</p><a href="${href('/#tatari')}">${c.db}</a> · <a href="${href('/events/calendar/')}">${c.calendar}</a> · <a href="${href('/beginner-guide/')}">${c.beginner}</a></div>`);
  // A card must not nest links inside a button role. Existing click handlers remain available.
  $('.catalog-card[role="button"]').removeAttr('role');
  // The first HTML response must choose the same small image as subsequent client rendering.
  $('.catalog-card img,.tier-chart-tata img,.overall-image img').each((_,el)=>{const img=$(el),f=imageMap.get(img.attr('src'));if(!f||!fs.existsSync(path.join(root,`assets/astra/${f.familyId}-128.webp`)))return;const small=`/assets/astra/${f.familyId}-128.webp`;img.attr({src:small,srcset:`${small} 128w, ${f.stage1.srcset||`${f.stage1.src} ${f.stage1.width}w`}`,sizes:img.closest('.tier-chart-tata').length?'(max-width:700px) 52px,72px':img.closest('.overall-image').length?'92px':'(max-width:700px) 90px,112px'});});
  const plan=locale==='ja'?(adPlans[route]||[]):[];
  for(const [index,item] of plan.entries()){
    const o=offers.get(item.offer);if(!o)continue;
    const notice='アフィリエイト広告枠・配置プレビュー';
    const ad=$(`<aside class="wrap astra-ad${o.desktopOnly?' astra-ad-desktop':''}" data-astra-offer="${o.id}" aria-label="${c.ad}" style="--astra-creative-width:${o.width}px;--astra-creative-height:${o.height}px;--astra-creative-ratio:${o.width}/${o.height}"><span>${c.ad}</span><div class="astra-ad-preview"><b translate="no" lang="ja">${esc(o.name)}</b><small>${notice}</small><small>${o.width} × ${o.height}</small></div><div class="monetization-slot affiliate-placement" data-monetization-slot="article_${index+1}" data-affiliate-offer="${o.id}" aria-busy="true"></div></aside>`);
    if(o.id==='altema_point_005')ad.append('<p>スマートフォン専用のポイントサービスです。PCでは利用できません。</p>');
    const anchor=$(item.after||item.before).first();if(!anchor.length)throw new Error(`Missing affiliate placement anchor: ${route} ${item.after||item.before}`);
    if(item.after)anchor.after(ad);else anchor.before(ad);
  }
  if(plan.length){$('.astra-experiment-bar').append(`<a href="?ads=live">既存広告を確認</a>`);if(!$('script[src*="monetization.js"]').length)$('footer').after(`<script src="/monetization.js?v=${version}" type="text/plain" defer></script>`);}
  $('script[src*="/astra-ads.js"]').remove();
  if(plan.length)$('footer').after(`<script src="/astra-ads.js?v=${version}" defer></script>`);
  $('.hero-cta,.site-stats,#attributeFilters').attr('role','group');
  const attributes=bodyMatch[1].replace(/\sdata-astra(?:-page)?="[^"]*"/g,'');
  const bodyHtml=$.html().replace(/\s(required|hidden|checked|disabled|selected|multiple|readonly|autofocus)=""/g,' $1');
  html=html.replace(bodyMatch[0],`<body${attributes} data-astra="experiment" data-astra-page="${esc(route)}">${bodyHtml}</body>`);
  html=html.replace(/<link[^>]*href="\/astra(?:-[a-z]+)?\.css[^>]*>/g,'').replace(/<script[^>]*src="\/astra(?:-calendar)?\.js[^>]*><\/script>/g,'');
  const pageCss=route==='/'?['home']:route==='/events/'?['home']:route==='/events/calendar/'?['calendar']:route==='/team-builder/'?['team']:route.startsWith('/team-builder/community/')?['community','team']:route.startsWith('/tata/')?['detail']:route==='/tata-tier/'?['tier']:['/beginner-guide/','/evolution-priority/'].includes(route)?['home']:[];
  html=html.replace('</head>',['astra',...pageCss.map(x=>'astra-'+x)].map(x=>`<link rel="stylesheet" href="/${x}.css?v=${version}">`).join('')+'</head>').replace('</body>',`<script src="/astra.js?v=${version}" defer></script>${route==='/'||route==='/events/'?`<script type="module" src="/astra-calendar.js?v=${version}"></script>`:''}</body>`);
  html=html.replace(/(<script async src="https:\/\/www.googletagmanager.com[^\"]*")([^>]*>)/g,(_,a,b)=>a+b.replace(/ type="[^"]*"/g,'').replace('>',' type="text/plain">'));
  // Self-localized generators may copy a header from the preceding build. Normalize all asset URLs last.
  html=html.replace(/((?:href|src)="(?:\.\/|\.\.\/|\/)[^"?]+\.(?:css|js))(?:\?v=[^"#]*)?("(?:\s|>))/g,`$1?v=${version}$2`);
  if(fs.readFileSync(file,'utf8')!==html)fs.writeFileSync(file,html);
}
console.log('Astra redesign: static layout and three locales generated; promo excluded.');
