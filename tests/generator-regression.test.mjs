import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {load} from 'cheerio';
import {prepareHtml} from '../scripts/prepare-deployment.mjs';
const root=path.resolve(import.meta.dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const fixture=JSON.parse(read('tests/fixtures/astra-ad-placements.json'));
const sha=s=>createHash('sha256').update(s.replace(/\r\n/g,'\n')).digest('hex');
function htmlFiles(dir=root){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>['.git','node_modules','.vercel','promo','assets'].includes(e.name)?[]:e.isDirectory()?htmlFiles(path.join(dir,e.name)):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);}
test('all 22 published affiliate placements survive generation without additions or moves',()=>{
 const actual=[];
 for(const file of htmlFiles()){
  const route='/'+path.relative(root,file).replaceAll('\\','/').replace(/index.html$/,'');
  const $=load(fs.readFileSync(file,'utf8'));
  $('.astra-ad').each((_,el)=>{const a=$(el);actual.push({route,offer:a.attr('data-astra-offer'),slot:a.find('[data-monetization-slot]').attr('data-monetization-slot'),desktopOnly:a.hasClass('astra-ad-desktop'),after:a.prev().attr('id')||a.prev().attr('class'),htmlSha256:sha($.html(el))});});
 }
 const sort=a=>a.sort((a,b)=>`${a.route}:${a.slot}`.localeCompare(`${b.route}:${b.slot}`));
 assert.equal(actual.length,22);assert.deepEqual(sort(actual),sort(structuredClone(fixture.slots)));
 assert.equal(new Set(actual.map(x=>`${x.route}:${x.slot}`)).size,22);
});
test('A8 originals and all tracking identifiers remain exact; Production retains the lost three slots',()=>{
 assert.equal(sha(read('data/affiliate-offers.json')),fixture.originalSha256);
 const offers=JSON.parse(read('data/affiliate-offers.json')).offers;
 for(const expected of fixture.offers)for(const [key,value]of Object.entries(expected))assert.deepEqual(offers.find(o=>o.id===expected.id)[key],value);
 const $=load(prepareHtml(read('tata-tier/index.html'),'production'));
 for(const id of ['point_income_003','altema_point_005','ipsos_isay_001'])assert.equal($(`.astra-ad.is-live [data-affiliate-offer="${id}"]`).length,1);
 assert.equal($('.astra-ad').length,4);
 assert.match(read('monetization.js'),/link\.rel = 'sponsored nofollow noopener'/);
 assert.match(read('monetization.js'),/pixel\.src = offer\.trackingPixel/);
});
test('all 399 published SEO records survive generation unchanged',()=>{
 const expected=JSON.parse(read('tests/fixtures/generation-seo.json'));
 for(const[file,hash]of Object.entries(expected)){
  const $=load(read(file));
  const fields={title:$('title').text(),description:$('meta[name="description"]').attr('content'),canonical:$('link[rel="canonical"]').attr('href'),hreflang:$('link[hreflang]').toArray().map(e=>[$(e).attr('hreflang'),$(e).attr('href')]),robots:$('meta[name="robots"]').toArray().map(e=>$(e).attr('content')),schemas:$('script[type="application/ld+json"]').toArray().map(e=>JSON.parse($(e).text()))};
  assert.equal(sha(JSON.stringify(fields)),hash,file);
 }
});
