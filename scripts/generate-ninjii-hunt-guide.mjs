import fs from 'node:fs';
import path from 'node:path';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';

const root = path.resolve(import.meta.dirname, '..');
const route = '/guides/ninjii-hunt/';
const title = '【モンサバ】ニンジィ探し攻略｜長方形マップを狙う2つの方法';
const description = 'モンサバのニンジィ探しで長方形マップを狙う2つの方法を紹介。フレンド0人と、初期マップで止めたサブアカウントを活用する手順・注意点・6個獲得の実例を整理します。';
const updated = '2026-09-17';
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
const crumbs = [{ label:'トップ', href:'/' }, { label:'攻略ハブ', href:'/guides/' }, { label:'ニンジィ探し攻略' }];
const articleSchema = {
  '@type':'Article', '@id':`${absoluteUrl(route)}#article`, headline:title, description,
  datePublished:updated, dateModified:updated, inLanguage:'ja',
  author:{ '@type':'Person', name:'おぢ', url:absoluteUrl('/about/') },
  publisher:{ '@id':'https://monster-survival.com/#website' }, mainEntityOfPage:absoluteUrl(route)
};

const body = `<section class="wrap static-section prose-page ninjii-guide">
  <p class="article-byline">管理人：<a href="/about/">おぢ</a>　公開日：<time datetime="${updated}">2026年9月17日</time></p>
  <div class="summary-box"><strong>先に結論</strong><p>長方形マップを狙う方法は、①ゲーム内フレンドを0人にする、②初期マップで止めたサブアカウントをフレンドに増やす、の2つです。フレンドを全員解除したくない人は方法②を候補にできます。</p></div>
  <p>ニンジィ探しで「マップが広くて探しにくい」「もっと効率よく集めたい」と感じていませんか？</p>
  <p>今回は、管理人おぢが実戦で利用している、<strong>長方形マップを狙ってニンジィを探す方法</strong>を紹介します。</p>
  <div class="alert-box"><strong>情報の位置付け</strong><p>本記事の方法は、管理人が現在のゲームバージョンで実際に試し、長方形マップへ入れることを確認した実戦情報です。ただし運営が公開した恒久仕様ではないため、今後のアップデートやマッチング方法の変更によって使えなくなる可能性があります。「固定」はマップ形状を指し、ニンジィの位置が毎回同じという意味ではありません。</p></div>
  <nav class="guide-panel" aria-label="この記事の目次"><h2>目次</h2><ol class="number-list"><li><a href="#difference">2つの方法の違い</a></li><li><a href="#method-zero">方法① フレンド0人</a></li><li><a href="#method-sub">方法② 初期サブ活用</a></li><li><a href="#example-six">6個獲得の実例</a></li><li><a href="#notes">注意点と未確認事項</a></li></ol></nav>

  <h2 id="difference" class="page-h2">2つの方法の違い</h2>
  <div class="table-wrap"><table class="zombie-table"><thead><tr><th>方法</th><th>フレンドの扱い</th><th>準備</th><th>狙い</th></tr></thead><tbody><tr><th>フレンド0人</th><td>現在のフレンドを全員解除</td><td>必要な相手の名前やUIDを控える</td><td>フレンド0人の状態で長方形マップを狙う</td></tr><tr><th>初期サブを増やす</th><td>普段のフレンドを残すことも可能</td><td>初期マップで止めたサブアカウントを複数準備</td><td>初期マップの相手に当たる機会を増やす</td></tr></tbody></table></div>
  <p>フレンド関係を整理しても問題ないなら方法①、今のフレンドを残したいなら方法②が候補です。方法②はサブアカウントを準備する手間がかかります。</p>

  <h2 id="method-zero" class="page-h2">方法①：フレンドを0人にする</h2>
  <h3>1. 全解除する前に、必要な相手の情報を控える</h3><p>この方法ではゲーム内のフレンドを全員解除します。またつながりたい相手がいる場合は、名前やUIDを控え、必要に応じて事前に事情を伝えてください。控えを残してもフレンド関係を自動で復元できるわけではありません。大切なフレンドがいる人は、無理に全解除する必要はありません。</p>
  <h3>2. フレンド0人の状態で挑戦する</h3><p>フレンドが0人になっていることを確認してニンジィ探しに挑戦します。管理人の環境では、この状態で長方形マップとマッチしました。まずは自分の環境でも同じ形のマップが出るか確認してください。</p>
  <h3>3. 長方形マップでニンジィを探す</h3><p>管理人の実戦では、普段の広いマップより探しやすく、基本的に4個以上を取れるという感触があります。ただし、試行回数や平均獲得数を集計した数値ではなく、獲得数を保証するものでもありません。</p>

  <h2 id="method-sub" class="page-h2">方法②：初期マップのサブアカウントをフレンドに増やす</h2>
  <p><strong>「フレンドを全員消したくない」という場合の代替方法</strong>です。メインアカウントのフレンドに、初期マップで止めたサブアカウントを複数登録します。</p>
  <h3>1. サブアカウントを初期マップの段階で止める</h3><p>目安は、所持タタが2～3体程度の、ゲームをほとんど進めていない状態です。ここから育成や進行を進めず、初期マップのまま残します。ただし、所持タタ2～3体が厳密な必要十分条件だと確認できているわけではありません。</p>
  <p>サブアカウントを利用する場合は、ゲームのアカウント利用ルールを確認し、メインアカウントのデータを削除・上書きしないよう注意してください。</p>
  <h3>2. メインアカウントとのフレンド登録を済ませる</h3><p>初期マップのサブアカウントと、メインアカウントのフレンド登録を成立させます。登録後はサブアカウントを進めず、その後ログインしない運用で初期状態を残します。ログインしないこと自体がマッチングの必須条件だと確認できているわけではありません。</p>
  <h3>3. 初期マップのフレンドを複数増やす</h3><p>同じように初期マップで止めた相手を複数登録し、フレンド一覧の中で初期マップの相手が多い構成を作ります。必要に応じて通常のフレンドを一部減らす調整もありますが、全員解除はこの方法の前提ではありません。</p>
  <p>管理人が狙っているのは、普段のフレンドより初期マップの相手を多くするなどして、<strong>その相手に当たる機会を増やすこと</strong>です。フレンドの選出方法や重み付けは未確認なので、人数の割合をそのままマッチ率として計算することはできません。</p>
  <h3>4. 相手とマップを確認する</h3><p>ニンジィ探しに挑戦し、初期状態のサブアカウントとマッチした際に長方形マップになるか確認します。通常のフレンドが残っていれば、そちらに当たる場合もあります。サブアカウントを登録しただけで、すべての挑戦が長方形マップになるという意味ではありません。</p>

  <figure class="ninjii-evidence"><img src="/assets/guides/ninjii-hunt/rectangular-map.jpg" width="590" height="1280" loading="lazy" decoding="async" alt="ニンジィ探しで確認した長方形マップの実例"><figcaption>管理人が現在のバージョンで確認した長方形マップ</figcaption></figure>

  <h2 id="example-six" class="page-h2">実際の結果：ニンジィ6個</h2>
  <p>管理人が実際に試した結果、長方形マップでニンジィを6個発見できました。ニンジィ探しで一度に発見できる上限は6個です。</p>
  <figure class="ninjii-evidence"><img src="/assets/guides/ninjii-hunt/six-carrots-result.jpg" width="590" height="1280" loading="lazy" decoding="async" alt="ニンジィを上限の6個発見した結果画面"><figcaption>ニンジィを上限の6個発見した実戦結果</figcaption></figure>

  <h2 id="notes" class="page-h2">注意点と未確認事項</h2>
  <ul class="plain-list"><li>方法ごとの試行回数・平均獲得数・4個以上取れた割合は未集計です。</li><li>フレンド数とマッチ率の具体的な関係、候補が同じ確率で選ばれるかは未確認です。</li><li>初期マップ判定の厳密な条件、所持タタ2～3体や未ログイン状態が必須かは未確認です。</li><li>現在のゲームバージョンでは管理人が実証済みですが、今後のアップデートで使えなくなる可能性があります。</li></ul>

  <h2 class="page-h2">まとめ</h2><p>ニンジィ探しをやりやすくするために管理人が狙っているのは、長方形マップです。フレンドを0人にする方法に加え、フレンドを残したい人は初期マップで止めたサブアカウントを複数登録する方法を候補にできます。</p>
  <p>試した方は「どちらの方法を使ったか」「どんなマップに当たったか」「何個見つかったか」を、スクリーンショットと一緒に教えてもらえると助かります。長方形マップにならなかった例も含めて情報を集め、記事の精度を上げます。</p>
  <div class="attribute-guide-nav"><a href="/guides/">攻略ハブへ戻る</a><a href="/beginner-guide/">初心者ガイドを見る</a><a href="/board/">攻略情報を共有する</a></div>
</section>
<section class="wrap article-comments" data-article-comments="ninjii-hunt" aria-labelledby="article-comments-title"><h2 id="article-comments-title">この記事へのコメント</h2><p>この方法を試した結果や、アップデート後の変化を共有できます。個人情報は書き込まないでください。</p><div data-comment-list aria-live="polite"><p>コメントを読み込んでいます…</p></div><form class="article-comment-form"><input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><label>名前（任意）<input name="name" maxlength="30" autocomplete="nickname"></label><label>コメント<textarea name="content" maxlength="500" rows="4" required></textarea></label><button class="button" type="submit">コメントする</button><p data-comment-status class="tool-status" role="status" aria-live="polite"></p></form></section>
<section class="wrap source-note"><strong>根拠と確認状態</strong><p>方法①・方法②、現在のバージョンでの再現、ニンジィ6個の上限：2026年9月17日に受け取った管理人おぢの実戦確認と提供画像。将来のアップデート後の継続可否、公式のマッチング条件、試行回数、平均、マッチ率は未確認・未集計です。</p><a href="/about-data/">データ方針を見る</a></section>`;

