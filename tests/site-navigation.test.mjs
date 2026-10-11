import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';
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

test('tablet category panels reset the desktop translation in source and built CSS', () => {
  // The base stylesheet centers desktop popovers with translateX(-50%).
  // Astra extends the mobile menu to 1099px, beyond the base 820px reset.
  for (const file of ['styles/astra.pcss', 'astra.css']) {
    const css = postcss.parse(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'));
    let panel, navigation;
    css.walkAtRules('media', media => {
      if (!/max-width:\s*1099px|width\s*<=\s*1099px/.test(media.params)) return;
      media.walkRules(rule => {
        if (rule.selectors.includes('body[data-astra] .nav-category-panel')) panel = rule;
        if (rule.selectors.includes('body[data-astra] #global-navigation')) navigation = rule;
      });
    });
    assert.ok(panel, file + ': tablet panel rule missing');
    const declarations = Object.fromEntries(panel.nodes.filter(node => node.type === 'decl').map(node => [node.prop, node.value]));
    assert.equal(declarations.position, 'static', file);
    assert.equal(declarations.transform, 'none', file + ': links must remain inside the menu');
    assert.ok(navigation, file + ': mobile navigation rule missing');
    assert.equal(navigation.nodes.find(node => node.prop === 'width')?.value, 'auto', file + ': menu must fit its header container');
  }
});
