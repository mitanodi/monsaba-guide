import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {load} from 'cheerio';
import {playerFacingHtml} from '../lib/public-copy.mjs';
const read=file=>fs.readFileSync(new URL('../'+file,import.meta.url),'utf8');

test('public copy removes provenance and empty frames while preserving game values, uncertainty, credits and ad slots',()=>{
 const before='<!doctype html><html lang="ja"><head><title>Example</title></head><body><nav><select><option selected>ja</option></select></nav><main><section class="source-note"><h2>参考情報</h2><p>当サイトで一次証拠と外部情報を区別して独自に整理した内容です。</p><ul class="source-list"><li><a href="https://w.atwiki.jp/monstersurvival/pages/128.html">Wiki</a></li></ul><aside data-admax-slot="kept"><script>window.ad=true;</script></aside></section><details class="source-details"><summary>外部攻略資料の効果数値</summary><p>燃焼20%、1秒ごと、5秒持続</p><p>効果数値は資料に未掲載。</p></details><p class="tier-contributor">作成：始祖 <a href="https://x.com/twx84">X</a></p></main><footer class="footer-disclosures">公式Creator Assetsのクレジットと注意書き</footer></body></html>';
 const after=playerFacingHtml(before,'example/index.html'),q=load(after);
 assert.equal(q('main a[href*=atwiki],main .source-list,main .source-note').length,0);
 assert(!q('main').text().includes('独自に整理'));
 assert(q('main').text().includes('燃焼20%、1秒ごと、5秒持続'));
 assert(q('main').text().includes('効果数値は未確認。'));
 assert.equal(q('[data-admax-slot="kept"] script').html(),'window.ad=true;');
 assert.equal(q('.tier-contributor a').attr('href'),'https://x.com/twx84');
 assert(after.includes('<footer class="footer-disclosures">公式Creator Assetsのクレジットと注意書き</footer>'));
 assert.equal(playerFacingHtml(after,'example/index.html'),after);
});

test('privacy notices are unchanged and all three public chip pages omit the withdrawn editorial and permission claims',()=>{
 for(const prefix of ['', 'en/', 'zh-cn/']){
  const file=prefix+'privacy/index.html',html=read(file);assert.equal(playerFacingHtml(html,file),html);
  const q=load(read(prefix+'zombie-rush/chips/index.html'));
  assert.equal(q('main .source-list,main .page-freshness,main .chip-supplement-note,main a[href*=atwiki]').length,0);
  assert(!/通常スキルとは別|おすすめTierは実戦根拠|This database is separate from normal|without sufficient battle evidence|本数据库与塔塔普通技能分开保存|实战证据不足|許可取得済み|掲載許可確認済み|images are withheld|image reuse permission/i.test(q('main').text()));
  assert(q('.footer-disclosures').text().length>60);
 }
});

test('all three makers start with the direct picker in reading order and preserve existing board/settings controls',()=>{
 for(const prefix of ['', 'en/', 'zh-cn/']){
  const q=load(read(prefix+'team-builder/index.html'));
  assert(q('.formation-workspace').children().first().is('.formation-picker'));
  assert.equal(q('[data-team-picker-open]').length,0);
  assert.equal(q('[data-team-picker-return]').length,1);
  assert.equal(q('section[aria-labelledby="team-help-title"]').length,0);
  assert(q('#team-help-title').is('[hidden]'));
  assert.equal(q('main .page-hero .visible-kicker,main .page-hero .family-page-head > div > p').length,0);
  for(const selector of ['#team-mode','#team-board','#team-picker-search','#team-save','#team-share','#team-image'])assert.equal(q(selector).length,1,selector);
 }
});

test('a regenerated operator-policy section cannot accumulate after public copy cleanup',()=>{
 const section='<section class="wrap source-note"><strong>運営者について</strong><p>運営者とサイト全体の作成方針は<a href="/about/">サイトについて</a>をご覧ください。</p></section>';
 const html='<html lang="ja"><head></head><body><main><h1>ゲーム素材</h1><section><h2>公式クリエイター素材</h2><p>ゲーム運営より提供された素材を使用しています。</p></section>'+section+section+'</main><footer>Credit</footer></body></html>';
 const clean=playerFacingHtml(html,'about-data/index.html');
 assert(!load(clean)('main').text().includes('サイト全体の作成方針'));
 assert.equal(playerFacingHtml(clean,'about-data/index.html'),clean);
 assert.equal(playerFacingHtml(clean.replace('</main>',section+'</main>'),'about-data/index.html'),clean);
 assert(load(clean)('main').text().includes('ゲーム運営より提供された素材'));
});
