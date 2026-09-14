# Astra Finalization — 最終報告

PerformanceとMonetizationを調整した採用候補を、experiment branchで完成。**main merge・Production deployは実施していない。採否はユーザー判断。**

現行：https://monster-survival.com/

検証したAstra Final：https://monsaba-guide-e9r7jh6yt-qyr2qqggjs-6136s-projects.vercel.app/

Vercelの保護設定を維持。一時共有URLはチャットで提示し、token/cookieはRepositoryへ保存しない。

## 要求された29項目

| # | 項目 | 結果 |
|---:|---|---|
| 1 | Start HEAD | `90b4c2fc7007f3112ad1cb804e39067d502fdd59` |
| 2 | Final experiment HEAD | 実装・全Preview QA対象 `596eefde70ede7f5dafdabcb59a857900dcd293f`。この報告を追加した文書commitのHEADは最終チャットに提示。以降は文書だけの差分 |
| 3 | CSS Before | Astra追加33,533Bを全ページへ配信 |
| 4 | CSS After | 共通13,215B＋必要なページCSS。最大21,526B（TOP等）、Tier14,774B、Builder19,254B。全7ファイル合計は33,976B |
| 5 | 削減bytes | TOP −12,007B（−35.8%）、Tier −18,759B、Builder −14,279B。全ファイル合計は+443Bであり、削減はページ当たりの配信量 |
| 6 | TOP image Before | Initial Mobile221,821B / Desktop512,545B。Current36,657B / 237,457B |
| 7 | TOP image After | Final Mobile33,269B（Initial比−85.0%）/ Desktop89,935B（−82.5%）。公式原本不変、Hero4サイズと確認済み64系統の128px派生画像 |
| 8 | JS Before/After | astra.js 5,079→4,431B（−648B）、astra-calendar.js 1,730B維持。任意広告loader905Bを対象4ルートだけ追加。TOP wire JS30,035→30,823B（+788B）、Builder56,197→55,955B（−242B）。全ページで減ったとは言わない |
| 9 | Performance score | Current8 / Initial7 / Final8。総合同等。TOP390総bodyはCurrent比+2.7%、Tier画像−79%。CSS総転送や一部LCPはCurrentが優れる |
| 10 | Current ad placements | JA TOPワラウ468×60、Beginnerポイントインカム300×250、Evolutionマクロミル120×600（Desktopのみ）、Normalイプソス250×250。全てA8、article_bottom。low設定のため他の自動枠は実配信されない |
| 11 | Astra Final ad placements | 同じ4枠。TOPは図鑑＋攻略導線後、BeginnerはT3説明後、Evolutionは進化移行一覧後、Normalはboss攻略後。各1枠、tool0。広告／PRを明示 |
| 12 | A8変更なし | 正本、renderer、href/a8mat/aid/wid/eno/mid/mc/creative/pixel/relを保持。移動したのはwrapper。実DOMも一致確認。広告リンククリック0、実pixel送信0 |
| 13 | AdSense変更なし | account、publisher、ads.txt、adsEnabled=falseを保持。審査状態は未取得 |
| 14 | Monetization score | Current7 / Initial6.5 / Final7.5（配置設計）。元案件の確認経路と寸法・位置を検証。売上・CTRの優位は未証明 |
| 15 | UX維持 | Navigation、TOP検索→予定→図鑑、検索と結果の近接、Tier表優先、Desktop2ペイン、MobileSheet、Calendar常設入口を維持 |
| 16 | Accessibility | Preview54ページでaxe WCAG A/AA違反0。Keyboard、Escape、focus、touch targetを維持。自動検査だけで完全適合とは断定しない |
| 17 | SEO | 既存396 HTMLのH1/canonical/hreflang/robots/構造化データ一致。slug、静的本文、sitemap維持。PreviewはHTTP noindex |
| 18 | JA | 18 route×8幅の検査と検索・filter・menu・広告確認 |
| 19 | EN | 18 route×8幅、言語切替・記事展開・5mode・picker確認。未確認固有名詞を翻訳しない |
| 20 | zh-CN | EN同条件。既存名を保持、広告説明をローカライズ。実案件のJA限定範囲は拡張しない |
| 21 | Team Builder | 5mode、tap、mouse drag、touch drag、move/swap、delete、undo/redo、save、Share復元を確認。盤面内広告0、既存codecと保存keyを維持 |
| 22 | Calendar | 専用URLと常設入口、今日／次回、月のnext/prev/todayを確認。50回反復でもlistener増殖0 |
| 23 | Tests | npm test 346 tests /29コマンド成功。generate、validate、idempotency差分0、HTTP101 pages/5 JSON/25 Hero、GitHub Validate site成功 |
| 24 | Astra QA | 公開Preview54ページ×8幅（320/375/390/430/768/1366/1440/1920）=432条件。overflow0、console0、broken image0、axe0。10主要操作、追加Team操作、3言語、実広告キャッシュ検証、50回反復、touch、API read-onlyを確認 |
| 25 | Current Overall | 7.0 |
| 26 | Astra Initial Overall | 8.2 |
| 27 | Astra Final Overall | 8.3（15項目単純平均の自己評価。ユーザー採用判断を代行しない） |
| 28 | Preview URL | 上記immutable Preview。既存 `monsaba-guide` project、experiment branch、target:null。新規projectなし |
| 29 | Production untouched | `main`/origin/mainは `6111788e392892c19a4452a3fb186cc97fc8bd45`。backup `pre-astra-redesign-20260915`保持。Production deployment `dpl_5y5wX8JXWhydYpLGEs5W23i3Z6W5`保持。Community/Board/Friends実データ、promo/、chigonoki、広告設定を変更していない |

