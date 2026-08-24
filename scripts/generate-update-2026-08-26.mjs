import fs from 'node:fs';
import path from 'node:path';
import { BASE_URL } from './site-config.mjs';
import { renderHeader } from './shared-layout.mjs';

const root = path.resolve(import.meta.dirname, '..');
const dataPath = path.join(root, 'data', 'zombie-rush', 'seasons', 'season-1.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const tatari = JSON.parse(fs.readFileSync(path.join(root, 'data', 'tatari.json'), 'utf8'));
const familyById = new Map(tatari.families.map((family) => [family.id, family]));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

if (data.meta.status !== 'scheduled' || data.meta.scope !== 'zombie-rush-only') throw new Error('Season 1予定データの状態または適用範囲が不正です');
if (data.tataSkillBalance.length !== 35) throw new Error(`ゾンビラッシュ専用スキル調整は35対象である必要があります: ${data.tataSkillBalance.length}`);
for (const item of data.tataSkillBalance) {
  const family = familyById.get(item.familyId);
  const stage = family?.evolutions?.find((entry) => entry.stage === item.stage);
  if (!family || !stage) throw new Error(`${item.officialTataName}: family/stageを確認できません`);
  if (stage.name !== item.databaseTataName) throw new Error(`${item.officialTataName}: DB名 ${stage.name} と照合名 ${item.databaseTataName} が一致しません`);
  if (item.mappingStatus === 'exact' && item.officialTataName !== stage.name) throw new Error(`${item.officialTataName}: exact mappingがDB名と一致しません`);
}

const directionMeta = {
  up: { symbol: '↑', label: '強化' },
  down: { symbol: '↓', label: '弱体化' },
  mixed: { symbol: '↕', label: '複合調整' }
};
const renderChange = (change) => `<li><span>${esc(change.metric)}</span><b>${esc(change.before)} <i aria-hidden="true">→</i> ${esc(change.after)}</b></li>`;
const skillCards = data.tataSkillBalance.map((item) => {
  const direction = directionMeta[item.direction];
  const family = familyById.get(item.familyId);
  const mappingNote = item.mappingStatus === 'exact' ? '' : `<p class="zr-mapping-note">公式告知名：${esc(item.officialTataName)}／現DB名：${esc(item.databaseTataName)}（名称を実装後に再確認）</p>`;
  return `<article class="zr-balance-card" id="balance-${esc(item.familyId)}"><header><div><h3>${esc(item.officialTataName)}</h3><a href="/tata/${encodeURIComponent(item.familyId)}/">${esc(family.familyName)}系・T${item.stage}</a></div><span class="zr-direction is-${item.direction}">${direction.symbol} ${direction.label}</span></header>${mappingNote}<div class="zr-skill-list">${item.skills.map((skill) => `<section><h4>${esc(skill.name)}</h4><ul>${skill.changes.map(renderChange).join('')}</ul></section>`).join('')}</div></article>`;
}).join('');
const chipRows = data.chipBalance.map((item) => {
  const direction = directionMeta[item.direction];
  return `<tr><th>${esc(item.name)}</th><td>${esc(item.metric)}</td><td>${esc(item.before)}</td><td>${esc(item.after)}</td><td><span class="zr-direction is-${item.direction}">${direction.symbol} ${direction.label}</span></td></tr>`;
}).join('');
const targetLinks = data.tataSkillBalance.map((item) => `<a href="#balance-${esc(item.familyId)}">${esc(item.officialTataName)}</a>`).join('');

const title = 'モンサバ 8/26アップデートまとめ｜パクマ・ゾンビラッシュSeason 1・新T4・バランス調整';
const description = 'モンスターサバイバル（モンサバ）の2026年8月26日予定アップデートを公式ゲーム内告知から整理。新タタのパクマ、ゾンビラッシュSeason 1、新T4、チップと専用スキル調整を掲載。';
const canonical = `${BASE_URL}/updates/2026-08-26/`;
const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    { '@type': 'Article', '@id': canonical, url: canonical, name: title, headline: title, description, image: `${BASE_URL}/assets/heroes/IMG_6941.webp`, mainEntityOfPage: { '@type': 'WebPage', '@id': canonical }, dateModified: '2026-08-25', inLanguage: 'ja' },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'モンサバ攻略DB', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: '更新履歴', item: `${BASE_URL}/updates/` },
      { '@type': 'ListItem', position: 3, name: '8/26アップデート予定' }
    ] }
  ]
};

