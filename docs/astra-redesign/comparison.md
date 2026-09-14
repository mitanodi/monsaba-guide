# Current / Astra Initial / Astra Final

現行：https://monster-survival.com/

検証したFinal：https://monsaba-guide-e9r7jh6yt-qyr2qqggjs-6136s-projects.vercel.app/

## 10点満点の再評価

Astra自身による設計・実操作の評価。実ユーザー調査、売上、CTR、実ユーザーCWVの測定値ではない。5=利用可能だが導線に課題、7=十分使える、9=目的到達と検証操作に優れる。FinalはInitialのUX採点を据え置き、確認したPerformance・Monetizationだけを再評価した。

| 項目 | Current | Astra Initial | Astra Final | Winner | 理由 |
|---|---:|---:|---:|---|---|
| Navigation | 6.5 | 8.5 | 8.5 | ASTRA WINS | 検索・図鑑・Calendar・編成へ直通を維持 |
| TOP | 6 | 8.5 | 8.5 | ASTRA WINS | 検索→予定→図鑑を維持し、画像だけ適正サイズ化 |
| Visual | 6.5 | 8.5 | 8.5 | ASTRA WINS | 公式素材と濃紺・階層・余白を維持 |
| Mobile | 6.5 | 8 | 8 | ASTRA WINS | 320–430px、bottom nav・picker sheet・touch targetを維持 |
| Desktop | 7 | 8.5 | 8.5 | ASTRA WINS | 常設ナビ、Team Builder 2ペインを維持 |
| Tata DB | 7.5 | 8.5 | 8.5 | ASTRA WINS | 検索と結果を近接。65系統の128px画像候補 |
| Tier | 7 | 8.5 | 8.5 | ASTRA WINS | 実表を先に出し、説明を展開。画像転送を削減 |
| Beginner | 7.5 | 8 | 8 | ASTRA WINS | 最初の進行・育成説明を広告より優先 |
| Tools | 7 | 8.5 | 8.5 | ASTRA WINS | 広告0、5モード・保存・Share互換・Undo/Redo維持 |
| Community | 7 | 7.5 | 7.5 | ASTRA WINS（閲覧） | 架空投稿なし。Preview書込禁止は維持 |
| Calendar | 5 | 8.5 | 8.5 | ASTRA WINS | 独立URL、常設入口、今日・次回予定を維持 |
| SEO | 9 | 9 | 9 | TIE | 既存396 HTMLのSEO identity一致。本文は静的HTML |
| Performance | 8 | 7 | 8 | TIE（総合） | TOP390総転送はCurrent比+2.7%、Desktop画像は−62%。Tier画像−79%。CurrentのCSSの小ささは残る |
| Accessibility | 7 | 8.5 | 8.5 | ASTRA WINS | focus・ARIA・44px操作を維持。自動検査と実操作の範囲内 |
| Monetization | 7 | 6.5 | 7.5 | ASTRA WINS（配置設計） | 既存JA 4枠の実creative・寸法・確認経路を復旧。増収は未証明 |
| Overall | 7.0 | 8.2 | 8.3 | ASTRA WINS（設計評価） | 上記15項目の単純平均・小数1桁 |

## Current winsを残す

- **CURRENT WINS：CSS転送・一部LCP。** TOPの圧縮CSSはCurrent21,640B、Final27,419B。Mobile Tier LCPは828→996ms、Desktop detailは860→976ms。今回の中央値でCurrentが速い。全ページでAstraが最速とは言わない。
- **CURRENT WINS：実収益運用の実績。** Finalの7.5は配置設計と復旧可能性の評価。Previewは標準でplaceholder、JA 4ページで明示的に既存広告を確認できる。売上優位は未証明。
- **CURRENT WINS：本番投稿。** PreviewのCommunity/Board/Friendsは読み取り専用。実データ保護の意図的な制約。既存ユーザーの慣れ・実機の指触りも未評価。

## Performance判定

3者×7 route×2 viewport×3回、126測定。Final TOP画像はMobile33,269B（Initial221,821B／Current36,657B）、Desktop89,935B（Initial512,545B／Current237,457B）。Mobile TOP総bodyは168,222→172,683B（+2.7%）。Mobile Tierは1,687,019→354,567B（画像−79.0%）。追加CSSは全量33,533Bからページ別最大21,526Bへ。通常CSS requestは1増だが、初期画像削減が大きい。

Mobile Builder CLSはCurrent .0713、Initial .0038、Final .0399。FinalはCurrentより小さいがInitialより増えた。この小さな残存shiftを隠さない。その他Finalの対象ページもCLS .1未満。INP・実ユーザーCWVは未取得。詳しいHTML/CSS/JS/画像/JSON/request/LCP/CLSは [final-performance.md](final-performance.md)。

## 採用条件への回答

OverallはFinalが上。Performanceは転送・表示安定・操作性を合わせて同等8、実用差は小さいと判断する。Monetizationの配置設計はCurrent以上、実収益は未検証。重大回帰0をPreview QAで確認した範囲で、**Production採用候補として比較を推奨**する。自動採用・main merge・本番配信はしない。

## 主要画面のBefore / Initial / Final

Repository外の `../astra-evidence/finalization/comparison.html` でTOP・Tata DB・Tier・Team Builder・Events・Calendar・Beginner・Detailを3列比較。390/430/768/1366/1440/1920を切替。元PNGはCurrent before/、Initial after/、Final finalization/final/。

| 画面 | Current → Initial | Initial → Final |
|---|---|---|
| TOP | 多数入口 → 検索・予定・図鑑 | 見た目を維持、画像−85%、既存A8枠を主要導線後へ |
| Tata DB | 検索と結果の距離 → 近接 | 小画像候補、mobile検索・属性filter維持 |
| Tier | 説明優先 → 表優先 | 128px候補、表示本文・評価維持 |
| Team Builder | 設定中心 → 盤面・2ペイン | 専用CSS配信、5モードと共有互換維持、広告0 |
| Events | 予定と攻略の混在 → 予定と攻略の入口整理 | 不要広告候補を除き、専用Calendar導線維持 |

実iPhone Safariの慣性scroll、ホームインジケータ、指でのdrag、長時間利用、広告位置の違和感、案件との関連性を人が確認する。採用／一部採用／現行維持をユーザーが決める。Initialの詳細採点は [initial-comparison.md](initial-comparison.md) に保存。