## 採用候補としての判断

[3者比較・16項目の採点表](comparison.md)に理由を記載。UX項目はInitialと同点に据え置き、Performance7→8、Monetization6.5→7.5を再評価した。CurrentのCSSの軽さ、実収益運用、本番投稿の利用可否はCurrent winsとして残す。

[性能実測](final-performance.md)は各条件3回・126測定。LCP/CLSはlab値で、INP・実ユーザーCWVは未取得。Final Mobile BuilderのCLS .0399はCurrent .0713より小さいが、Initial .0038より増えている。新しいlayoutが全ての指標で勝つとはしない。

広告の掲載数と案件は増やさず、TOP Mobileの位置を約17,741px→9,366px、Desktopを約11,781px→5,624pxへ改善。初心者も最初の理解を保った位置へ移した。Evolutionは長い比較表後のままで到達性改善が小さい。別creativeや別案件への変更は将来候補として残す。

## 比較画像とHuman Verification

Repository外 `../astra-evidence/finalization/comparison.html` にCurrent / Initial / Finalを並べた。TOP、Tata DB、Tier、Team Builder、Eventsに加えCalendar・Beginner・Detail、6画面幅を切替可能。Final PNG78枚はRepositoryへcommitしない。

- TOP：検索・予定・図鑑の順番を維持、初期画像転送を削減。
- Tata DB：名前検索とfilterを近接したまま、小画像を配信。
- Tier：表を先に表示したまま、画像転送を削減。
- Team Builder：Desktop2ペイン・MobileSheet・保存共有を維持。
- Events：予定と攻略への入口を維持し、掲載対象外の汎用広告枠を除去。

実iPhone Safariの慣性scroll、home indicator、指でのdrag、長時間使用、広告の自然さと案件関連性を比較する。`?ads=off`、`?ads=preview`、対象JA4ページの `?ads=live` で確認可能。ライブ広告をクリックしてテストしない。

採用・一部採用・現行維持の判断を受けるまで停止。採用後の差分再監査、Production移行、広告有効化判断は次タスクで行う。

## 低速回線と証跡

150ms遅延・下り200,000B/sで320/390/768/1366/1920×DPR1/3の10条件を確認。390pxのHeroはDPR1で120px、DPR3で360px。全条件で画像重複要求0、broken0、Hero eager、CLS最大 .0008。追加font requestなし。検証集計は [final-qa.json](final-qa.json)。元ネットワーク記録・比較PNGはRepository外に保存。
