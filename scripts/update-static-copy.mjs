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
    ['<meta property="og:url" content="https://monster-survival.com/events/treasure-hunt/">', '<meta property="og:url" content="https://monster-survival.com/events/treasure-hunt/"><meta name="twitter:card" content="summary"><meta name="twitter:title" content="モンサバ オタカラ探しソルバー"><meta name="twitter:description" content="残り配置候補から各マスの宝確率とおすすめマスを計算。">'],
    ['形を押すたびに1個追加します（各形状3個まで）。幅×高さの向きは別々に扱います。', '形を押すたびに1個追加します（各形状3個まで）。長方形のお宝は縦・横どちらの向きも自動で計算します。1×2と2×1は同じお宝として扱います。'],
    ['幅x高さ:個数で入力します。1×1〜4×4・0〜3個なら形状UIにも同期します。それ以外は特殊specとして保持します。', '短辺x長辺:個数で入力します。3x1など逆向きの入力も1x3へ自動統合し、長方形は縦・横の両方を計算します。'],
    ['候補上限に達したため、上限までの候補を使った概算です。', '候補数が非常に多いため、固定seedの分岐重み付きサンプリングで偏りを抑えた概算を表示しています。'],
    ['宝の配置候補を独自に列挙し、入力条件と矛盾する候補を除外して確率を算出します。外部サイトのコード・HTML・CSSは使用していません。大きな盤面では上限までの有効候補を利用する概算になります。', '小〜中規模では有効配置をすべて数え、大規模では固定seedの分岐重み付きサンプリングと盤面対称性で偏りを抑えて確率を概算します。外部サイトのコード・HTML・CSSは使用していません。']
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
  for (const [from, to] of pairs) {
    if (to.startsWith(from)) {
      const suffix = to.slice(from.length);
      while (suffix && source.includes(`${from}${suffix}${suffix}`)) {
        source = source.replaceAll(`${from}${suffix}${suffix}`, `${from}${suffix}`);
      }
    }
    if (!source.includes(to)) source = source.replaceAll(from, to);
  }
  if (source !== before) {
    fs.writeFileSync(file, source);
    changed += 1;
  }
}
console.log(`公開後の静的コピーを同期しました: ${changed} HTML`);
