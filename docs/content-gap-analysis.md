# Content Gap Analysis

調査日: 2026-08-25

## 外部確認

実際の検索結果で以下を確認した。

- モンスターサバイバル@wiki: FAQ、タタ一覧、初心者ガイド、第3進化ロードマップ、バッジ道場などをページ単位で掲載。
- `monster-survival.games-wiki.com`: Tier、序盤おすすめ、役割別導線を掲載。
- `game-tier.com`: 海外版名中心のTier。国内名称未確認を明示。

参照URL:

- https://w.atwiki.jp/monstersurvival/pages/5.html
- https://w.atwiki.jp/monstersurvival/pages/17.html
- https://w.atwiki.jp/monstersurvival/pages/112.html
- https://w.atwiki.jp/monstersurvival/pages/122.html
- https://monster-survival.games-wiki.com/ranking
- https://game-tier.com/monster-survival/monsur-tier/

競合本文のゲーム仕様は、そのまま当サイトDBへ反映しない。repository内の確認済みデータ、ユーザー保存の公式ゲーム内告知を優先する。

## 今すぐ作る

| Gap | 理由 | 対応 |
|---|---|---|
| コンテンツ攻略ハブ | 既存4攻略が分散 | `/guides/` を追加 |
| 共有可能な2体比較 | 相談所内比較は共有しにくい | `/compare/` をnoindexで追加 |
| FAQ短答 | 検索意図に対する結論が分散 | `/faq/` を追加 |
| 関連理由付きタタ導線 | 個別→個別回遊が弱い | 同属性・同Tier・共通役割で生成 |
| Tier/役割検索 | 正式名以外の検索意図 | 検索indexへ追加 |
| 信頼・鮮度ラベル | 競合との差別化は正確性 | 公式確認/独自評価/確認中を表示 |

## データが揃ってから作る

| Gap | 必要データ | 公開条件 |
|---|---|---|
| Season 1確定攻略 | 8/26実装後のゲーム内確認・実戦 | scheduled解除後 |
| ボス別専用Tier | ボス条件と十分な実戦記録 | 総合Tierの流用をしない |
| 全タタ育成コスト比較 | 全系統の同基準コスト | 欠損を推測しない |
| ゲームバージョン別履歴 | 公式version表記・確認日 | sourceを保存 |

## 作らない

- 根拠のない最強ランキング、架空レビュー、架空利用者数。
- 未確認の属性相性・序盤手順・ドロップ率。
- 全2体組合せのindexページ。
- 外部サイトの名称対応を推測した転載DB。
- 商品との関連が薄い広告目的だけの記事。
