import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { load } from 'cheerio';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('ニンジィ探し記事は2つの方法と重要条件を区別して掲載する', () => {
  const html = read('guides/ninjii-hunt/index.html');
  const $ = load(html);
  assert.equal($('h1').text().trim(), 'ニンジィ探し攻略｜長方形マップを狙う2つの方法');
  for (const id of ['difference','method-zero','method-sub','example-six','notes']) assert.equal($(`#${id}`).length, 1, id);
  for (const text of ['フレンドを0人','所持タタが2～3体程度','初期マップで止めた相手を複数登録','全員解除はこの方法の前提ではありません','アカニンジィ×6','99.5%のプレイヤーを上回りました']) assert.match($.text(), new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')), text);
  assert.doesNotMatch($.text(), /必ず4個以上|100%|初期サブの人数÷全フレンド数/);
  assert.equal($('link[rel="canonical"]').attr('href'), 'https://monster-survival.com/guides/ninjii-hunt/');
  assert.equal($('meta[name="robots"]').attr('content'), 'index,follow,max-image-preview:large');
  assert.ok($('script[type="application/ld+json"]').text().includes('Article'));
});

test('記事への内部リンク・検索語・更新履歴が生成される', () => {
  for (const file of ['guides/index.html','beginner-guide/index.html','updates/index.html']) assert.match(read(file), /href="\/guides\/ninjii-hunt\/"/, file);
  const search = read('search/search.js');
  for (const keyword of ['ニンジィ','ニンジイ','長方形マップ']) assert.match(search, new RegExp(keyword));
  assert.match(read('sitemap.xml'), /https:\/\/monster-survival\.com\/guides\/ninjii-hunt\//);
});

test('記事は3言語で自己canonicalとhreflangを持つ', () => {
  for (const [prefix,lang] of [['','ja'],['en/','en'],['zh-cn/','zh-CN']]) {
    const $ = load(read(`${prefix}guides/ninjii-hunt/index.html`));
    assert.equal($('html').attr('lang'), lang);
    assert.equal($('link[rel="canonical"]').attr('href'), `https://monster-survival.com/${prefix}guides/ninjii-hunt/`);
    assert.equal($('link[hreflang]').length, 4);
  }
});
