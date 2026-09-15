import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {load} from 'cheerio';
const root=path.resolve(import.meta.dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const control=f=>execFileSync('git',['show',`pre-astra-redesign-20260915:${f}`],{cwd:root,encoding:'utf8'});
test('Astra preserves core data, affiliate code, saved-data keys and share codec byte for byte',()=>{
  for(const f of ['data/tatari.json','data/tata-skills.json','data/evolution-priority.json','data/calendar-config.json','data/monetization.json','monetization.js','team-builder/team-core.js'])assert.equal(read(f).replaceAll('\r\n','\n'),control(f).replaceAll('\r\n','\n'),f);
});
test('Astra preserves SEO identity on representative existing pages in all three languages',()=>{
  const routes=['','tata-tier/','beginner-guide/','evolution-priority/','tata/takepanda/','team-builder/','team-builder/community/','events/','search/','compare/','my-monsaba/','board/','friends/'];
  for(const locale of ['','en/','zh-cn/'])for(const route of routes){
    const file=`${locale}${route}index.html`,before=load(control(file)),after=load(read(file));
    for(const selector of ['h1','title']){ const copy=JSON.parse(read('data/i18n/tata-tier.json')); const expected=route==='tata-tier/'?copy[locale==='en/'?'en':locale==='zh-cn/'?'zh-CN':'ja'].title:before(selector).text().trim(); assert.equal(after(selector).text().trim(),expected,file+' '+selector); }
    for(const selector of ['link[rel=canonical]','meta[name=robots]'])assert.equal(after(selector).attr(selector.startsWith('link')?'href':'content'),before(selector).attr(selector.startsWith('link')?'href':'content'),file+' '+selector);
    assert.deepEqual(after('link[hreflang]').map((_,e)=>[after(e).attr('hreflang')+' '+after(e).attr('href')]).get().sort(),before('link[hreflang]').map((_,e)=>[before(e).attr('hreflang')+' '+before(e).attr('href')]).get().sort(),file+' hreflang');
  }
});
test('Calendar is real and localized; essential data remains available without JS',()=>{
  for(const locale of ['','en/','zh-cn/']){const $=load(read(`${locale}events/calendar/index.html`));assert.equal($('h1').length,1);assert.ok($('link[rel=canonical]').attr('href').endsWith(`/${locale}events/calendar/`));assert.ok($('script[src*="calendar/calendar.js"]').length);assert.match($.html(),/BreadcrumbList/);const home=load(read(`${locale}index.html`));assert.equal(home('#cards .catalog-card').length,65);assert.equal(home('.astra-primary-nav').length,1);}
});
test('Tool, search and community pages have no experimental advertisement',()=>{
  for(const route of ['team-builder/','team-builder/community/','events/calendar/','search/','compare/','my-monsaba/','board/','friends/']){const $=load(read(route+'index.html'));assert.equal($('.astra-ad').length,0);}
  const $=load(read('index.html'));assert.equal($('.astra-ad').length,1);assert.equal($('script[data-monsaba-ga4=loader]').attr('type'),'text/plain');assert.equal($('script[src*="monetization.js"]').attr('type'),'text/plain');
});

test('Tier chart is in its final reading position before client scripts run',()=>{
  for(const locale of ['','en/','zh-cn/']){const $=load(read(`${locale}tata-tier/index.html`));assert.equal($('.article-byline').next().attr('id'),'tier-list');}
});

test('Finalization serves page CSS selectively and keeps responsive images valid before hydration',()=>{
  const home=load(read('index.html')),tier=load(read('tata-tier/index.html')),builder=load(read('team-builder/index.html'));
  assert.equal(home('link[href*="astra-team.css"]').length,0);assert.equal(builder('link[href*="astra-team.css"]').length,1);
  assert.equal(tier('link[href*="astra-calendar.css"]').length,0);
  assert.ok(fs.statSync(path.join(root,'astra.css')).size+fs.statSync(path.join(root,'astra-home.css')).size<25000);
  assert.equal(home('.hero-media img').attr('loading'),'eager');
  for(const $ of [home,tier])$('img[srcset]').each((_,el)=>{assert.ok(!$(el).attr('srcset').includes('undefined'));for(const candidate of $(el).attr('srcset').split(',')){const url=candidate.trim().split(/\s+/)[0];if(url.startsWith('/'))assert.ok(fs.existsSync(path.join(root,url.slice(1))),url);}});
  assert.match(read('astra.css'),/(?<!-)backdrop-filter:none/);
});

test('Finalization preserves AdSense and keeps approved affiliate density within the page plan',()=>{
  assert.equal(read('ads.txt').replaceAll('\r\n','\n'),control('ads.txt').replaceAll('\r\n','\n'));
  for(const [route,count]of [['',1],['beginner-guide/',5],['evolution-priority/',5],['normal-guide/',1],['tata-tier/',4],['zombie-rush/',5],['boss-rally/',1]]){const $=load(read(route+'index.html'));assert.equal($('.astra-ad').length,count,route);assert.equal($('.astra-ad').length,$('[data-affiliate-offer]').length,route);}
  for(const route of ['tata/takepanda/','events/','badge-dojo/'])assert.equal(load(read(route+'index.html'))('.astra-ad').length,0);
});
test('Preview API rejects every write method before accessing a data service',async()=>{
  const previous=process.env.VERCEL_ENV;process.env.VERCEL_ENV='preview';
  try{for(const api of ['community','board','friends']){const {default:handler}=await import(`../api/${api}.js`);for(const method of ['POST','DELETE','PUT','PATCH']){let code,body;const response={setHeader(){},status(v){code=v;return this;},json(v){body=v;return this;}};await handler({method,headers:{}},response);assert.equal(code,405,api+method);assert.equal(body.error.code,'PREVIEW_READ_ONLY');}}}finally{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous;}
});


test('Previously approved A8 offer objects remain unchanged after the authorized addition',()=>{
  const before=JSON.parse(control('data/affiliate-offers.json')).offers;
  const after=JSON.parse(read('data/affiliate-offers.json')).offers;
  for(const offer of before)assert.deepEqual(after.find(o=>o.id===offer.id),offer);
});
