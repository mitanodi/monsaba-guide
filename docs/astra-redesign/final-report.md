# Astra 全面再設計実験 — 最終報告

> Finalization追記：今回の性能・広告再監査は [finalization-report.md](finalization-report.md)、[final-performance.md](final-performance.md)、[monetization-plan.md](monetization-plan.md) を参照。以下はInitial完成時の記録。広告実配信はJA 4ページのみと再確認し、設定上の候補と区別した。

実装とPreview検証が完了。**mainへmergeしていない。Productionには反映していない。採否は未決定。**

【現行サイト】https://monster-survival.com/

【Astra実験版】https://monsaba-guide-cjzzc6lt3-qyr2qqggjs-6136s-projects.vercel.app/

既存Vercel認証を維持している。所有者ログインで閲覧。一時共有リンクは最終回答に提示（約23時間有効）。

## 要求された42項目

| # | 項目 | 結果 |
|---:|---|---|
| 1 | Current HEAD | `6111788e392892c19a4452a3fb186cc97fc8bd45`。開始時・最終origin/main・Production deploymentのGit SHAが一致 |
| 2 | Backup Tag | `pre-astra-redesign-20260915`。annotated tagをremoteへpush。復旧Git bundleと初期Git状態をRepository外へ保存 |
| 3 | Experiment Branch | `astra-redesign-experiment`。最終実装HEAD `8d5338032a06045e3b34b5af72b8bcbd836d6035`。性能と比較画像の計測HEADは `1f410b66a8516077e1a85488bf852b09c3d8b585`。最終追加で言語セレクターのイベント接続を修正。報告書込み最終HEADは回答に記載 |
| 4 | Preview URL | 上記。既存project `monsaba-guide`、最終実装deployment `dpl_AT3J1qMLvQRBRSrXzDaA1b6n3Gqq`、target=null、READY。新projectなし |
| 5 | 実際のAstra機能 | Chromeブラウザ、DOM/snapshot、Screenshot、6/8幅responsive、click/tap/fill/select、scroll、hover、keyboard/Escape、desktop drag、CDP touch drag、clipboardとshare読込、画像目視比較、lab Performance API、axe |
| 6 | Current問題数 | 15件。詳細はcurrent-audit.md。内容の正確さや保存互換などCurrentの長所も記録 |
| 7 | 再設計方針 | 「探す→判断→育成→編成→今日の予定」。検索・図鑑・Calendar・編成を中心とする。非公式表示を維持 |
| 8 | Header | ブランド／非公式／検索／言語。カテゴリの羅列を分離 |
| 9 | Navigation | Desktop左ナビ。Mobile下部はホーム・タタ・Tier・予定・編成。補助カテゴリはMenu内、検索はHeader常設 |
| 10 | TOP | 公式Creator Assetsのhero、検索、今日／次Event／次Boss、図鑑、4ステップ導線、補足コンテンツは展開 |
| 11 | Tata DB | 実データ65系統236体。画像カード、近接検索・属性filter・sort、compact切替。静的カードも保持 |
| 12 | Tata Detail | 強み・育成目安・モード評価を早い位置へ。進化・スキル・根拠の既存データを保持 |
| 13 | Tier | 実Tierを静的HTML段階で前へ。評価説明を展開。モード・属性切替と全データを維持 |
| 14 | Beginner | 行動→育成対象→育成段階→編成の4ステップ。本文と初心者導線を保持 |
| 15 | Evolution | 優先度データを変更せず、判断から編成までの次の一手を明確化 |
| 16 | Search | 既存サイト検索を中心導線へ。Header／heroから検索dialog。検索結果・キーボード操作を確認 |
| 17 | Compare | 同じ2系統の選択・swapを実操作。既存仕様を統一UIで利用 |
| 18 | Team Builder | 盤面優先。5モード、折り畳み設定、Player/チップ詳細、Mobile sheet、Desktop2ペイン。保存・復元・共有・互換を確認 |
| 19 | Community | 正直な空状態、使い方と投稿価値を表示。実投稿の読み込みを確認。Preview投稿・編集はサーバーでも拒否 |
| 20 | Events | 攻略ハブ＋現在と次回の短い日程カード。月全体のCalendarと役割を分離 |
| 21 | Calendar | `/events/calendar/` を3言語で新設。既存計算とconfigを使用。今日、切替日時、次回、月移動。未確認の周期を捏造しない |
| 22 | Mobile | 320/375/390/430/768。390px touch emulationでtap・sheet開閉・drag・mode switch成功。実機未接続 |
| 23 | Desktop | 1366/1440/1920。左ナビ、読み幅上限、編成2ペイン。固定UIと主要操作の重なりを修正 |
| 24 | Design System | astra.cssにcolor/type/spacing/radius/border/shadow、card/button/badge/tabs/input/modal/sheet/tooltip/status/tier/attributeの共通規則。Inter等はsystem fallback、巨大frameworkなし |
| 25 | Accessibility | 54ページ・3言語でaxe WCAG A/AA/2.1AA検査、検出0。Focus、Escape、focus return、reduced motion。自動検査が障害当事者による評価を代替するとはしない |
| 26 | Performance | 追加CSS33,533B、共通JS5,079B、日程JS1,730B（非圧縮）。CSS初期25KB予算超過を明記。lab CLS0〜.012、転送/LCPはcomparison.md。INP field未計測 |
| 27 | SEO | 既存396 HTMLのH1/canonical/hreflang/robots/構造化データが一致。URL変更なし。sitemap360→363は新Calendar3言語のみ。主要本文は静的。Preview専用HTTP noindex/nofollow |
| 28 | Affiliate配置 | LIGHT/BALANCED/REVENUEを比較しBALANCED候補。最大1枠、記事終了後、PR/広告ラベル、領域予約。off/preview切替 |
| 29 | AdSense候補 | 読了後slotのみ将来候補。adsEnabled=false保持。審査中/不合格などのアカウント状態はコードで断定不能。account設定変更なし |
| 30 | A8候補 | 現行ポイント/調査案件の適合性を課題として記録。ゲーム環境等への案件変更は別タスク候補。具体案件を創作・差替えしていない |
| 31 | 広告を置かない | Calendar、Search、Team Builder、Community、Compare、My Monsaba、Board、Friends。盤面や操作を遮らない |
| 32 | JA | 新UI対応、390px操作、全主要ルート検証 |
| 33 | EN | 新UI明示翻訳、長いHeader/Tier件数の折返し修正。未確認固有名詞を新たに翻訳しない |
| 34 | zh-CN | 新UI対応、同じdata・ルール・URL階層。主要ルート検証 |
| 35 | Tests | generate / validate / npm test / idempotency / HTTP smoke成功。追加回帰6件。最終実装GitHub CI `34897344647` SUCCESS。HTTP101 pages・5 JSON・25 Hero |
| 36 | Astra QA | 54ルート×8幅=432条件、横overflow0、broken image0、console/page error0。操作10群＋追加4群成功。Previewの12種類のAPI書込み要求はすべて405で拒否 |
| 37 | Before score | 7.0 / 10（15項目平均）。主観評価の基準をcomparison.mdに記載 |
| 38 | After score | 8.2 / 10。同条件の実操作と画像比較に基づく設計評価。利用者満足度の統計ではない |
| 39 | Current wins | Performanceの転送量、実案件の収益化準備、投稿できる本番機能、既存利用者の慣れ |
| 40 | Astra wins | Navigation、TOP、視覚的な階層、図鑑の探索、Tier到達、編成の作業面、Calendarの入口・専用ページ。SEOは引分け |
| 41 | Human Verification | 物理iPhone Safariの指触り・慣性・safe area、文字サイズ、5秒での理解、広告密度、慣れた導線との比較。採用/一部採用/現行維持 |
| 42 | Production変更なし | 最終domain照会も `dpl_5y5wX8JXWhydYpLGEs5W23i3Z6W5` / main SHA6111788。main checkout/merge/push、Production deploy、AdSense account、A8正本、実DB、promo/、chigonoki変更なし |

