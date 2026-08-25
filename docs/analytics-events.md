# Analytics / Conversion イベント仕様

## 方針

既存のVercel Web Analyticsを継続し、別のAnalytics製品や二重のpage view計測を追加しない。`page_view` はVercelの既存スクリプトによる自動計測を正とする。custom eventは `growth.js` の1か所から送る。

検索入力文字列、自由質問、UID、ユーザー名、手持ちタタ一覧、投稿内容、削除token、IPアドレスは送信しない。custom propertyは最大8項目、文字列は80文字まで、入れ子を使わない。

## Event map

| Event | 発火 | 送る値 | 送らない値 |
|---|---|---|---|
| `page_view` | Vercel自動 | Vercel既定の匿名ページ情報 | 独自の重複page view |
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
| `ad_click` | 将来のAdSlot | slot id | 広告識別子の推測 |
| `cta_click` | button/ghost button | CTA id, destination type | 文面全文 |

## 運用

- custom eventsの利用可否・上限はVercel契約プランで確認する。送信APIが利用できない場合もUIは壊さない。
- 月次で `nav_click → related_content_click → tata_compare_view / consult` を見る。
- affiliate_clickは売上ではない。A8側の成果と同一視しない。
- Vercel公式ではpage viewは自動計測され、custom eventに個人情報を含めない設定が必要とされる。

参考: https://vercel.com/docs/analytics/privacy-policy  
参考: https://vercel.com/docs/analytics/custom-events
