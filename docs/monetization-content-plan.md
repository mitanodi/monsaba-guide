# Monetization Content Plan

## 現在の実在案件

repositoryで確認できた承認済みA8.net案件は4件。案件ID、掲載ページ、期間、開示、計測URLを `data/affiliate-offers.json` で中央管理する。通常広告は `adsEnabled:false` を維持する。

| Offer | 現在の対象 | 方針 |
|---|---|---|
| ポイントインカム | 初心者ガイド | 既存1枠のみ。攻略の途中へ増設しない |
| ワラウ | トップ | 既存1枠のみ |
| マクロミル | 進化優先度 | desktop限定の既存1枠 |
| Ipsos iSay | 通常攻略 | 既存1枠のみ |

## Content policy

- ゲーム攻略との直接的な関連性が確認できないため、各サービスを「モンサバにおすすめ」と断定する記事は作らない。
- 架空の商品比較、体験談、収益、還元額、ランキングは作らない。
- 攻略本文・CTAを広告より先にする。
- 各広告にPR表示、footerにaffiliate開示、リンクに `sponsored nofollow noopener` を付ける。
- 案件終了日は設定された場合にvalidatorで逆転・期限を検査し、終了後は安全に非表示にする。

## 人間が確認する項目

- A8管理画面で4案件が現在も提携・掲載可能か。
- バナー素材・リンクコードの利用条件に変更がないか。
- 成果実績はA8実数が得られるまで「未計測」。

消費者庁のステルスマーケティング告示ガイドブックは、広告である旨を一般消費者に分かりやすく表示する必要性を示している。  
参考: https://www.caa.go.jp/policies/policy/representation/fair_labeling/assets/representation_cms216_200901_01.pdf
