# Current / Astra 比較

現行：https://monster-survival.com/

検証したAstra Preview：https://monsaba-guide-cjzzc6lt3-qyr2qqggjs-6136s-projects.vercel.app/

Vercel認証を維持。所有者ログインで閲覧可能。一時共有URLは最終回答に提示し、認証Cookieや共有トークンをRepositoryに保存しない。

## 採点

10点満点の設計・実操作に基づくAstraの評価。実ユーザー調査、PV、売上、好みの優劣を測った数値ではない。5=利用可能だが導線に課題、7=十分使える、9=目的への到達と確認した操作が優れる。慣れや本番運用の実績はCurrentの長所として別記する。

| 項目 | Current | Astra | Winner | 理由 |
|---|---:|---:|---|---|
| Navigation | 6.5 | 8.5 | ASTRA WINS | Calendar・図鑑・編成へ直通。Desktop常設ナビ |
| TOP | 6 | 8.5 | ASTRA WINS | 検索／今日の予定／図鑑という明確な順番 |
| Visual | 6.5 | 8.5 | ASTRA WINS | 公式素材、濃紺、重要度に応じた余白を統一 |
| Mobile | 6.5 | 8 | ASTRA WINS | 390px中心、閉じた編成パネルの固定ボタンを除去 |
| Desktop | 7 | 8.5 | ASTRA WINS | ナビと作業領域が分かれ、幅を有効利用 |
| Tata DB | 7.5 | 8.5 | ASTRA WINS | 検索と結果を近接、65系統、コンパクト表示 |
| Tier | 7 | 8.5 | ASTRA WINS | 実表を静的HTMLの先頭側へ、根拠は展開 |
| Beginner | 7.5 | 8 | ASTRA WINS | 何をする→育てる→進化→編成の4ステップ |
| Tools | 7 | 8.5 | ASTRA WINS | 盤面優先、設定の段階的表示、共有互換 |
| Community | 7 | 7.5 | ASTRA WINS（閲覧設計） | 空状態でも価値を説明。投稿機能の利用可否はCurrentが勝つ |
| Calendar | 5 | 8.5 | ASTRA WINS | 従来soft 404だった直URLに独立ページ。毎日使う入口へ |
| SEO | 9 | 9 | TIE | 既存396 HTMLのH1・canonical・hreflang・robots・構造化データ一致 |
| Performance | 8 | 7 | CURRENT WINS | AstraはCLS改善、ただしCSSとTOP画像転送が増加 |
| Accessibility | 7 | 8.5 | ASTRA WINS | キーボード・シート・実投稿ARIA修正。自動検査の範囲内で評価 |
| Monetization | 7 | 6.5 | CURRENT WINS | Currentは実案件稼働、Astraは配置検証のみ。収益効果未測定 |
| Overall | 7.0 | 8.2 | ASTRA WINS（設計評価） | 上記15項目の単純平均、四捨五入 |

追加項目：Information clarity 6.5→8.5、Search 7.5→8、Evolution 7.5→8、Events 6.5→8.5。Overall平均には重複計上しない。

## Current winsを隠さない

- 軽量さ：TOP Mobile画像は約36.7KB→221.8KB。公式画像を初期表示する代償。追加CSSは圧縮前33,533Bで、初期25KB予算を8,533B超過した。3言語・細幅・シート・CLS予約のためのCSSを残し、採用判断時の縮小候補とする。
- 実際の収益化：Astraは広告モデルを検証するだけで、売上改善は証明していない。
- 本番投稿と馴染み：CurrentはCommunity/Board/Friendsへ投稿可能。Astraは安全のため読み取り専用。既存利用者がどちらを使いやすいと感じるかは未調査。

## 同条件の性能

Chrome headless、390×844 / 1440×1000、CPU 4倍減速、キャッシュ無効、新規context、同一機械・同一回線。A8/Analytics等第三者要求は両方で除外。各組合せ1回の探索的lab測定。転送はPerformance APIのencodedBodySize（圧縮body、HTTPヘッダー除外、初期画面まで）。画像はlazy loadingとviewport依存。実ユーザーCWV・INP・広告script稼働時の性能ではない。

| 390px ページ | HTML B Current→Astra | CSS B | JS B | Image B | LCP ms | CLS |
|---|---:|---:|---:|---:|---:|---:|
| TOP | 13945→14914 | 21640→29577 | 30561→29995 | 36657→221821 | 1060→920 | .030→.001 |
| Tier | 14997→15462 | 21640→29577 | 27248→24436 | 1687019→1687019 | 836→640 | .548→.001 |
| Team Builder | 6752→7182 | 27330→35267 | 58893→56157 | 93701→34681 | 700→1708 | .071→.004 |
| Events | 6231→6768 | 22537→30474 | 30320→24482 | 14867→1883 | 696→944 | .706→.003 |

| 1440px ページ | HTML B Current→Astra | CSS B | JS B | Image B | LCP ms | CLS |
|---|---:|---:|---:|---:|---:|---:|
| TOP | 13945→14914 | 21640→29577 | 30561→29995 | 237457→512545 | 1152→964 | .004→0 |
| Tier | 14997→15462 | 21640→29577 | 27248→24436 | 1742456→1744339 | 未取得→680 | .570→0 |
| Team Builder | 6752→7182 | 27330→35267 | 58893→56157 | 182399→82653 | 1132→1060 | .346→.012 |
| Events | 6231→6768 | 22537→30474 | 30320→24482 | 14867→14867 | 688→680 | .468→0 |

新Calendarは390pxでHTML4645B / CSS30474B / JS26863B / 画像1883B、LCP572ms、CLS0。1440pxはLCP528ms、CLS0。Currentの同URLは404内容のため同機能の性能比較対象にしない。Current Desktop TierのLCP observer結果0は未取得として扱い、0msと評価しない。Mobile Builder/EventsのLCPは今回の試行ではCurrentが速い。

## 見比べ方

Repository外の `../astra-evidence/comparison.html` がBefore/After比較ギャラリー。TOP・図鑑・Tier・Builder・Events・Calendar・詳細・初心者を6画面幅で切替。元画像はbefore/とafter/に各78枚。RepositoryにはPNGをcommitしない。

1. 両方のTOPを390pxで開き、探す場所が5秒で分かるか。
2. タタ名で検索し、Tier・進化・Compare・編成への移動を比べる。
3. Team Builderで同じ編成を作り、5モード、タッチ移動、保存・共有を比べる。
4. 今日／終了日時／次BossをCalendarで確認する。
5. Astraの `?ads=off` と `?ads=preview` を切り替え、読了後の広告枠を比較する。

物理iPhone Safariの慣性スクロール、ホームインジケータ、指でのドラッグ、長時間利用の疲れ、文字サイズの好みはHuman Verification。採用／一部採用／現行維持を人が決める。
