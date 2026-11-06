import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import postcss from 'postcss';
import { load } from 'cheerio';
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

const searchSource = fs.readFileSync(new URL('../search/search.js', import.meta.url), 'utf8');
const chips = JSON.parse(fs.readFileSync(new URL('../data/zombie-rush/chips.json', import.meta.url), 'utf8')).chips;
for (const locale of ['ja', 'en', 'zh-CN']) {
  test(`${locale} site search resolves every chip alias to its localized label, effect and stable destination`, async () => {
    const prefix = locale === 'en' ? '/en' : locale === 'zh-CN' ? '/zh-cn' : '';
    const nodes = new Map();
    const node = selector => {
      if (!nodes.has(selector)) nodes.set(selector, { value: '', innerHTML: '', textContent: '', attributes: {}, setAttribute(key, value) { this.attributes[key] = value; }, addEventListener() {} });
      return nodes.get(selector);
    };
    const data = {
      '/data/tatari.json': { families: [] }, '/data/tata-skills.json': {},
      '/data/tier-ratings.json': {}, '/data/zombie-rush/chips.json': { chips },
      '/data/evolution-trials.json': { families: [] }, '/data/tata-images.json': { families: [] }
    };
    const urls = [], context = vm.createContext({
      document: { documentElement: { lang: locale }, body: { dataset: { locale } }, querySelector: node },
      window: {}, location: { href: `https://monster-survival.com${prefix}/search/?q=private` },
      history: { replaceState: (_state, _title, url) => urls.push(String(url)) }, URL, console,
      fetch: async url => ({ ok: true, json: async () => data[url] }), ATTRIBUTE_META: {},
      MONSABA_FAMILY: { getFamilyDisplayLabel() {}, getFamilySearchAliases: () => [], getTataDisplayName() {}, getEvolutionChain() {}, getJapaneseSecondaryLabel() {} }
    });
    vm.runInContext(searchSource + '\nglobalThis.searchForTest = runSearch;', context);
    await new Promise(resolve => setImmediate(resolve));
    for (const chip of chips) {
      for (const alias of new Set(Object.values(chip.name))) {
        context.searchForTest(alias);
        const $ = load(node('#searchResults').innerHTML);
        const card = $(`[data-search-chip-id="${chip.id}"]`);
        assert.equal(card.length, 1, `${chip.id}: ${alias}`);
        assert.equal(card.find('b').text(), chip.name[locale] || chip.name.ja);
        assert.equal(card.find('b').attr('translate'), 'no', 'whole names must not be partially translated');
        assert.equal(card.find('[data-chip-effect]').text(), `Rank ${chip.rarity} / ${chip.effect[locale] || chip.effect.ja}`);
        assert.equal(card.attr('href'), `${prefix}/zombie-rush/chips/`);
        assert.equal(card.find('[data-chip-name-fallback]').length, locale !== 'ja' && chip.nameLocalizationStatus?.[locale] !== 'official-source-confirmed' ? 1 : 0);
        assert.equal(node('#searchStatus').attributes.translate, 'no');
        const heading = $('.search-result-section h2').filter((_, el) => $(el).next().find(`[data-search-chip-id="${chip.id}"]`).length).text();
        assert.ok(heading.includes({ja:'ゾンビラッシュチップ',en:'Zombie Rush chips','zh-CN':'僵尸突袭芯片'}[locale]));
        if(locale!=='ja')assert.ok(!heading.includes('件'));
      }
    }
    for (const [id, query] of [['slack-off', '强制进入自动战斗模式'], ['boss-killer', 'Damage dealt to boss zombies']]) {
      context.searchForTest(query);
      assert.equal(load(node('#searchResults').innerHTML)(`[data-search-chip-id="${id}"]`).length, 1);
    }
    assert.ok(urls.every(url => new URL(url).searchParams.get('q') === null), 'queries stay out of result URLs');
  });
}
