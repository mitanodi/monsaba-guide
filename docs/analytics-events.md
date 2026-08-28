# Analytics / Conversion イベント仕様

## 方針

既存のVercel Web AnalyticsとSpeed Insightsを継続し、Google Analytics 4（GA4）を併用する。各製品の自動page viewを1回ずつ利用し、customの`page_view`は送らない。custom eventは`growth.js`の1か所からVercelとGA4へ送り、GA4側はイベント別allowlistにあるpropertyだけを許可する。

検索入力文字列、自由質問、UID、タタ名、ユーザー名、手持ちタタ一覧、投稿内容、投稿ID、削除token、IPアドレスは送信しない。GA4へ渡すpage locationとreferrerはクエリ・フラグメントを除いたorigin + pathnameに固定する。`q` / `s` / `search` / `query` / `keyword` はGoogle tag読込前にURLから除外し、初期検索語はページ内メモリだけで検索UIへ引き渡す。Google側の拡張計測設定に依存せず `search_term` の自動送信を防ぐ。custom propertyは最大8項目、文字列は80文字まで、入れ子を使わない。

## Event map

| Event | 発火 | 送る値 | 送らない値 |
|---|---|---|---|
| `page_view` | Vercel / GA4自動 | 各サービス既定の匿名ページ情報（GA4はqueryなし） | 独自の重複page view |
| `board_view` | 質問掲示板表示 | `view`（list/thread） | 投稿ID、質問・回答本文、名前 |
| `board_question_submit` | 質問投稿成功 | `category` | タイトル、本文、名前、IP |
| `board_answer_submit` | 回答投稿成功 | `category` | 回答本文、名前、投稿ID |
| `board_filter_use` | 絞り込み実行 | `category`、`sort`、`unanswered` | 検索語 |
| `board_report` | 通報受付 | `target_type`、`reason` | 対象投稿ID、投稿内容 |
| `board_resolved` | 解決状態変更 | `resolved` | 質問ID、削除token |
| `nav_click` | header nav | destination type, source type | link text全文 |
| `internal_link_click` | same-origin link | destination type, source type | query入力本文 |
| `related_content_click` | related/next-reading | destination type | タタの所持状況 |
| `site_search` | 検索submit、図鑑検索停止後 | query length, result count, surface | 検索語 |
| `search_result_click` | 検索結果 | destination type | 検索語 |
| `filter_use` | select/checkbox/radio | filter id, page type | 選択履歴の連結 |
| `tata_compare_start` | 比較選択開始 | source | 個人識別子 |
| `tata_compare_view` | 2体比較成立 | mode, 左右の属性 | 自由入力 |
| `external_link_click` | 外部リンク | destination host | 完全URLのquery |
| `affiliate_click` | A8リンク | offer id, placement id | 成果・購入内容 |
| `affiliate_impression` | A8バナーが50%以上表示された最初の1回 | offer id, page, placement, device class | 個人情報・検索語・UID |
| `ad_click` | 将来のAdSlot | slot id | 広告識別子の推測 |
| `cta_click` | button/ghost button | CTA id, destination type | 文面全文 |

## 運用

- custom eventsの利用可否・上限はVercel契約プランで確認する。送信APIが利用できない場合もUIは壊さない。
- 月次で `nav_click → related_content_click → tata_compare_view / consult` を見る。
- affiliate_clickは売上ではない。A8側の成果と同一視しない。
- Vercel公式ではpage viewは自動計測され、custom eventに個人情報を含めない設定が必要とされる。

参考: https://vercel.com/docs/analytics/privacy-policy  
参考: https://vercel.com/docs/analytics/custom-events
