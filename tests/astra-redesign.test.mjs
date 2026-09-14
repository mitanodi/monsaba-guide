import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {execFileSync} from 'node:child_process';import {load} from 'cheerio';
const root=path.resolve(import.meta.dirname,'..');const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const control=f=>execFileSync('git',['show',`pre-astra-redesign-20260915:${f}`],{cwd:root,encoding:'utf8'});
test('Astra preserves core data, affiliate code, saved-data keys and share codec byte for byte',()=>{
  for(const f of ['data/tatari.json','data/tata-skills.json','data/tier-ratings.json','data/evolution-priority.json','data/calendar-config.json','data/monetization.json','data/affiliate-offers.json','monetization.js','team-builder/team-core.js'])assert.equal(read(f).replaceAll('\r\n','\n'),control(f).replaceAll('\r\n','\n'),f);
});
test('Astra preserves SEO identity on representative existing pages in all three languages',()=>{
  const routes=['','tata-tier/','beginner-guide/','evolution-priority/','tata/takepanda/','team-builder/','team-builder/community/','events/','search/','compare/','my-monsaba/','board/','friends/'];
  for(const locale of ['','en/','zh-cn/'])for(const route of routes){
    const file=`${locale}${route}index.html`,before=load(control(file)),after=load(read(file));
    for(const selector of ['h1','title'])assert.equal(after(selector).text().trim(),before(selector).text().trim(),file+' '+selector);
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
test('Preview API rejects every write method before accessing a data service',async()=>{
  const previous=process.env.VERCEL_ENV;process.env.VERCEL_ENV='preview';
  try{for(const api of ['community','board','friends']){const {default:handler}=await import(`../api/${api}.js`);for(const method of ['POST','DELETE','PUT','PATCH']){let code,body;const response={setHeader(){},status(v){code=v;return this;},json(v){body=v;return this;}};await handler({method,headers:{}},response);assert.equal(code,405,api+method);assert.equal(body.error.code,'PREVIEW_READ_ONLY');}}}finally{if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous;}
});
