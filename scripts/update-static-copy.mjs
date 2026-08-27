import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const replacements = {
  'updates/index.html': [
    ['<time datetime="2026-08-25">2026年8月25日</time><h2>8/26公式アップデート予定を掲載</h2>', '<time datetime="2026-08-28">2026年8月28日</time><h2>8/26公式アップデートを実装後情報へ更新</h2>'],
    ['ゾンビラッシュSeason 1、チップ調整、専用スキル35体の予定値', 'Zombie Rush Season 1、チップ調整、専用スキル35体の公式告知値'],
    ['専用スキルを通常スキルDBから分離し、総合Tierは変更していません', 'ゲーム内で未確認の詳細は確認待ちとして分離しています'],
    ['8/26アップデート予定を詳しく見る', '8/26アップデート実装内容を見る']
  ],
  'zombie-rush/index.html': [
    ['"description":"モンサバのZombie Rush攻略。現在の実戦Tierとは別に、2026年8月26日Season 1実装前の専用スキル・チップ変更をもとにしたAI予測Tierと採用率予測を掲載。"', '"description":"モンサバのZombie Rush Season 1攻略。実戦Tierの確認状況、旧環境Tier、8月25日に保存したAI予測Tierと答え合わせを分離して掲載。"']
  ],
  'events/treasure-hunt/index.html': [
    ['<link rel="icon" href="/favicon.ico">', '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'],
    ['<meta property="og:url" content="https://monster-survival.com/events/treasure-hunt/">', '<meta property="og:url" content="https://monster-survival.com/events/treasure-hunt/"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="モンサバ オタカラ探しソルバー"><meta name="twitter:description" content="残り配置候補から各マスの宝確率とおすすめマスを計算。">']
  ],
  'favorites/index.html': [
    ['<link rel="icon" href="/favicon.ico">', '<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">'],
    ['<meta name="robots" content="noindex,follow">', '<meta name="robots" content="noindex,follow"><meta property="og:title" content="お気に入り・最近見たタタ｜モンサバ攻略DB"><meta property="og:description" content="この端末に保存したお気に入りと最近見たタタを一覧表示します。"><meta property="og:url" content="https://monster-survival.com/favorites/"><meta name="twitter:card" content="summary">']
  ]
};

let changed = 0;
for (const [relative, pairs] of Object.entries(replacements)) {
  const file = path.join(root, relative);
  let source = fs.readFileSync(file, 'utf8');
  const before = source;
  for (const [from, to] of pairs) source = source.replaceAll(from, to);
  if (source !== before) {
    fs.writeFileSync(file, source);
    changed += 1;
  }
}
console.log(`公開後の静的コピーを同期しました: ${changed} HTML`);