const graph = [articleSchema, breadcrumbSchema(crumbs)];
const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({ title, description, route, robots:'index,follow,max-image-preview:large' })}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="manifest" href="/site.webmanifest"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${safeJsonLd({ '@context':'https://schema.org', '@graph':graph })}</script></head><body data-page-type="article"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero"><div class="wrap">${renderBreadcrumb(crumbs)}<div class="family-page-head"><div><span class="visible-kicker">管理人の実戦情報・非公式攻略</span><h1>${esc(title.replace(/^【モンサバ】/,''))}</h1><p>${esc(description)}</p></div></div></div></section>${body}</main>${renderFooter('ニンジィ探し攻略')}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js" defer></script><script src="/article-comments.js" defer></script></body></html>`;

const output = path.join(root, route.slice(1), 'index.html');
fs.mkdirSync(path.dirname(output), { recursive:true });
fs.writeFileSync(output, html);

function replaceBlock(relative, marker, content, before) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  const start = `<!-- NINJII:${marker}:START -->`, end = `<!-- NINJII:${marker}:END -->`;
  const block = `${start}${content}${end}`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`);
  if (pattern.test(source)) source = source.replace(pattern, block);
  else if (source.includes(before)) source = source.replace(before, `${block}${before}`);
  else throw new Error(`${relative}: insertion target not found`);
  fs.writeFileSync(file, source);
}