const html = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="robots" content="index,follow" />
  <link rel="canonical" href="${canonical}" />
  <meta property="og:type" content="article" /><meta property="og:site_name" content="モンサバ攻略DB" /><meta property="og:title" content="${esc(title)}" /><meta property="og:description" content="${esc(description)}" /><meta property="og:url" content="${canonical}" /><meta property="og:image" content="${BASE_URL}/assets/heroes/IMG_6941.webp" /><meta property="og:image:alt" content="モンサバのゾンビラッシュ画面" /><meta property="og:locale" content="ja_JP" />
  <meta name="twitter:card" content="summary_large_image" /><meta name="twitter:title" content="${esc(title)}" /><meta name="twitter:description" content="${esc(description)}" /><meta name="twitter:image" content="${BASE_URL}/assets/heroes/IMG_6941.webp" />
  <link rel="icon" href="/favicon.ico" sizes="any" /><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" /><link rel="apple-touch-icon" href="/apple-touch-icon.png" /><link rel="manifest" href="/site.webmanifest" /><link rel="stylesheet" href="/styles.css" />
  <script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</script>
</head>
<body><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader('/updates/2026-08-26/')}
  <main id="main-content">
    <section class="page-hero update-preview-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="パンくず"><a href="/">トップ</a><span>›</span><a href="/updates/">更新履歴</a><span>›</span><span>8/26アップデート予定</span></nav><div class="family-page-head"><div><span class="visible-kicker">公式ゲーム内告知・8/26実装予定</span><h1>モンサバ 8/26アップデートまとめ</h1><p>パクマ・ゾンビラッシュSeason 1・新T4・バランス調整</p></div></div></div></section>

    <section class="wrap static-section update-article">
      <div class="alert-box update-scheduled-alert"><strong>2026年8月26日 実装予定</strong><p>公式ゲーム内告知をもとに、2026年8月25日時点で予定内容として整理しています。メンテナンス予定はUTC 8:30～10:30です。実装後にゲーム内表示を再確認し更新します。</p></div>
      <div class="summary-box update-scope-note"><strong>重要：35体の調整はゾンビラッシュ専用スキルです</strong><p>通常ステージなどで使う基本スキルの変更ではありません。通常スキルDBには混在させず、Season 1専用データとして管理しています。総合Tier・通常・道場・ボスラリー評価は、この予定調整だけでは変更しません。</p></div>
      <nav class="update-jump" aria-label="記事内メニュー"><a href="#new-content">新タタ・新T4</a><a href="#season-one">Season 1</a><a href="#other-updates">その他の変更</a><a href="#chips">チップ調整</a><a href="#tata-skills">専用スキル35体</a></nav>

      <section id="new-content"><h2 class="page-h2">新タタ「パクマ」と第4進化</h2><div class="guide-grid"><article class="guide-panel"><h3>水属性の新タタ「パクマ」</h3><p>パクマと進化形態には、ゾンビラッシュで使用される専用スキルが存在します。パクマ自体がゾンビラッシュ専用という意味ではありません。</p><p class="section-note">進化名・通常スキル・専用スキル詳細・数値・画像は未確認のため、タタDBにはまだ追加していません。</p></article><article class="guide-panel"><h3>第4進化を2体追加予定</h3><ul class="plain-list"><li>水属性：スケダコ → <b>ロードパス</b></li><li>岩属性：ボウズヘビ → <b>ナムアミダイジャ</b></li></ul><p class="section-note">通常スキル詳細や数値は、実装後のゲーム内スクリーンショット確認まで推測しません。</p></article></div></section>

      <section id="season-one"><h2 class="page-h2">ゾンビラッシュ Season 1</h2><div class="content-card-grid"><article class="content-card"><h3>シーズンと難易度</h3><ul class="plain-list"><li>シーズン制を導入し、Season 1は約4週間</li><li>シーズンごとにタタとチップをバランス調整</li><li>チップシステムを常設</li><li>難易度は4まで。クリアすると次を解放</li><li>1ゲーム25ラウンド・750体</li><li>時間切れ前に750体を倒すと次難易度へ挑戦可能</li></ul></article><article class="content-card"><h3>ランキングと戦績</h3><ul class="plain-list"><li>最高難易度とキル数をもとにシーズン順位を決定</li><li>シーズン限定アイコンフレームを獲得可能</li><li>直近一定回数までの対戦記録を確認可能</li><li>シーズン戦績をシェア可能</li></ul></article></div></section>

      <section id="other-updates"><h2 class="page-h2">イベント・攻略機能の変更</h2><div class="content-card-grid">
        <article class="content-card"><h3>魔法の農場リメイク</h3><ul class="plain-list"><li>イベントサイクルを変更</li><li>作物の収穫と餌付けを削除し、総重量をマイルストーンへ直接反映</li><li>肥料使用時に最大5倍のクリティカル</li><li>フレンドのタタを招待するお手伝い機能</li><li>招待タタの星ランク・進化・餌付け・ピカピカ度合いで重量増加ボーナス</li><li>作物は次回農場イベント開始まで残る</li></ul></article>
        <article class="content-card"><h3>サプライズルーレット</h3><ul class="plain-list"><li>ルーレットを1段階追加</li><li>大当たり獲得後は自動から手動レベルアップへ変更</li></ul></article>
        <article class="content-card"><h3>ゾンビラッシュ最適化</h3><ul class="plain-list"><li>作戦時間を2時間から3時間へ変更（集計時間は1時間）</li><li>初回ログイン時に入口が表示されない場合がある不具合を修正</li><li>報酬に必要なキル数を引き下げ</li><li>作戦完了後も追撃可能</li><li>参加者全員が終了後に報酬を獲得可能</li><li>近いレベルのトレーナーを優先するようマッチングを最適化</li><li>おすすめチームメイトをオフラインのフレンドより上に表示</li></ul></article>
        <article class="content-card"><h3>食材加工場・オート戦闘</h3><ul class="plain-list"><li>精巧な弁当箱：クッキー15 → 9</li><li>属性付き精巧な弁当箱：クッキー20 → 9</li><li>オート戦闘のステージ進行表示を最適化</li><li>長時間無効の場合、タップして有効化する案内を表示</li></ul></article>
        <article class="content-card"><h3>ステージ攻略</h3><ul class="plain-list"><li>Chapter 22以降のビー玉報酬を序盤チャプターと同水準へ引き上げ</li><li>現在の攻略進度に応じて差分報酬を補填</li></ul></article>
        <article class="content-card"><h3>不具合修正</h3><p>特定状況下で発生する火山ゾンビ復活の不具合を修正予定です。</p></article>
      </div></section>

      <section id="chips"><h2 class="page-h2">チップのバランス調整</h2><p>ゾンビラッシュ内でのチップ選択戦略を高めるための予定値です。</p><div class="table-wrap"><table class="zombie-table update-balance-table"><thead><tr><th>チップ</th><th>項目</th><th>変更前</th><th>変更後</th><th>区分</th></tr></thead><tbody>${chipRows}</tbody></table></div></section>

      <section id="tata-skills"><h2 class="page-h2">ゾンビラッシュ専用タタスキル調整</h2><div class="summary-box"><strong>通常スキルではありません</strong><p>以下はすべてゾンビラッシュ専用スキルの予定変更です。矢印は個々の数値変化の方向を示し、「総合的に強い・弱い」を断定するものではありません。</p></div><div class="zr-target-links" aria-label="調整対象35体">${targetLinks}</div><div class="zr-balance-grid">${skillCards}</div></section>

      <section class="source-note"><strong>情報源と今後の確認</strong><p>ユーザーがゲーム内で直接確認した「アップデートのお知らせ」を最優先ソースとして整理しました。第三者情報から数値を補っていません。特にトラーニー「火焔爆裂」は公式告知の160% → 230%を掲載しています。</p><p>公式告知の「ワンブー」は現DBの「クンブー」、「フクロウグモ」は「フクロクモ」、「ライマー」は「ライメー」に対応する可能性がありますが、既存DB名は変更していません。実装後のゲーム内表示と進化系統を再確認します。</p></section>
    </section>
  </main>
  <footer><div class="wrap footer-inner"><div><strong>モンサバ攻略DB</strong><span>モンスターサバイバル 非公式攻略サイト</span></div><div class="footer-side"><nav class="footer-links" aria-label="サイト情報"><a href="/about/">サイトについて</a><a href="/about-data/">データ方針</a><a href="/updates/">更新履歴</a><a href="/privacy/">プライバシー</a><a href="/friends/">フレンド掲示板</a></nav><p class="footer-contact">お問い合わせ・ご連絡は <a href="https://x.com/odi_monsaba" target="_blank" rel="noopener noreferrer">おぢ（@odi_monsaba）X</a> まで。フォローもよろしくお願いします。</p><div class="footer-meta">8/26アップデート予定</div></div></div></footer><script src="/site.js"></script>
</body></html>`;

const outputDirectory = path.join(root, 'updates', '2026-08-26');
fs.mkdirSync(outputDirectory, { recursive: true });
fs.writeFileSync(path.join(outputDirectory, 'index.html'), html);
console.log(`8/26アップデート予定ページを生成しました: チップ${data.chipBalance.length}件 / 専用スキル${data.tataSkillBalance.length}体`);
