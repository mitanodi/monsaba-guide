import fs from 'node:fs';
import path from 'node:path';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dojoData = JSON.parse(fs.readFileSync(path.join(root, 'data/community-dojo.json'), 'utf8'));
const esc = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const write = (route, html) => {
  const directory = path.join(root, route.slice(1));
  const withIcons = html.replace(
    '<link rel="icon" href="/favicon.ico" sizes="any">',
    '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">',
  );
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), withIcons);
};
const inject = (file, marker, html) => {

  const target = path.join(root, file);

  let source = fs.readFileSync(target, 'utf8');

  const block = `<!-- COMMUNITY:${marker}:START -->${html}<!-- COMMUNITY:${marker}:END -->`;

  const pattern = new RegExp(`<!-- COMMUNITY:${marker}:START -->[\\s\\S]*?<!-- COMMUNITY:${marker}:END -->`);

  source = pattern.test(source) ? source.replace(pattern, block) : source.replace('</main>', `${block}</main>`);

  fs.writeFileSync(target, source);

};
const shell = ({ route, title, description, robots = 'index,follow,max-image-preview:large', body, type = 'CollectionPage', mode = 'zombie' }) => {
  const label = title.split('｜')[0];

  const crumbs = [{ label: 'トップ', href: '/' }, { label: '編成メーカー', href: '/team-builder/' }, { label }];
  const graph = [{
    '@type': type,
    '@id': absoluteUrl(route),
    url: absoluteUrl(route),
    name: label,
    description,
    inLanguage: 'ja',
    dateModified: mode !== 'zombie' ? '2026-11-04' : '2026-09-04'
  }, breadcrumbSchema(crumbs)];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({ title, description, route, robots })}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/team-builder/community/community.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script></head><body data-locale="ja" data-page-type="community" data-community-mode="${mode}"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero"><div class="wrap">${renderBreadcrumb(crumbs)}<div class="family-page-head"><div><span class="visible-kicker">プレイヤー投稿・結果は自己申告</span><h1>${label}</h1><p>${description}</p></div><a class="button" href="/team-builder/${mode === 'normal' ? '?mode=normal&chapter=1' : mode === 'dojo' ? '?mode=dojo&attribute=fire&floor=1' : ''}"${mode !== 'zombie' ? ' data-chapter-builder' : ''}>編成を作る</a></div></div></section><nav class="wrap community-mode-nav" aria-label="編成掲示板の種類"><a href="/team-builder/community/chapters/"${mode === 'normal' ? ' aria-current="page"' : ''}>チャプター別編成</a><a href="/team-builder/community/dojo/"${mode === 'dojo' ? ' aria-current="page"' : ''}>道場の編成掲示板</a><a href="/team-builder/community/"${mode === 'zombie' && type === 'CollectionPage' ? ' aria-current="page"' : ''}>ゾンビラッシュ編成</a></nav>${body}</main>${renderFooter('Community投稿は公式情報・当サイト評価と分離')}<script src="/family-display.js"></script><script src="/site.js"></script><script type="module" src="/team-builder/community/community.js"></script><script src="/growth.js" defer></script></body></html>`;
};