replaceBlock('guides/index.html','GUIDES','<section class="wrap static-section"><div class="summary-box"><strong>ニンジィ探し攻略を追加</strong><p>長方形マップを狙う「フレンド0人」と「初期マップのサブアカウント活用」の2つを、未確認条件と分けて解説します。</p><a class="ghost-button" href="/guides/ninjii-hunt/">ニンジィ探し攻略を見る</a></div></section>','</main>');
replaceBlock('beginner-guide/index.html','BEGINNER','<section class="wrap static-section"><div class="summary-box"><strong>イベント攻略：ニンジィ探し</strong><p>フレンドを全員解除したくない場合の代替方法も含め、長方形マップを狙う手順を確認できます。</p><a class="ghost-button" href="/guides/ninjii-hunt/">ニンジィ探し攻略を見る</a></div></section>','<section class="wrap source-note">');
replaceBlock('updates/index.html','UPDATES',`<article class="update-entry"><time datetime="${updated}">2026年9月17日</time><h2>ニンジィ探しの実戦攻略記事を追加</h2><p>管理人の実戦報告をもとに、長方形マップを狙う2つの方法と未確認条件を整理しました。</p><p><a class="ghost-button" href="/guides/ninjii-hunt/">記事を見る</a></p></article>`,'</section>');
replaceBlock('privacy/index.html','ARTICLE-COMMENTS','<h2 class="page-h2">記事コメント欄</h2><p>実戦攻略記事のコメント欄では、任意の名前・コメント本文・投稿日時を保存し、公開します。個人情報を書き込まないでください。生のIPアドレスは保存せず、不可逆化した識別値を投稿間隔の制御に利用します。自分のコメントを削除するための情報は利用中のブラウザ内に保存します。</p>','<h2 class="page-h2">Google Analyticsについて</h2>');

console.log(`ニンジィ探し攻略を生成しました: ${route}`);
