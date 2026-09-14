# Monetization plan — Astra Final

## 実配信の再監査

Currentの設定と実DOMを照合すると、`affiliateDensity: low` により自動追加プロフィールは動かず、実配信されるA8はJAの4ページだけだった。Initialレポートの「major記事でhero後＋中盤」は設定上の候補を実配信と取り違えていたため訂正する。売上・CTR・PVは取得していない。

`data/monetization.json` は `adsEnabled=false`、`affiliateEnabled=true`。AdSenseアカウントの審査状態はコードだけでは不明。アカウント、publisher、ads.txt、A8正本、元rendererは変更しない。

| Route | Current placement / creative | Device | Astra Initial | Astra Final | Decision / Reason |
|---|---|---|---|---|---|
| `/` | article_bottom / ワラウ `warau_003` 468×60 / A8.net | 両方 | 下部の汎用placeholder | 図鑑と4ステップ攻略導線の後。実creative寸法で予約 | 維持・位置改善。Current Mobileは約17,740px下。検索・予定・図鑑を先に使える |
| `/beginner-guide/` | article_bottom / ポイントインカム `point_income_003` 300×250 / A8.net | 両方 | 全手順後の汎用placeholder | T3の説明終了後 | 維持・位置改善。何をする／何を育てるの理解を先にする |
| `/tata/{id}/` | なし | — | 読了後placeholder | なし | 今回は掲載範囲を増やさない。将来はSkill・Evolution後の境界が候補 |
| `/tata-tier/` | なし | — | 表・説明後placeholder | なし | 最初の表を優先。既存案件の対象外 |
| `/evolution-priority/` | article_bottom / マクロミル `macromill_002` 120×600 / A8.net | Desktopのみ | 汎用placeholder | 進化移行一覧後、幅168pxの独立枠 | 維持・位置改善。820px以下は非表示、ナビrailとは分離 |
| `/normal-guide/` | article_bottom / イプソス `ipsos_isay_001` 250×250 / A8.net | 両方 | 読了後placeholder | Normal boss攻略の後 | 維持。攻略途中の主要情報を遮らない |
| `/boss-rally/` | なし | — | 説明後placeholder | なし | 条件・編成操作を優先、掲載範囲拡張なし |
| `/badge-dojo/` | なし | — | 説明後placeholder | なし | 属性攻略を優先、掲載範囲拡張なし |
| `/events/` と個別攻略 | なし | — | 一覧・本文後placeholder | なし | 現案件の対象外。将来なら個別攻略の中盤／終了後のみ |
| `/events/calendar/` | なし | — | なし | なし | 日付カード・月移動・今日の確認に集中 |
| `/search/` | なし | — | なし | なし | 結果と広告の誤認を防ぐ |
| `/compare/` | なし | — | なし | なし | 比較操作を優先 |
| `/team-builder/` | なし | — | なし | なし | 盤面、picker、drag、保存・共有に広告0。将来も共有領域のさらに下だけ候補 |
| `/team-builder/community/` | なし | — | なし | なし | 投稿そっくりの広告を作らない。少数投稿で広告比率を上げない |
| My Monsaba / Board / Friends | なし | — | なし | なし | 保存と閲覧を優先 |

実広告はJAのみ。EN・zh-CNは元rendererの掲載対象を拡張しない。配置placeholderの説明は翻訳し、未確認の案件名を翻訳せずA8.netと既存offer IDを表示する。

## Previewでの確認

- デフォルトと `?ads=preview`：広告／PRを明示した非クリックplaceholder。対象creative寸法を予約する。
- `?ads=off`：placeholderを非表示。localStorageやcookieの設定を変更しない。
- JA対象4ページの `?ads=live`：対象枠が画面へ近づいたとき、既存slotを新wrapperへ移し、変更していない `monetization.js` を一度だけ読み込む。任意の実案件確認経路。

広告本体のhref、a8mat、aid、wid、eno、mid、mc、creative URL、1×1pixel、relは元正本からそのまま生成。監査では各creativeを1回だけ取得してキャッシュ化し、ブラウザQAは画像とpixelの通信をローカル応答へ置換した。リンクをクリックせず、計測pixelを実サーバーへ送らない。

## Density / UX / expected revenue

| 案 | 上限・場所 | UX影響 | 収益期待（仮説） | 判断 |
|---|---|---|---|---|
| LIGHT | 記事末尾だけ1枠 | 最小 | 長文では到達が少ない | 比較用 |
| BALANCED | 既存4ページ各1枠、主要目的達成後の境界 | 初期CTAから離す。Mobileは画面半分未満、120×600は非表示 | 元案件の表示機会を守り、深すぎる位置を改善 | Final採用候補 |
| REVENUE-FOCUSED | 冒頭・中盤・末尾／固定rail | 密度、誤タップ、転送増 | 増収未検証 | 不採用 |

Mobile広告は内部CTAに接着させず、余白・破線・広告／PRラベルで境界を示す。floating、sticky、modal、bottom-nav overlayは0。Desktop縦長creativeは独立した狭い枠に収め、Navigation Sidebarへ入れない。枠数はCurrentと同じ。収益の金額や改善率は推定しない。

## 評価の限界

Initial 6.5の原因は、実案件が無効のまま、汎用placeholderだけではcreative寸法・実在する掲載範囲・運用経路を検証できなかったこと。Finalは元案件の明示的な確認経路、寸法、掲載範囲、位置を検証可能にした。収益化設計として7.5を候補とするが、Currentの本番収益運用実績を代替しない。公開時の有効化は採用後の移行タスクで再監査する。

## AdSense・A8の将来候補

AdSenseは現在無効を維持。候補は長文の主要情報の後、記事末尾、TataのSkill/Evolutionと関連情報の境界。Calendar本体・ツール操作内・Navigation直下は不採用。

既存ポイント／アンケート案件は攻略意図への直接の関連性が弱い。ゲーム利用環境や周辺機器に合う案件が存在するかを、将来の「案件変更候補」として調査する余地はある。今回は新案件、未確認URL、素材、コードを作成せず、別タスクでユーザー確認を受ける。

## Evidence

Repository外 `../astra-evidence/finalization/current-ads.json`（14 route×2 viewport）、`ads-final-qa.json`、`current-ad-*.png`、`final-ad-*.png`。テスト画像をRepositoryへcommitしない。
