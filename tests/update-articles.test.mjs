import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const route = '/updates/2026-10-21-test-preview/';
for (const [prefix, locale, warning] of [['', 'ja', '本番実装は未確認'], ['/en', 'en', 'Live implementation is unconfirmed'], ['/zh-cn', 'zh-CN', '正式服实装尚未确认']]) {
  test(`October preview has localized status, dated evidence and complete navigation: ${locale}`, () => {
    const $ = load(read(`${prefix.slice(1)}${prefix ? '/' : ''}${route.slice(1)}index.html`));
    assert.equal($('html').attr('lang'), locale);
    assert.match($('.update-article-warning').text(), new RegExp(warning));
    assert.equal($('meta[name="robots"]').attr('content'), 'noindex,follow');
    assert.equal($('link[rel="canonical"]').attr('href'), `https://monster-survival.com${prefix}${route}`);
    assert.equal($('link[rel="alternate"][hreflang]').length, 4);
    const article = JSON.parse($('script[type="application/ld+json"]').first().text())['@graph'].find(x => x['@type'] === 'Article');
    assert.equal(article.datePublished, '2026-10-14', 'The tentative release day is not the article publication day');
    for (const id of ['new-tata', 'season3', 'halloween', 'collection', 'balance', 'prepare', 'sources']) {
      assert.equal($(`#${id}`).length, 1);
      assert.equal($(`.update-article-toc a[href="#${id}"]`).length, 1);
    }
    assert.equal($('.update-article-table tbody tr').length, 4);
    assert.equal($('.update-article-table [lang="ja"]').length, 24);
    assert.equal($('#sources a').attr('rel'), 'noopener noreferrer');
    assert.equal($('.update-related a').last().attr('href'), `${prefix}/updates/`);
    const home = load(read(prefix ? prefix.slice(1) + '/index.html' : 'index.html'));
    assert.equal(home(`.update-news a[href="${prefix}${route}"]`).length, 1);
    assert.equal(home('.astra-home-reference .update-news').length, 0, 'Latest update should not be hidden in collapsed home information');
    const hub = load(read(prefix ? prefix.slice(1) + '/updates/index.html' : 'updates/index.html'));
    assert.equal(hub('#game-updates .update-news-card').length, 5);
    assert.equal(hub('#game-updates a').first().attr('href'), prefix + route);
    assert.ok(hub(`a[href="${prefix}/updates/2026-08-26/"]`).length, 'Old update articles stay reachable');
  });
}
test('Preview is not copied into live gameplay records', () => {
  for (const file of ['data/tatari.json', 'data/tata-skills.json', 'data/tier-ratings.json', 'data/zombie-rush/chips.json']) assert.ok(!read(file).includes('シャイプ'), file);
  assert.equal(JSON.parse(read('data/update-articles.json')).latest.dateStatus, 'tentative');
});