## 反復した改善

V1で全体構成、静的変換、共通tokenを実装。V2のブラウザ監査で、ナビの描画、細幅overflow、コントラスト、カードのnested interactive、編成設定の配置、Mobile sheetを修正。

V3の実Previewでは、本物のCommunity投稿に含まれる空きマスのARIAを修正。Tierをclientで移動する際のCLSを静的な配置変更で解消し、Calendarと盤面の読込み領域を予約。閉じたシートの固定ボタンが盤面を遮る問題も解消した。英語生成の冪等性を修正し、再実行で安定を確認した。最終の補助操作テストで、Headerへ移した言語セレクターを旧nav配下だけから取得していた問題を修正し、JA→EN→zh-CN→JAの操作検証を追加した。

## 証拠と成果物

- [設計思想](design-proposal.md)、[現行監査](current-audit.md)、[広告配置設計](monetization-plan.md)、[採点・性能比較](comparison.md)、[QA集計](qa-summary.json)。
- Repository外 `../astra-evidence/`：初期Git記録、Production sitemap、復旧bundle、Before78/After78 PNG、画面幅切替可能な `comparison.html`、ブラウザQA/性能JSON、テストログ。
- Before/After主要5ページ：TOP、Tata DB、Tier、Team Builder、Events。比較ギャラリーでは390/430/768/1366/1440/1920を切替できる。
- 本番のCommunity等へのテスト投稿は0。空状態の検証はブラウザ内のGET mockのみ。My Monsabaと編成保存は分離したPreview origin/テストcontextで確認。

## 制限と採用前の判断

全体の設計実験として完了しているが、実機の触感・収益・実ユーザーINPは未検証。CSS予算とTOP画像転送は増加。Legacyの本文/OGに残る64系統等の記述は、今回SEO identityを保持するため変更範囲を分けている。新UI件数は正本の65系統236体。

Productionへの移行は別タスク。Preview専用のnoindexと広告・投稿停止をそのまま本番化せず、採用範囲・保護設定・差分を再監査する必要がある。破棄する場合は実験branchを削除すればProductionに影響しない。復旧tagは保持する。

**ユーザーの明示的な採用指示があるまで、mainへのmerge・Production反映は行わず停止する。**
