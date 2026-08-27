# Affiliate optimization

広告数やA8リンクを増やさず、既存の `affiliate_impression` と `affiliate_click` を案件×placementで比較します。

| Field | Meaning |
|---|---|
| placement | top / mid / bottom / slide_left / slide_right / bottom_floating / desktop_rail |
| offer | `data/affiliate-offers.json` の内部識別子 |
| impressions | 50%以上表示された回数 |
| clicks | クリック回数 |
| CTR | clicks / impressions |
| conversion | A8レポートから手入力する確定成果 |

月次でVercel Analyticsのイベントをplacement・offer別に集計し、A8側の確定成果CSVと日付範囲を合わせます。検索語、UID、自由質問、個人情報は記録しません。A8の `href`、`a8mat`、`aid`、`wid`、`eno`、`mid`、`mc`、pixelは変更しません。

判断は最低1,000 impressionまたは4週間の長い方を目安とし、CTRだけでなく確定成果を優先します。表示を変える場合も同じplacement内の案件差し替えから検討し、広告枠の単純追加は行いません。
