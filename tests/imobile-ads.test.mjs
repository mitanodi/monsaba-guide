import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('only the requested Japanese routes receive one inline i-mobile slot at a content break', () => {
  const tier = load(read('tata-tier/index.html'));
  const gaoden = load(read('tata/gaoden/index.html'));
  assert.equal(tier('.imobile-ad-slot').length, 1);
  assert.equal(tier('#mode-normal > p + .imobile-ad-slot').length, 1);
  assert.equal(tier('.imobile-ad-slot').closest('.ninja-admax-slot').length, 0);
  assert.equal(tier('.imobile-ad-slot script[src^="/imobile-ads.js"]').attr('data-imobile-slot'), 'tier');
  assert.equal(gaoden('.imobile-ad-slot').length, 1);
  assert.equal(gaoden('section:has(> h2:contains("進化すると何が変わる？")) + .imobile-ad-slot').length, 1);
  assert.equal(gaoden('.imobile-ad-slot').closest('.ninja-admax-slot').length, 0);
  assert.equal(gaoden('.imobile-ad-slot script[src^="/imobile-ads.js"]').attr('data-imobile-slot'), 'gaoden');
  for (const file of ['en/tata-tier/index.html', 'zh-cn/tata-tier/index.html', 'en/tata/gaoden/index.html', 'zh-cn/tata/gaoden/index.html']) {
    assert.equal(load(read(file))('.imobile-ad-slot,script[src^="/imobile-ads.js"],link[href^="/imobile-ads.css"]').length, 0, file);
  }
  assert.equal(tier('link[href^="/imobile-ads.css"]').length, 1);
  assert.equal(gaoden('link[href^="/imobile-ads.css"]').length, 1);
});

test('the official tag values dispatch exactly one matching PC or SP tag', () => {
  const source = read('imobile-ads.js');
  const expected = {
    tier: { pc: { pid: 85460, mid: 596516, asid: 1945861, element: 'im-7e3ba0c55f8843139c3146cee377f750' }, sp: { pid: 85460, mid: 596517, asid: 1945863, element: 'im-b78f7a84f7b04029aab9c679261b995f' } },
    gaoden: { pc: { pid: 85460, mid: 596516, asid: 1945862, element: 'im-e346a7ea51a34ffb80d09c58b022e0b0' }, sp: { pid: 85460, mid: 596517, asid: 1945864, element: 'im-1191bf9c9abe4475b0cc1a65202c13dc' } }
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
  assert.match(privacy, /一部の日本語ページで、株式会社アイモバイルのi-mobile Ad Network広告を表示/);
  assert.match(privacy, /行動履歴情報等の取扱方針/);
  assert.match(privacy, /i-mobileのオプトアウト案内/);
  assert.equal(load(read('tata-tier/index.html'))('.imobile-ad-label').text(), '広告');
  assert.equal(load(read('tata/gaoden/index.html'))('.imobile-ad-label').text(), '広告');
});
