import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('the original Japanese placements remain and content ads cover indexable pages safely', () => {
  const tier = load(read('tata-tier/index.html'));
  const gaoden = load(read('tata/gaoden/index.html'));
  assert.equal(tier('.imobile-ad-slot').length, 1);
  assert.equal(tier('#mode-normal > p + .imobile-ad-slot').length, 1);
  assert.equal(tier('.imobile-ad-slot').closest('.ninja-admax-slot').length, 0);
  assert.equal(tier('.imobile-ad-slot script[src^="/imobile-ads.js"]').attr('data-imobile-slot'), 'tier');
  assert.equal(gaoden('.imobile-ad-slot').length, 1);
  assert.equal(gaoden('.tata-consult-cta + .imobile-ad-slot').length, 1);
  assert.equal(gaoden('.imobile-ad-slot').closest('.ninja-admax-slot').length, 0);
  assert.equal(gaoden('.imobile-ad-slot script[src^="/imobile-ads.js"]').attr('data-imobile-slot'), 'gaoden');
  assert.equal(tier('link[href^="/imobile-ads.css"]').length, 1);
  assert.equal(gaoden('link[href^="/imobile-ads.css"]').length, 1);

  const htmlFiles = [];
  const walk = dir => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const relative = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(relative);
      else if (entry.isFile() && entry.name.endsWith('.html')) htmlFiles.push(relative.replaceAll('\\', '/'));
    }
  };
  walk('.');
  const counts = { ja: 0, en: 0, 'zh-cn': 0 };
  for (const file of htmlFiles) {
    const page = load(read(file));
    const slots = page('.imobile-ad-slot');
    assert.ok(slots.length <= 1, `${file} must not run multiple i-mobile tags`);
    if (!slots.length) continue;
    const route = file.replace(/\/index\.html$/, '').replace(/^index\.html$/, '');
    const localizedRoute = route.replace(/^(?:en|zh-cn)\//, '');
    const locale = route === 'en' || route.startsWith('en/') ? 'en' : route === 'zh-cn' || route.startsWith('zh-cn/') ? 'zh-cn' : 'ja';
    counts[locale]++;
    assert.doesNotMatch(page('meta[name="robots"]').attr('content') || '', /noindex/i, `${file} must remain indexable`);
    const expectedLabel = locale === 'en' ? 'Advertisement' : locale === 'zh-cn' ? '广告' : '広告';
    assert.equal(slots.find('.imobile-ad-label').text(), expectedLabel, `${file} must label the ad in its page language`);
    assert.equal(slots.find('script[src^="/imobile-ads.js"]').length, 1, `${file} must load one dispatcher`);
    if (slots.hasClass('imobile-content-ad')) assert.ok(['top', 'mid', 'bottom'].includes(slots.attr('data-imobile-placement')), `${file} must declare a valid placement`);
    assert.equal(slots.closest('form, .ninja-admax-slot, .astra-ad, .monetization-slot, .personal-tool-shell').length, 0, `${file} must not overlap controls or other ads`);
    if (slots.hasClass('imobile-content-ad')) {
      assert.ok(!['board', 'friends', 'tata-tier', 'team-builder', 'team-builder/community', 'feeding', 'events/calendar'].includes(localizedRoute), `${file} is an interaction-only route`);
      const previous = slots.prev();
      const next = slots.next();
      assert.equal(previous.filter('.ninja-admax-slot, .astra-ad, .monetization-slot, .imobile-ad-slot').length, 0, `${file} must not adjoin another ad`);
      assert.equal(next.filter('.ninja-admax-slot, .astra-ad, .monetization-slot, .imobile-ad-slot').length, 0, `${file} must not adjoin another ad`);
    }
    assert.equal(page('link[href^="/imobile-ads.css"]').length, 1, `${file} must load the ad styles once`);
  }
  for (const locale of Object.keys(counts)) assert.ok(counts[locale] >= 80, `${locale} should have broad but bounded content coverage: ${counts[locale]}`);
});

test('the official tag values dispatch exactly one matching PC or SP tag', () => {
  const source = read('imobile-ads.js');
  const expected = {
    tier: { pc: { pid: 85460, mid: 596516, asid: 1945861, element: 'im-7e3ba0c55f8843139c3146cee377f750' }, sp: { pid: 85460, mid: 596517, asid: 1945863, element: 'im-b78f7a84f7b04029aab9c679261b995f' } },
    gaoden: { pc: { pid: 85460, mid: 596516, asid: 1945862, element: 'im-e346a7ea51a34ffb80d09c58b022e0b0' }, sp: { pid: 85460, mid: 596517, asid: 1945864, element: 'im-1191bf9c9abe4475b0cc1a65202c13dc' } },
    top: { pc: { pid: 85460, mid: 596516, asid: 1945881, element: 'im-b2de40dd24624feda7c4073e66f4d66a' }, sp: { pid: 85460, mid: 596517, asid: 1945884, element: 'im-f8fdf05c186048d481bc8410676ec3bb' } },
    mid: { pc: { pid: 85460, mid: 596516, asid: 1945882, element: 'im-1cc6715adbfb47e4934239edee8089e0' }, sp: { pid: 85460, mid: 596517, asid: 1945885, element: 'im-b5fcec5cb3e0465bbc985844b6cde5a6' } },
    bottom: { pc: { pid: 85460, mid: 596516, asid: 1945883, element: 'im-67f6a025c53b41889d4730e577d5b9b8' }, sp: { pid: 85460, mid: 596517, asid: 1945886, element: 'im-7b9dfd40b6774cf8bc19d10eb1ed44ea' } }
  };
  for (const [slot, byDevice] of Object.entries(expected)) for (const [device, ids] of Object.entries(byDevice)) {
    const written = [];
    vm.runInNewContext(source, {
      document: { currentScript: { dataset: { imobileSlot: slot } }, write: value => written.push(value) },
      window: { matchMedia: query => { assert.equal(query, '(max-width: 820px)'); return { matches: device === 'sp' }; } }
    });
    assert.equal(written.length, 1, `${slot}/${device} must load a single device tag`);
    assert.match(written[0], new RegExp(`pid:${ids.pid},mid:${ids.mid},asid:${ids.asid},type:"banner",display:"inline",elementid:"${ids.element}"`));
    assert.equal((written[0].match(/spot\.js/g) || []).length, 1, `${slot}/${device} must load the official script once`);
    assert.equal((written[0].match(/<script>/g) || []).length, 1, `${slot}/${device} must push one ad request`);
  }
});

test('ads.txt, privacy notice, and ad label reflect the active i-mobile setup', () => {
  const adsTxt = read('ads.txt').split(/\r?\n/);
  assert.ok(adsTxt.includes('google.com, pub-2710725734378326, DIRECT, f08c47fec0942fa0'));
  assert.ok(adsTxt.includes('adm.shinobi.jp,231656,DIRECT'));
  assert.ok(adsTxt.includes('i-mobile.co.jp, 85460, DIRECT'));
  const privacy = read('privacy/index.html');
  assert.match(privacy, /一部のページで、株式会社アイモバイルのi-mobile Ad Network広告を表示/);
  assert.match(privacy, /行動履歴情報等の取扱方針/);
  assert.match(privacy, /i-mobileのオプトアウト案内/);
  assert.equal(load(read('tata-tier/index.html'))('.imobile-ad-label').text(), '広告');
  assert.equal(load(read('tata/gaoden/index.html'))('.imobile-ad-label').text(), '広告');
});