write('/team-builder/community/', shell({
  route: '/team-builder/community/',
  title: 'みんなのゾンビラッシュ編成｜投稿・検索・読み込み',
  description: 'プレイヤーが作成したゾンビラッシュ編成を検索し、P1/P2・Tier・Lv・チップ・上限設定ごと編成メーカーへ読み込めます。',
  body: `<section class="wrap static-section"><div class="notice-box"><h2>みんなの編成について</h2><p>クリア状況や結果は、特別な表記がない限り投稿者・利用者による申告です。育成状況や操作によって結果は変わります。公式おすすめではありません。</p></div><section id="community-publish-panel" class="community-panel" aria-labelledby="community-publish-title"><div class="section-head simple-head"><h2 id="community-publish-title">編成を投稿</h2><button id="community-publish-toggle" class="button" type="button">投稿フォームを開く</button></div><p id="community-draft-status">編成メーカーで作った編成を投稿できます。</p><form id="community-publish-form" class="community-form" hidden><input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><label>タイトル<input name="title" maxlength="80" required placeholder="例：難易度1 Round20まで到達した編成"></label><label>投稿者名（任意）<input name="authorDisplayName" maxlength="30" autocomplete="nickname"></label><div class="community-form-row"><label>Season<select name="seasonId"><option value="season-1">Season 1</option></select></label><label>難易度<select name="difficulty"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label><label>結果<select name="resultStatus"><option value="untested">未検証</option><option value="challenging">挑戦中</option><option value="round">最高Round</option><option value="cleared">クリア（投稿者申告）</option></select></label><label>最高Round<input name="highestRound" type="number" min="0" max="25" value="0"></label></div><fieldset><legend>自己申告タグ（最大5）</legend><div id="community-tag-options" class="community-tag-options"></div></fieldset><label>短い補足（任意）<textarea name="note" maxlength="300" rows="3"></textarea></label><label class="privacy-chip"><input name="agreement" type="checkbox" required> 投稿内容がプレイヤー申告として公開されることを確認しました</label><button class="button" type="submit">この編成を投稿</button><p id="community-publish-status" class="tool-status" role="status" aria-live="polite"></p></form></section><section class="community-panel" aria-labelledby="community-list-title"><h2 id="community-list-title">投稿された編成</h2><form id="community-filters" class="community-filters"><label>Season<select name="seasonId"><option value="">すべて</option><option value="season-1">Season 1</option></select></label><label>難易度<select name="difficulty"><option value="">すべて</option><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label>結果<select name="resultStatus"><option value="">すべて</option><option value="untested">未検証</option><option value="challenging">挑戦中</option><option value="round">最高Round</option><option value="cleared">クリア申告</option></select></label><label>タグ<select name="tag" id="community-tag-filter"><option value="">すべて</option></select></label><label>並び順<select name="sort"><option value="new">新着</option><option value="helpful">参考になった</option><option value="trials">試行報告が多い</option><option value="clears">クリア報告が多い</option><option value="round">最高Round</option></select></label><button class="ghost-button" type="submit">絞り込む</button></form><div id="community-list" class="community-list" aria-live="polite"><p>読み込み中…</p></div><button id="community-more" class="ghost-button" type="button" hidden>さらに読み込む</button></section><section class="source-note"><strong>データの区分</strong><p>編成・結果・コメントは<code>community_user</code>として保存し、公式情報、ゲーム内確認、当サイト独自Tierとは混ぜません。投稿本文や編成内容をAnalyticsへ送信しません。</p><a href="/about-data/">データ方針を見る</a></section></section>`
}));

