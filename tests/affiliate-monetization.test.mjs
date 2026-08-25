import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import '../monetization.js';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const config = JSON.parse(read('data/monetization.json'));
const offers = JSON.parse(read('data/affiliate-offers.json')).offers;
const api = globalThis.MONSABA_MONETIZATION_TEST;

class StorageMock {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
}

test('keeps all four protected A8 destinations, banners, pixels and sizes unchanged', () => {
  const expected = {
    point_income_003: ['https://px.a8.net/svt/ejp?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 'https://www28.a8.net/svt/bgt?aid=260824371058&wid=002&eno=01&mid=s00000025908001003000&mc=1', 'https://www16.a8.net/0.gif?a8mat=4BADDF+YJ6MY+5JWO+5YZ75', 300, 250],
    warau_003: ['https://px.a8.net/svt/ejp?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 'https://www25.a8.net/svt/bgt?aid=260824371056&wid=002&eno=01&mid=s00000018660003012000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDF+XCBFE+3ZZC+HXKQP', 468, 60],
    macromill_002: ['https://px.a8.net/svt/ejp?a8mat=4BADDF+1JU+2WL0+CN8W1', 'https://www21.a8.net/svt/bgt?aid=260824371000&wid=002&eno=01&mid=s00000013554002124000&mc=1', 'https://www18.a8.net/0.gif?a8mat=4BADDF+1JU+2WL0+CN8W1', 120, 600],
    ipsos_isay_001: ['https://px.a8.net/svt/ejp?a8mat=4BADDE+G8NPLM+4286+62U35', 'https://www21.a8.net/svt/bgt?aid=260824370982&wid=002&eno=01&mid=s00000018951001021000&mc=1', 'https://www11.a8.net/0.gif?a8mat=4BADDE+G8NPLM+4286+62U35', 250, 250]
  };
  for (const offer of offers) assert.deepEqual([offer.destination, offer.mediaSource, offer.trackingPixel, offer.width, offer.height], expected[offer.id]);
  assert.match(read('monetization.js'), /link\.rel = 'sponsored nofollow noopener'/);
  assert.match(read('monetization.js'), /pixel\.width = 1/);
  assert.match(read('monetization.js'), /pixel\.height = 1/);
});

test('limits affiliate delivery to configured long-form routes and keeps policy pages out', () => {
  const warau = offers.find((offer) => offer.id === 'warau_003');
  assert.equal(api.isPageAllowed(warau, '/'), true);
  assert.equal(api.isPageAllowed(warau, '/tata/hikaru/'), true);
  assert.equal(api.isPageAllowed(warau, '/attribute/thunder/'), true);
  for (const route of ['/privacy/', '/about/', '/updates/', '/search/', '/consult/']) assert.equal(api.isPageAllowed(warau, route), false, route);
});

test('uses high density, delayed right slide, delayed bottom banner and one floating ad per session', () => {
  assert.equal(config.adsEnabled, false);
  assert.equal(config.affiliateEnabled, true);
  assert.equal(config.affiliateDensity, 'high');
  assert.equal(config.slideAffiliateSide, 'right');
  assert.equal(config.slideAffiliateDelaySeconds, 10);
  assert.equal(config.bottomAffiliateDelaySeconds, 7);
  assert.equal(config.floatingAffiliateSessionLimit, 1);
  const storage = new StorageMock();
  assert.equal(api.sessionCanShow(storage, 1), true);
  api.markSessionShown(storage);
  assert.equal(api.sessionCanShow(storage, 1), false);
  api.markSessionClosed(storage, 12345);
  assert.equal(storage.getItem(api.sessionKeys.closed), '12345');
});

test('provides real close controls, safe-area spacing, UI suppression and measured analytics', () => {
  const js = read('monetization.js');
  const css = read('styles.css');
  const growth = read('growth.js');
  assert.match(js, /aria-label', '広告を閉じる'/);
  assert.match(js, /site-header\.nav-open/);
  assert.match(js, /document\.activeElement.*closest/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
  assert.match(css, /max-width:calc\(100vw - 8px\)/);
  assert.match(growth, /affiliate_impression/);
  assert.match(growth, /intersectionRatio < 0\.5/);
  for (const property of ['offer_id', 'page', 'placement', 'device_class']) assert.ok(growth.includes(property), property);
});
