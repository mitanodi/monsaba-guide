# モンサバ攻略DB 総合成長監査

監査日: 2026-08-25  
対象: `https://monster-survival.com/` / commit `c1071a82`

## 総合評価

静的HTML、63系統・224体・224スキル段階の確認済みDB、用途別Tier、進化差分、攻略相談、主要コンテンツ攻略まで揃っており、攻略DBとしての土台は強い。一方、変更前は「ユーザーがどの導線を使ったか」「2体比較を共有できるか」「関連記事がなぜ関連するか」「案件・鮮度・A/Bをどこで管理するか」が弱く、検索流入後の回遊と改善判断を計測できなかった。

## 監査結果

| 領域 | 問題 | 根拠 | 影響 | 改善方法 | 難易度 | リスク | 優先度 |
|---|---|---|---|---|---|---|---|
| 計測 | page view以外の行動が未定義 | Vercel Analyticsは読込済みだがcustom eventなし | 回遊・比較・相談・収益導線を評価できない | 匿名custom eventを共通実装 | 中 | イベント量増加 | 最高 |
| Technical SEO | 検証は強いが、孤立ページ・query canonical・JSON-LD parseを一括検査していない | 既存validatorは内部リンク中心 | 新規ページ追加時の漏れ | Growth validatorを追加 | 中 | CI時間微増 | 最高 |
| 情報設計 | コンテンツ攻略の入口がトップ内アンカー | headerからモード一覧まで一度トップを経由 | 検索流入ページから目的ページを見つけにくい | `/guides/` を共通ナビへ追加 | 中 | ナビ項目増加 | 最高 |
| 比較 | 相談所内に比較はあるが専用URLとして共有しにくい | 選択フロー内の動的結果 | 比較利用・再訪・共有が弱い | `/compare/` をnoindexで追加 | 中 | 薄い組合せURLのindex | 最高 |
| 関連導線 | 個別タタの関連リンクが一般ページ中心 | 同属性・同Tier・同役割の理由表示なし | 詳細ページから次のタタへ回遊しにくい | 関連度スコアと理由を生成 | 中 | 同じ候補への偏り | 高 |
| 検索 | タタ名・進化名・スキルは検索可能だが、Tier・役割・候補提示が不足 | 変更前の検索対象を確認 | 曖昧な検索意図を拾えない | role/Tier/新規ハブを追加しdatalist対応 | 中 | 候補DOM増加 | 高 |
| Trust | 方針ページはあるが公式確認・独自評価・確認中の視覚差が弱い | 本文説明中心 | 読者が評価と事実を混同 | 共通ラベルと基準説明 | 低 | ラベル乱用 | 高 |
| Freshness | 最終更新は表示されるがpublished/verified/pendingが一元管理されていない | `LAST_MODIFIED` と記事固有日が混在 | 更新判断と検証日を混同 | route別freshnessデータを追加 | 中 | 管理更新漏れ | 高 |
| 収益化 | A8コードがJavaScriptへ直書き | 4案件を`monetization.js`で確認 | 期限・対象ページ・開示の保守が難しい | 実在案件をJSON中央管理 | 中 | トラッキング改変 | 高 |
| 広告 | slot基盤はあるが再利用API・期限検証が不足 | `adsEnabled:false`、限定affiliateのみ | 将来追加時のCLS/誤配信 | AdSlot APIと安全な未設定状態 | 中 | 意図しない広告表示 | 高 |
| CTA | 主要CTAはあるが共通eventがない | ページごとのリンクを確認 | CTA改善の良否を判断不能 | destination別自動計測 | 低 | event重複 | 高 |
| FAQ | 回答が複数ページに分散 | Tier/進化/ZR注意は各ページに存在 | 検索意図への短い結論が弱い | 画面表示と一致するFAQを追加 | 低 | FAQ rich resultへの過大期待 | 中 |
| Metadata | 変更前85 HTMLのtitle/descriptionは全件、canonicalは404以外全件 | 自動集計 | 新規ページで漏れる可能性 | 共通helperとvalidator | 低 | 既存head大量変更 | 中 |
| Structured data | 84ページにJSON-LD、Breadcrumb 83ページ | 自動集計 | 新規schema不整合 | helper・JSON parse検証 | 中 | 画面外内容の混入 | 中 |
| Performance | 静的構成で軽いが、home画像の一部にwidth/heightなし | ローカルDOM確認 | 画像読込時のレイアウト変動余地 | 既存lazy-load維持、共通JSを3.8KBに限定 | 低 | 全ページJS増加 | 中 |
| Mobile/A11y | 320px対策、mobile nav、skip link、focusは既存で実装済み | CSS・ローカル表示確認 | 新規比較UIで崩れる可能性 | 1列化、44px操作、live region | 中 | 表示幅差 | 高 |
| Policy | Analytics/A8/Xは記載済みだがcustom event・A/B・PR基準が未記載 | privacy本文 | 実装と開示の不一致 | privacy/about/data方針を更新 | 低 | 法的断定 | 高 |
| 再訪 | 更新履歴はあるが、比較URL・鮮度表示が弱い | `/updates/` は存在 | 再訪理由が限定 | 共有URL・pending表示・roadmap | 中 | 更新負荷 | 中 |
| 保守性 | 生成ページと手書きページのhead/footer重複 | generatorとHTMLを確認 | 変更漏れ・差分肥大 | helperと生成後foundationを利用 | 中 | 生成順序依存 | 高 |

## 最優先10項目

1. 匿名custom eventとイベント仕様書
2. 孤立・metadata・schema・canonical・affiliateを検証するCI
3. コンテンツ攻略ハブと共通ナビ再設計
4. URL共有できるnoindexの2体比較
5. 個別タタの関連度リンクと関連理由
6. 検索のTier・役割・候補・ゼロ件導線
7. 公式確認・独自評価・確認中ラベル
8. 公開日・更新日・検証日・pendingの中央管理
9. A8実在案件の中央管理と期限検知
10. mobile・keyboard・横幅・consoleの自動/実画面検証

## 判断しなかったこと

- 検索順位、検索ボリューム、CVR、収益は利用可能な実数がないため推測しない。
- ゲームDB、Tier、進化優先度、Zombie Rush Season 1専用値はSEOを理由に変更しない。
- faviconは正常なため変更しない。