const chapterPage = {
  route: '/team-builder/community/chapters/',
  title: 'チャプター別編成掲示板｜通常ステージの攻略編成',
  description: '通常ステージのチャプターごとに、プレイヤーの攻略編成とクリア報告を探せます。気になる配置を編成メーカーに読み込み、自分の手持ちで試して投稿できます。',
  mode: 'normal',
  body: `<section class="wrap static-section chapter-community"><div class="community-flow" aria-label="編成掲示板の使い方"><span><b>1</b> チャプターを選ぶ</span><span><b>2</b> 編成を読み込んで試す</span><span><b>3</b> 自分の編成・結果を投稿</span></div><section id="community-chapter-browser" class="community-chapter-browser" aria-labelledby="community-chapter-title"><div><span class="visible-kicker">通常ステージ</span><h2 id="community-chapter-title">チャプターを選ぶ</h2><p>ステージ番号で探して、編成メーカーで組んでみよう。</p></div><form id="community-chapter-form" class="community-chapter-form"><label for="community-chapter-number">チャプター番号</label><div><input id="community-chapter-number" name="chapter" type="number" inputmode="numeric" min="1" max="9999" value="1" required><button class="button" type="submit">このチャプターを見る</button></div></form><nav class="community-chapter-actions" aria-label="チャプター移動"><a id="community-chapter-prev" class="ghost-button" href="?chapter=1">前のチャプター</a><a id="community-chapter-next" class="ghost-button" href="?chapter=2">次のチャプター</a><button id="community-chapter-copy" class="ghost-button" type="button">このチャプターを共有</button></nav><p id="community-chapter-share-status" class="tool-status" role="status" aria-live="polite"></p></section><div class="community-chapter-cta"><div><h2>このチャプターの編成を作る</h2><p>配置と進化段階を選び、攻略の工夫を共有しよう。</p></div><a class="button" href="/team-builder/?mode=normal&chapter=1" data-chapter-builder>編成メーカーで作る</a></div><section id="community-publish-panel" class="community-panel" aria-labelledby="community-publish-title"><div class="section-head simple-head"><h2 id="community-publish-title">編成を投稿</h2><button id="community-publish-toggle" class="button" type="button">投稿フォームを開く</button></div><p id="community-draft-status">編成メーカーで作った通常編成を投稿できます。</p><form id="community-publish-form" class="community-form" hidden><input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input name="chapter" type="hidden" value="1"><label>タイトル<input name="title" maxlength="80" required placeholder="例：ボスまで安定して進めた編成"></label><label>投稿者名（任意）<input name="authorDisplayName" maxlength="30" autocomplete="nickname"></label><div class="community-form-row"><label>開始ステージ（任意）<input name="stageFrom" type="number" inputmode="numeric" min="1" max="9999" placeholder="例：1"></label><label>終了ステージ（任意）<input name="stageTo" type="number" inputmode="numeric" min="1" max="9999" placeholder="例：4"></label><label>結果<select name="resultStatus"><option value="untested">未検証</option><option value="challenging">挑戦中</option><option value="cleared">クリア（投稿者申告）</option></select></label></div><p class="section-note">ステージ番号はチャプター内の番号です。範囲を指定しなければ、チャプター全体の編成として掲載します。</p><fieldset><legend>自己申告タグ（最大5）</legend><div id="community-tag-options" class="community-tag-options"></div></fieldset><label>攻略メモ（任意）<textarea name="note" maxlength="300" rows="4" placeholder="育成状況、入れ替え候補、操作のコツなど"></textarea></label><label class="privacy-chip"><input name="agreement" type="checkbox" required> 投稿内容がプレイヤー申告として公開されることを確認しました</label><button class="button" type="submit">この編成を投稿</button><p id="community-publish-status" class="tool-status" role="status" aria-live="polite"></p></form></section><section class="community-panel" aria-labelledby="community-list-title"><h2 id="community-list-title">投稿された編成</h2><form id="community-filters" class="community-filters chapter-filters"><label>ステージ番号（任意）<input name="stage" type="number" inputmode="numeric" min="1" max="9999" placeholder="すべて"></label><label>結果<select name="resultStatus"><option value="">すべて</option><option value="untested">未検証</option><option value="challenging">挑戦中</option><option value="cleared">クリア申告</option></select></label><label>タグ<select name="tag" id="community-tag-filter"><option value="">すべて</option></select></label><label>並び順<select name="sort"><option value="new">新着</option><option value="helpful">参考になった</option><option value="trials">試行報告が多い</option><option value="clears">クリア報告が多い</option></select></label><button class="ghost-button" type="submit">絞り込む</button></form><div id="community-list" class="community-list" aria-live="polite"><p>読み込み中…</p></div><button id="community-more" class="ghost-button" type="button" hidden>さらに読み込む</button></section><aside class="notice-box"><h2>投稿・クリア報告について</h2><p>編成と結果はプレイヤーの自己申告です。育成状況や操作によって結果は変わります。実際に試した結果や、参考になった編成を共有してください。</p><a href="/normal-guide/">通常ステージの攻略ガイド</a></aside></section>`
};
write('/team-builder/community/chapters/', shell(chapterPage));
const dojoBody = chapterPage.body
  .replaceAll('チャプターを選ぶ', '属性・階を選ぶ')
  .replaceAll('チャプター内の番号', '道場の階内の番号')
  .replaceAll('チャプター全体', '選んだ階全体')
  .replaceAll('このチャプターの編成を作る', 'この道場の編成を作る')
  .replaceAll('このチャプターを見る', 'この階を見る')
  .replaceAll('このチャプターを共有', 'この道場を共有')
  .replaceAll('前のチャプター', '前の階')
  .replaceAll('次のチャプター', '次の階')
  .replaceAll('チャプター移動', '階の移動')
  .replaceAll('チャプター番号', '階数')
  .replaceAll('通常ステージ', 'バッジ道場')
  .replaceAll('通常編成', 'バッジ道場編成')
  .replaceAll('name="chapter"', 'name="floor"')
  .replaceAll('?chapter=1', '?attribute=fire&floor=1')
  .replaceAll('?chapter=2', '?attribute=fire&floor=2')
  .replaceAll('?mode=normal&chapter=1', '?mode=dojo&attribute=fire&floor=1')
  .replace('<section id="community-chapter-browser"', '<nav id="community-dojo-attributes" class="community-mode-nav community-dojo-attributes" aria-label="道場の属性"></nav><section id="community-chapter-browser"')
  .replace('<form id="community-chapter-form" class="community-chapter-form">', '<form id="community-chapter-form" class="community-chapter-form"><input type="hidden" name="attribute" value="fire">')
  .replace('<input name="floor" type="hidden" value="1">', '<input name="floor" type="hidden" value="1"><input name="dojoAttribute" type="hidden" value="fire">')
  .replace('<a href="/normal-guide/">バッジ道場の攻略ガイド</a>', '<a href="/badge-dojo/">バッジ道場の攻略ガイド</a>')
  .replace('</aside></section>', `</aside><aside class="source-note community-dojo-sources"><h2>道場の区分と参考資料</h2><p>属性・階・ステージの区分は外部攻略のプレイ記録を参考にしています。投稿編成とクリア報告は、このサイトのプレイヤー投稿です。</p><p>参考資料では1階につき${dojoData.stageStructure.observedStagesPerFloor}ステージの記録を確認しています。最新の最大階数は未確認のため、番号を直接指定できます。</p><ul>${dojoData.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.title)}</a></li>`).join('')}</ul></aside></section>`);
write('/team-builder/community/dojo/', shell({
  route: '/team-builder/community/dojo/',
  title: '道場の編成掲示板｜属性・階・ステージ別の攻略編成',
  description: 'バッジ道場の属性・階・ステージ別にプレイヤーの編成を探せます。5体の配置を編成メーカーへ読み込み、自分の編成や試した結果を投稿できます。',
  mode: 'dojo',
  body: dojoBody
}));

write('/team-builder/community/detail/', shell({
  route: '/team-builder/community/detail/',
  title: 'みんなの編成詳細',
  description: 'プレイヤー投稿の通常ステージ・バッジ道場・ゾンビラッシュ編成を確認し、同じ配置を編成メーカーへ読み込めます。',
  robots: 'noindex,follow',
  type: 'WebPage',
  body: `<section class="wrap static-section"><div id="community-detail" class="community-detail" aria-live="polite"><p>編成を読み込み中…</p></div><section id="community-trial-panel" class="community-panel" hidden><h2>試した結果を報告</h2><form id="community-trial-form" class="community-form"><div class="community-form-row"><label>難易度<select name="difficulty"><option>1</option><option>2</option><option>3</option><option>4</option></select></label><label>結果<select name="resultStatus"><option value="round">最高Round</option><option value="cleared">クリア（自己申告）</option></select></label><label>最高Round<input name="highestRound" type="number" min="0" max="25" value="0"></label></div><label><input name="changed" type="checkbox"> 元の編成から一部変更した</label><label>短いコメント（任意）<textarea name="comment" maxlength="200" rows="2"></textarea></label><button class="button" type="submit">結果を送信</button><p id="community-trial-status" class="tool-status" role="status" aria-live="polite"></p></form></section><section id="community-comments-panel" class="community-panel" hidden><h2>コメント</h2><div id="community-comments"></div><form id="community-comment-form" class="community-form"><input class="honeypot" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><label>名前（任意）<input name="name" maxlength="30"></label><label>コメント<textarea name="content" maxlength="500" required rows="3"></textarea></label><button class="button" type="submit">コメントする</button><p id="community-comment-status" class="tool-status" role="status" aria-live="polite"></p></form></section><nav class="attribute-guide-nav"><a href="/team-builder/community/">みんなの編成へ戻る</a><a href="/team-builder/">自分の編成を作る</a></nav></section>`
}));
inject('index.html', 'TOP_LINKS', '<section class="wrap static-section"><h2 class="page-h2">目的から始める</h2><div class="attribute-guide-nav"><a href="/beginner-guide/">初心者ガイド</a><a href="/events/">イベント攻略</a><a href="/team-builder/">編成メーカー</a><a href="/team-builder/community/chapters/">チャプター別編成</a><a href="/team-builder/community/dojo/">道場の編成掲示板</a><a href="/team-builder/community/">みんなのゾンビラッシュ編成</a></div></section>');
inject('zombie-rush/index.html', 'ZOMBIE_LINK', '<section class="wrap static-section"><h2 class="page-h2">実際の編成を見る</h2><p>プレイヤー投稿の配置・Tier・Lv・チップを確認し、自分の編成メーカーへ読み込めます。結果は自己申告です。</p><a class="button" href="/team-builder/community/">みんなの編成を見る</a></section>');
inject('normal-guide/index.html', 'CHAPTER_LINK', '<section class="wrap static-section"><h2 class="page-h2">チャプター別の攻略編成を探す</h2><p>プレイヤー投稿の編成をステージごとに探し、編成メーカーへ読み込めます。</p><a class="button" href="/team-builder/community/chapters/">チャプター別編成掲示板</a></section>');
inject('badge-dojo/index.html', 'DOJO_LINK', '<section class="wrap static-section"><h2 class="page-h2">属性・階ごとの編成を探す</h2><p>バッジ道場の投稿編成を属性・階・ステージで探し、編成メーカーへ読み込めます。</p><a class="button" href="/team-builder/community/dojo/">道場の編成掲示板</a></section>');
console.log('Community pages generated: Zombie Rush + chapters + noindex detail + core links');
