import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { prepareHtml } from '../scripts/prepare-deployment.mjs';
const root = path.resolve(import.meta.dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const fixture = JSON.parse(read('tests/fixtures/astra-ad-placements.json'));
const sha = s => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex');
function htmlFiles(dir = root) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => ['.git', 'node_modules', '.vercel', 'promo', 'assets'].includes(e.name) ? [] : e.isDirectory() ? htmlFiles(path.join(dir, e.name)) : e.name.endsWith('.html') ? [path.join(dir, e.name)] : []);
}
test('all 22 published affiliate placements survive generation without additions or moves', () => {
  const actual = [];
  for (const file of htmlFiles()) {
    const route = '/' + path.relative(root, file).replaceAll('\\', '/').replace(/index.html$/, '');
    const $ = load(fs.readFileSync(file, 'utf8'));
    $('.astra-ad').each((_, el) => {
      const a = $(el);
      actual.push({
        route,
        offer: a.attr('data-astra-offer'),
        slot: a.find('[data-monetization-slot]').attr('data-monetization-slot'),
        desktopOnly: a.hasClass('astra-ad-desktop'),
        after: a.prev().attr('id') || a.prev().attr('class'),
        htmlSha256: sha($.html(el))
      });
    });
  }
  const sort = a => a.sort((a, b) => `${a.route}:${a.slot}`.localeCompare(`${b.route}:${b.slot}`));
  assert.equal(actual.length, 22);
  assert.deepEqual(sort(actual), sort(structuredClone(fixture.slots)));
  assert.equal(new Set(actual.map(x => `${x.route}:${x.slot}`)).size, 22);
});
test('A8 originals and all tracking identifiers remain exact; Production retains the lost three slots', () => {
  assert.equal(sha(read('data/affiliate-offers.json')), fixture.originalSha256);
  const offers = JSON.parse(read('data/affiliate-offers.json')).offers;
  for (const expected of fixture.offers)
    for (const [key, value] of Object.entries(expected))
      assert.deepEqual(offers.find(o => o.id === expected.id)[key], value);
  const $ = load(prepareHtml(read('tata-tier/index.html'), 'production'));
  for (const id of ['point_income_003', 'altema_point_005', 'ipsos_isay_001'])
    assert.equal($(`.astra-ad.is-live [data-affiliate-offer="${id}"]`).length, 1);
  assert.equal($('.astra-ad').length, 4);
  assert.match(read('monetization.js'), /link\.rel = 'sponsored nofollow noopener'/);
  assert.match(read('monetization.js'), /pixel\.src = offer\.trackingPixel/);
});
test('all 399 published SEO records retain their fields except reviewed October 7 data and October 10 catalog totals', () => {
  const historical = JSON.parse(read('tests/fixtures/seo-baseline-fields-2026-10-06.json'));
  const policy = JSON.parse(read('tests/fixtures/seo-approved-changes-2026-10-07.json'));
  const apply = (object, change) => { const keys = change.path.slice(1).split('/'); let parent = object; for (const key of keys.slice(0, -1)) parent = parent[key]; parent[keys.at(-1)] = change.value; };
  const expected = JSON.parse(read('tests/fixtures/generation-seo.json'));
  for (const [file, hash] of Object.entries(expected)) {
    const $ = load(read(file));
    const fields = {
      title: $('title').text(),
      description: $('meta[name="description"]').attr('content'),
      canonical: $('link[rel="canonical"]').attr('href'),
      hreflang: $('link[hreflang]').toArray().map(e => [$(e).attr('hreflang'), $(e).attr('href')]),
      robots: $('meta[name="robots"]').toArray().map(e => $(e).attr('content')),
      schemas: $('script[type="application/ld+json"]').toArray().map(e => JSON.parse($(e).text()))
    };
    if (historical[file]) {
      assert.equal(sha(JSON.stringify(historical[file])), hash, file + ': published baseline changed');
      const approved = structuredClone(historical[file]);
      for (const change of policy.changes[file] || []) apply(approved, change);
      // The supplied four-stage family changes only current totals and the trial
      // update date. Build expectations from the published baseline, not outputs.
      const updateTotals = value => value.replace(/66(?=\s*(?:系統|families|个系列))/g, '67')
        .replace(/242(?=\s*(?:体|forms|个形态))/g, '246');
      if (['index.html', 'en/index.html', 'zh-cn/index.html'].includes(file))
        approved.schemas[0]['@graph'][1].description = updateTotals(approved.schemas[0]['@graph'][1].description);
      if (['evolution/trials/index.html', 'en/evolution/trials/index.html', 'zh-cn/evolution/trials/index.html'].includes(file)) {
        approved.title = updateTotals(approved.title);
        approved.description = updateTotals(approved.description);
        const collection = approved.schemas[0]['@graph'][0];
        collection.name = updateTotals(collection.name);
        collection.description = updateTotals(collection.description);
        collection.dateModified = '2026-10-10';
        if (file.startsWith('en/')) {
          const breadcrumb = approved.schemas[0]['@graph'][1].itemListElement[1];
          breadcrumb.name = updateTotals(breadcrumb.name);
        }
      }
      assert.deepEqual(fields, approved, file);
    } else {
      const preserved = structuredClone(fields);
      if (['attribute/index.html', 'en/attribute/index.html', 'zh-cn/attribute/index.html'].includes(file)) {
        // Only the family total changes in these two descriptions; all other
        // fields still match the exact published hash.
        const publishedTotal = value => value.replace(/67(?=\s*(?:系統|Tatari families|个 Tatari系列))/g, '66');
        preserved.description = publishedTotal(preserved.description);
        preserved.schemas[0]['@graph'][0].description = publishedTotal(preserved.schemas[0]['@graph'][0].description);
      }
      assert.equal(sha(JSON.stringify(preserved)), hash, file);
    }
  }
});
