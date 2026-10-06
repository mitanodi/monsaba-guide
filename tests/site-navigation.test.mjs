import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../site.js', import.meta.url), 'utf8');
// Execute the actual initial navigation code with a minimal DOM. Later menu,
// search and analytics setup is unrelated to fragment/history highlighting.
const navigationSource = source.slice(0, source.indexOf("  const button = document.createElement('button');")) + '\n})();';
function setup(locale, path, hash) {
  const prefix = locale === 'ja' ? '' : locale === 'en' ? '/en' : '/zh-cn';
  const links = ['/', '/#tatari', '/guides/', '/boss-rally/'].map(route => ({
    href: 'https://monster-survival.com' + prefix + route,
    attributes: {},
    removeAttribute(key) { delete this.attributes[key]; },
    setAttribute(key, value) { this.attributes[key] = value; }
  }));
  const nav = { id: 'global-navigation', setAttribute() {} };
  const inner = { querySelector: () => nav };
  const header = { querySelector: selector => selector === '.header-inner' ? inner : null };
  const listeners = {};
  const location = { pathname: prefix + path, hash, href: 'https://monster-survival.com' + prefix + path + hash };
  const window = { addEventListener: (event, callback) => { listeners[event] = callback; } };
  const document = { documentElement: { lang: locale }, querySelector: () => header, querySelectorAll: () => links };
  vm.runInNewContext(navigationSource, { window, document, location, URL });
  return { links, listeners, location };
}
test('Tata fragments and back/forward update PC and mobile links without retaining Home', () => {
  for (const locale of ['ja', 'en', 'zh-CN']) {
    const { links, listeners, location } = setup(locale, '/', '#tatari');
    assert.equal(links[0].attributes['aria-current'], undefined);
    assert.equal(links[1].attributes['aria-current'], 'page');
    location.hash = '';
    listeners.popstate();
    assert.equal(links[0].attributes['aria-current'], 'page');
    assert.equal(links[1].attributes['aria-current'], undefined);
    location.hash = '#family-takepanda';
    listeners.hashchange();
    assert.equal(links[0].attributes['aria-current'], undefined);
    assert.equal(links[1].attributes['aria-current'], 'page');
  }
});
test('detail navigation and the existing exact strategy-page selection are preserved', () => {
  const detail = setup('ja', '/tata/takepanda/', '');
  assert.equal(detail.links[1].attributes['aria-current'], 'page');
  const boss = setup('ja', '/boss-rally/', '');
  assert.equal(boss.links[3].attributes['aria-current'], 'page');
  assert.equal(boss.links[0].attributes['aria-current'], undefined);
});
