import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import {prepareHtml} from '../scripts/prepare-deployment.mjs';
const read = f => fs.readFileSync(new URL('../'+f, import.meta.url),'utf8');

test('Production keeps each original SEO policy and restores the existing integrations once', () => {
  for (const prefix of ['', 'en/', 'zh-cn/']) for (const route of ['', 'board/', 'board/thread/', 'friends/', 'team-builder/', 'team-builder/community/', 'search/', 'events/calendar/']) {
    const source = read(prefix+route+'index.html');
    const before = load(source), result = prepareHtml(source, 'production'), after = load(result);
    assert.equal(after('body').attr('data-astra'), 'production');
    assert.equal(after('.astra-experiment-bar,.astra-read-only,.astra-ad-preview,script[src*="astra-ads.js"]').length,0);
    for (const selector of ['meta[name=robots]', 'link[rel=canonical]', 'link[hreflang]', 'script[type="application/ld+json"]']) assert.deepEqual(after(selector).map((_,e)=>after(e).toString()).get(),before(selector).map((_,e)=>before(e).toString()).get(),prefix+route+selector);
    assert.equal(after('script[data-monsaba-ga4=loader]').length,before('script[data-monsaba-ga4=loader]').length);
    assert.equal(after('script[data-monsaba-ga4][type="text/plain"]').length,0);
    assert.equal(after('script[src*="monetization.js"][type="text/plain"]').length,0);
    assert.equal(prepareHtml(result,'production'),result);
  }
});

test('Production renders the original approved placements at their retained content anchors', () => {
  for (const [route,previous,offer] of [['','.astra-journey','warau_003'],['beginner-guide/','#t3','point_income_003'],['evolution-priority/','#transition-list','macromill_002'],['normal-guide/','#normal-bosses','ipsos_isay_001']]) {
    const source=read(route+'index.html'), before=load(source), after=load(prepareHtml(source,'production'));
    assert.equal(after(previous).next().hasClass('astra-ad'),true,route);
    assert.equal(after(previous).next().attr('data-astra-offer'),offer,route);
    assert.equal(after(previous).next().find('[data-affiliate-offer]').attr('data-affiliate-offer'),offer,route);
    assert.equal(after('script[src*="monetization.js"]').length,1);
    for(const prefix of ['en/','zh-cn/']) assert.equal(load(prepareHtml(read(prefix+route+'index.html'),'production'))('.astra-ad').length,0);
  }
});

test('Preview, development and unknown builds retain noindex and disabled integrations', () => {
  for (const environment of ['preview','development',undefined,'unknown']) {
    const result=prepareHtml(read('index.html'),environment), $=load(result);
    assert.equal($('body').attr('data-astra'),'experiment');
    assert.equal($('meta[data-deployment-robots]').attr('content'),'noindex,nofollow');
    assert.equal($('script[data-monsaba-ga4]:not([type="text/plain"])').length,0);
    assert.equal($('script[src*="monetization.js"]').attr('type'),'text/plain');
    assert.equal(prepareHtml(result,environment),result);
  }
});

test('HTTP noindex excludes only the two production domains; original security headers remain', () => {
  const config=JSON.parse(read('vercel.json'));
  assert.ok(!config.headers[0].headers.some(h=>h.key==='X-Robots-Tag'));
  const condition=config.headers.find(h=>h.missing)?.missing[0];
  assert.equal(condition.type,'host');
  const production=new RegExp(`^(?:${condition.value})$`);
  for(const host of ['monster-survival.com','www.monster-survival.com']) assert.equal(production.test(host),true);
  for(const host of ['example.vercel.app','localhost','monster-survival.com.evil.example']) assert.equal(production.test(host),false);
  assert.ok(config.headers[0].headers.some(h=>h.key==='X-Content-Type-Options'));
});

test('API writes fail closed outside Production; Production still rejects untrusted origins before storage', async () => {
  const previous=process.env.VERCEL_ENV;
  try {
    for(const environment of ['preview','development',undefined,'unknown','production']) {
      if(environment===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=environment;
      for(const api of ['community','board','friends']) {
        const {default:handler}=await import(`../api/${api}.js`);
        for(const method of ['POST','DELETE']) {
          let code,body;const response={setHeader(){},status(v){code=v;return this;},json(v){body=v;return this;}};
          await handler({method,url:`/api/${api}`,headers:{host:'monster-survival.com',origin:'https://untrusted.example'},body:{}},response);
          assert.equal(code,environment==='production'?403:405,`${environment}/${api}/${method}`);
          assert.equal(body.error.code,environment==='production'?'ORIGIN_NOT_ALLOWED':'PREVIEW_READ_ONLY');
        }
      }
    }
  } finally { if(previous===undefined)delete process.env.VERCEL_ENV;else process.env.VERCEL_ENV=previous; }
});


test('Authorized A8 additions preserve offer scope and stay within the per-page density cap', () => {
  const offers=JSON.parse(read('data/affiliate-offers.json')).offers;
  const added=offers.find(o=>o.id==='altema_point_005');
  assert.equal(offers.length,5);
  assert.deepEqual(added.targetPages,['/tata-tier/','/zombie-rush/']);
  assert.equal(added.destination,'https://px.a8.net/svt/ejp?a8mat=4BADDE+GFSWUY+589S+5ZEMP');
  assert.equal(added.mediaSource,'https://www22.a8.net/svt/bgt?aid=260824370994&wid=002&eno=01&mid=s00000024400001005000&mc=1');
  assert.equal(added.trackingPixel,'https://www13.a8.net/0.gif?a8mat=4BADDE+GFSWUY+589S+5ZEMP');
  assert.deepEqual([added.width,added.height],[320,50]);
  for(const [route,count,anchor,offer] of [['tata-tier/',4,'#first-picks','altema_point_005'],['zombie-rush/',5,'#danger','altema_point_005'],['boss-rally/',1,null,'point_income_003']]){
    const source=read(route+'index.html');const doc=load(prepareHtml(source,'production'));
    assert.equal(doc('.astra-ad.is-live').length,count);
    assert.equal(doc('[data-affiliate-offer]').length,count);
    const selected=anchor?doc(anchor).next():doc('.next-reading').prev();
    assert.equal(selected.find('[data-affiliate-offer]').attr('data-affiliate-offer'),offer);
    if(offer==='altema_point_005')assert.match(selected.text(),/スマートフォン専用.*PCでは利用できません/);
    assert.equal(doc('script[src*="monetization.js"]:not([type])').length,1);
    assert.equal(load(prepareHtml(source,'preview'))('script[src*="monetization.js"]').attr('type'),'text/plain');
    for(const p of ['en/','zh-cn/'])assert.equal(load(prepareHtml(read(p+route+'index.html'),'production'))('[data-affiliate-offer],.astra-ad').length,0);
  }
});
