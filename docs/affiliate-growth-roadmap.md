# 90-day Affiliate Growth Roadmap

## Measurement dashboard

| Metric | Current | Source | Review |
|---|---|---|---|
| page traffic | 未計測 | Vercel Web Analytics | weekly |
| organic landing pages | 未計測 | Search Console | weekly |
| navigation clicks | event実装、実数未計測 | `nav_click` | weekly |
| related clicks | event実装、実数未計測 | `related_content_click` | weekly |
| compare usage | event実装、実数未計測 | `tata_compare_view` | weekly |
| consult usage | CTA/internal event実装、実数未計測 | Vercel events | weekly |
| external clicks | event実装、実数未計測 | `external_link_click` | monthly |
| affiliate clicks | event実装、実数未計測 | `affiliate_click` | monthly |
| ad performance | 通常広告無効 / 未計測 | monetization config | monthly |
| revenue | 未計測 | A8管理画面 | monthly |
| pages needing update | pending管理開始 | page freshness | weekly |
| broken links | 0（local validator） | CI | every push |
| indexability | 86 indexable / compare・404除外 | validator | every push |
| performance | baseline一部未取得 | Speed Insights | weekly |

## Days 1–30: Measurement and discoverability

| 内容 | 目的 | 必要データ | 完了条件 | 工数 | リスク | 優先 |
|---|---|---|---|---|---|---|
| custom eventsをProduction確認 | 行動baseline | Vercel plan/events | 主要event受信 | 0.5日 | plan制限 | P0 |
| sitemap/Search Console確認 | index状態 | Search Console | 新規2 index page発見 | 0.5日 | crawl待ち | P0 |
| 攻略ハブ/比較/FAQ導線確認 | 2–3操作 | events | nav/related click発生 | 1日 | 導線過多 | P0 |
| 8/26後のpending確認 | 鮮度 | ゲーム内公式告知・実戦 | scheduledのまま放置しない | 継続 | 情報不足 | P0 |

## Days 31–60: Content quality

| 内容 | 目的 | 必要データ | 完了条件 | 工数 | リスク | 優先 |
|---|---|---|---|---|---|---|
| landing page別離脱分析 | 回遊改善 | page/related events | 上位landing 10件を分類 | 1日 | 母数不足 | P1 |
| Search Console query gap | 実需要で更新 | query/page実数 | 未回答意図を10件以内に整理 | 1日 | 推測混入 | P1 |
| 低評価保留ページの確認 | thin content対策 | ゲーム内資料 | 確認できたものだけ更新 | 継続 | DB誤更新 | P1 |
| 比較・相談の利用差 | 機能改善 | compare/CTA events | 1仮説だけ選ぶ | 0.5日 | 多変量化 | P1 |

## Days 61–90: Monetization validation

| 内容 | 目的 | 必要データ | 完了条件 | 工数 | リスク | 優先 |
|---|---|---|---|---|---|---|
| A8案件の継続可否確認 | リンク健全性 | A8管理画面 | 4案件を確認 | 0.5日 | 権限必要 | P0 |
| affiliate click→成果確認 | 収益性 | event/A8成果 | clickと成果を別指標で記録 | 1日 | 帰属差 | P1 |
| CTA A/Bを1件だけ検討 | 改善因果 | 十分な母数 | flag 1件・期間・指標を定義 | 0.5日 | 母数不足 | P2 |
| 広告追加判断 | UX優先 | CWV・回遊・収益 | データ不足なら無効継続 | 0.5日 | CLS/誤クリック | P2 |

## Completion rule

- 実数のない項目を0や推定値で埋めない。
- ゲーム情報を広告記事のために追加しない。
- A/Bは同時に複数要素を変えない。
- 90日後に「維持・改善・停止」をイベントと公式データで判断する。
