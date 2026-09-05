# Full-site interaction audit — 2026-09-06

開始HEAD: `14039956b7de58b3fd7b60631091105c05a8a107`。main と origin/main 一致を fetch 後に確認。

ASTRA_CONFIRMED は利用可能な Codex in-app browser による UI/DOM 操作の確認を指す。物理 iPhone の確認ではない。
使用機能: navigation, accessibility tree, DOM read-only inspection, click, text input, select, viewport override, screenshots.
実装済みの API 文書を確認して使用。タタ選択では AX の checkbox 表示と HTML button の違いを確認し、実DOMに合わせて操作。

改善前: 15ルート × JA/EN/zh-CN × 390/1366px = 90状態。
各状態で確認したのはタイトル、H1（390px）、ページ横幅、読み込み済み画像の破損、AXツリー。巡回だけでは interaction PASS としない。
スクリーンショット90枚はローカル `C:/Users/asahi/.codex/visualizations/astra-monsaba-audit-20260905` に保存。Gitへ大量PNGを追加しない。

対象: TOP, Tier, Beginner, Evolution Priority, Search, Compare, My Monsaba, Team Builder, Community, Events, Zombie Rush, Chips, Consult, Friends, コパンダ系詳細。

| ID | Route / Locale / Viewport | Severity | Issue / Actual | Expected | Evidence | Root cause / Fix | Risk / Status |
|---|---|---|---|---|---|---|---|
| A01 | /team-builder/ JA 1366 | A | 自由6体→道場5体→自由5体。確認なしで1体喪失 | 元モードへ戻すと6体復元 | ASTRA_CONFIRMED: 6系統を選択・1行目に配置して往復 | CODE_CONFIRMED: mode変更直後sanitizeTeamで上限超過を削除。モード別草稿を先に永続保存 | 保存/Undo/共有の回帰確認が必要。修正中 |
| A02 | /team-builder/ JA 390 | B | ボスラリーで新規編成後、selectはZR、見出しと上限はBoss 0/15 | selectと盤面の一致 | ASTRA_CONFIRMED: new操作後AX | CODE_CONFIRMED: persistDraftが古いDOM値をteamへ書き戻し、新規操作がrender後にselect変更。stateを正としrenderで同期 | Undo/Redo・保存読込も検証。修正中 |
| B01 | / JA 390/1366 | B | 編成メーカー紹介はZR専用に見える | 5modeとZR専用設定の説明 | ASTRA_CONFIRMED: TOP紹介文 | 対象コピーの更新候補 | SEO title/H1は維持。未修正 |
| B02 | /team-builder/ JA 390 | B | 保存0件で「保存できる編成は最大10件です」のみ | 未保存と次の操作を説明 | ASTRA_CONFIRMED: 保存した編成section | empty stateと上限エラー文の兼用を分離 | 3言語コピー。修正中 |

CODE_CONFIRMED: 非ZRの「みんなの編成へ投稿」は内部でmodeをZRへ上書きしてencodeする。投稿を行わずコードで確認。ZR専用の投稿UIとして他モードでは非表示にする。

検索: JAの検索欄にコパンダを入力→2結果。グローバル検索ダイアログでタケパンダを入力・送信→3結果。最初のAX setValue試行は入力イベントの差で結果なしとなったため、Playwright fillで再確認しサイト不具合とは判定しなかった。

## 修正・再検証記録

上表は発見時の記録。下記が最終的な修正状況。

| ID | 重要度 | 原因と修正 | ローカル再検証 |
|---|---|---|---|
| A01 | A | モード別草稿を切替前に保存。保存失敗時は切替を中止 | Free15→Dojo5→Free15、ZR P1=4/P2=2→Normal4→ZR4/2、再読込、共有URL復元、Undo/Redo成功 |
| A02 | B | stateを正として名前・modeを描画で同期。新規は現在modeを維持 | selectと見出し・上限の一致、Undo/Redo成功 |
| B01 | B | TOP紹介を5モード・モード別草稿に変更。ZR専用項目は明記 | 3言語で表示、title/H1は維持 |
| B02 | B | 保存0件の説明と保存上限エラーを分離 | 次の保存操作が分かる空状態を表示 |
| A03 | A | 英語属性5ページのflex子のmin-width:autoと長語で横にはみ出す。min-width:0と見出し改行を適用 | fire/grass/rock/thunder/water、320/390/1366でscrollWidth=clientWidth |
| A04 | A | 盤面のpointer capture先が親divで通常clickが編集buttonに届かない。capture先をbuttonに統一 | スズメラをclick→編集、移動・入替、削除、Undo成功 |
| A05 | A | native dragstart後のpointercancelがnative drag payloadまで消す。pointer gestureが残る場合のみclear | PCでスズメラを1行2列→1行1列へ画像ドラッグ成功 |
| B03 | B | 非ZR投稿ボタンが内部でmodeをZRに変換。非ZRで非表示、handlerもガード | 非ZR投稿button不可視、ZRのみ表示。投稿自体は行わない |
| B04 | B | 属性ページの冒頭説明に部分翻訳が混在 | 5属性の冒頭説明をEN/zh-CNの完全な文に置換。攻略データは変更しない |

発見した根本原因単位: A 5件、B 5件、C 0件。A03は影響5routeを1件として数える。サイト全体に未知の問題がないという意味ではない。

## 実操作の範囲

- 主要15route × 3locale × 390/1366pxのbefore/after計180状態を比較。afterは横はみ出し・読み込み済み壊れ画像・H1異常0。
- 追加幅: 320/375/430/768/820/1024/1440/1920のTOP、Team Builder、Compare（24状態）。幅390等はviewport幅で、Windowsの縦スクロールバー分clientWidthが15px小さくなる。
- 全384のindex.html routeを390幅のブラウザーで描画。最初に英語属性5件のoverflowを検出、全件読み込み済み画像破損0。修正5件を320/390/1366で再確認。
- `scripts/audit-astra-routes.mjs`: 全384routeのHTTP、title、H1、canonical、indexableのhreflang、内部リンク・画像参照を確認。サイトの生成対象は404を含め129×3=387HTML、通常routeは384、indexableは354。
- Tier: 通常＋火で5評価済み系統、評価保留は別枠。Beginner: 早めのT3で3候補。Events: 確認済みで2件。既存情報構造・評価値は変更しない。
- Compare: コパンダ/ベロパカの2体選択→比較、2列結果とURL query反映。
- Consult: 初心者質問ボタン→3つの早期T3候補・根拠・次の関連リンク。生成AIではない表示を維持。
- Chips: 最初の効果detailsを開き、効果本文とPDF出典が表示。ゲーム内数値は編集しない。
- Mobile Picker: 検索→T1選択→自動収納、再表示、Escape収納。アニメーション直後のisVisibleだけで判定せず、完了後classも確認。
- Mobile Drag: 選択中フグマル画像→5行4列、選択中ホネギョ画像→1行2列へ配置成功。viewport模擬であり物理iOSのtouch検証ではない。
- PC Drag: nativeドラッグ修正後、スズメラの1行2列→1行1列をaria-labelで確認。
- 共有: 15体のURLを生成し別ページ経由で復元。テキスト/DiscordのUI操作、16:9画像の成功通知を確認。OSクリップボードの実内容と全画像比率の端末保存結果までは未確認。
- EN: Dojo/Free、zh-CN: Normal/ZRを実操作。非ZRの1人表示、ZR P1/P2と設定表示を確認。
- Community: 本番一覧API200・0件、UI空状態・絞込を確認。偽投稿、helpful、trial、comment等の書込み0。実投稿カードや別端末往復は未検証。

## 維持した設計と残る確認

既存の目的別ナビ、TOP導線、タタ一覧/個別、Tier根拠、初心者優先度、検索/比較、Events状態分離は維持。大規模な見た目の置換は行わない。競合から採用/維持する考え方は `astra-competitor-ux-benchmark.md` に記載。

Accessibility: 名前付きボタン、スキップリンク、selectとlabel、編集dialog、Escape、Undo/Redoを点検。包括的なWCAG適合やスクリーンリーダー実機試験は未実施。
Performance: 新しい依存・大型画像・フレームワーク追加0。ブラウザーで主要routeを反復して読み込み、render/layoutを確認。LighthouseスコアやフィールドCore Web Vitalsの測定値は未取得であり、改善率は主張しない。

HUMAN_VERIFICATION_REQUIRED: 物理iPhone Safariのtouch/キーボード/safe-area、OS保存画像・Discord実貼付、実Community投稿後の2端末検証。投稿0件のためmulti-mode Communityは設計のみ（mode discriminator、mode別上限、ZR専用設定、既存ZR互換が必要）。実データなしの大規模投稿UI変更はしない。

ローカル検証: `npm run generate:site`、`npm test`、`npm run validate`成功。npm test内の全生成idempotency成功。並行生成中の中間HTMLを検証して出た一時エラーは、生成/検証を直列に再実行して解消。公開後の記録は追記する。

## 公開後検証と54項目の報告

実装修正をmainへpush。既存Vercel Git Integrationのみを使用。Production READY・独自domain alias・commit SHA一致を確認。
本番でFree15→Dojo5→Free15、編集dialog、PC盤面画像移動、モバイル選択後収納、選択中画像→5行4列への配置を再確認。監査前に控えた4体Boss編成を共有URLで戻し、名前欄の入力操作で端末草稿にも再保存した。ユーザーの元のブラウザーtabは操作しない。

| # | 項目 | 結果 |
|---|---|---|
| 1 | 開始HEAD | `14039956b7de58b3fd7b60631091105c05a8a107` |
| 2 | 実装完了HEAD | `0a81205efc3354fad5dcf3c022ec26c6111584e8`（本節は公開後追記） |
| 3 | Astra機能 | in-app browserのnavigation/AX/DOM読取/click/fill/select/key/drag/viewport/screenshot/console |
| 4 | route数 | 全384、自動metadata対象354indexable。主要15×3localeを詳細比較 |
| 5 | viewport数 | 10幅。全routeは390、主要は390/1366、他幅は代表3route |
| 6 | JA | 主要15routeのbefore/local-after/production、編成・検索等の実操作 |
| 7 | EN | 同じ主要15route、mode操作、5属性overflowとlead修正 |
| 8 | zh-CN | 同じ主要15route、mode操作、5属性lead修正 |
| 9 | A before | 5原因 |
| 10 | A after | 検出した5原因を修正・再検証、既知残存0 |
| 11 | B before | 5原因 |
| 12 | B after | 検出した5原因を修正、既知残存0 |
| 13 | C before | 0（未検出を完全性の保証としない） |
| 14 | C after | 0 |
| 15 | Navigation | 既存目的別構造を維持。モバイル開閉・Escape確認 |
| 16 | TOP | 編成ツール紹介を5mode・mode別保存へ更新、3言語反映 |
| 17 | Tata一覧 | 既存構造維持。検索・読み込み済み画像検査 |
| 18 | Tata detail | ゲーム情報維持。64系統の全route描画、詳細代表を3言語で比較 |
| 19 | Tier | 順位変更なし。通常＋火filterを実操作、評価保留を維持 |
| 20 | Beginner | 育成値変更なし。早めT3の3候補を確認 |
| 21 | Search | page検索・global検索成功。新たな検索仕様変更なし |
| 22 | Compare | 2体比較・query反映成功。既存2列を維持 |
| 23 | Team Builder | mode草稿、state/DOM同期、click/native drag、投稿guard、空状態修正 |
| 24 | Mode安全性 | 15→5→15、P2一時非表示→復元、再読込、URL復元、Undo/Redo |
| 25 | Mobile Picker | 自動収納・再表示・Escapeを確認。×閉じるは既存維持 |
| 26 | Mobile Drag | ローカル上段/下段、本番下段で選択画像から配置成功。物理touch未確認 |
| 27 | PC Drag | 本番でスズメラ1行2列→1行1列成功 |
| 28 | Community | 非ZR投稿を防止。実投稿0、偽投稿0。multi-modeは設計のみ |
| 29 | Events | 状態filterを確認。開催日・ゲーム情報は変更なし |
| 30 | Design System | 既存を維持。flex min-widthと長語折返し、hidden button修正 |
| 31 | Accessibility | label、dialog、keyboard等部分確認。包括WCAG監査未実施 |
| 32 | Performance | 新依存/大型画像0。反復描画確認。定量CWV/Lighthouse未測定 |
| 33 | SEO | validate成功、canonical/hreflang・354indexable維持。意図的title/H1変更なし |
| 34 | Analytics | GA4 privacy/重複検査成功、計測コード自体は変更なし |
| 35 | 公式画像 | 225 verifiedを維持。公式原本変更なし |
| 36 | pending | 5維持: nenbutsuhebi T4 / pakuma T2,T3,T4 / sukedako T4 |
| 37 | Broken links | 生成・参照検査0、本番全384HTTP成功 |
| 38 | Broken images | ローカル全384・本番代表90の読み込み済み画像破損0 |
| 39 | Overflow | 本番代表90異常0。修正英語5routeを320幅でも0 |
| 40 | Console errors | 最終本番巡回tabのerrorログ0 |
| 41 | API errors | Community read API200/0posts、Friends reloadで一覧表示。新deployment error/fatalログ0（確認時点） |
| 42 | generate | 成功 |
| 43 | validate | 成功 |
| 44 | tests | 全npm test成功 |
| 45 | idempotency | 最終成功。翻訳辞書更新後のasset hash収束を再生成で確認 |
| 46 | GitHub Actions | [Validate site成功](https://github.com/mitanodi/monsaba-guide/actions/runs/33977534455) |
| 47 | Deployment | `dpl_AUAirX87GRuMm7NKuLFCxXCyFn6P` |
| 48 | Production | READY、monster-survival.com alias、Git source、build約13秒、frameworkなし |
| 49 | working tree | 実装push後は既存untracked promo/のみ。本節は報告追記commit |
| 50 | promo | 未操作・未stage |
| 51 | chigonoki | 未アクセス・未変更 |
| 52 | AdSense | 未変更、adsEnabled:false維持 |
| 53 | ads.txt | 未変更 |
| 54 | A8 | 承認コード/遷移先/計測/配置設定未変更、affiliateEnabled:true維持 |

ASTRA_CONFIRMEDは本書の実操作と描画検査のみ。CODE_CONFIRMEDは草稿保全・mode上限・投稿guard・SEO/データ/計測の自動検証。HUMAN_VERIFICATION_REQUIREDは上記の物理実機・OS保存・実投稿後の確認。未検証項目を合格扱いしない。
運用監視: 今回deploymentのerror/fatalを直近1hで照会して0件。継続監視automation/新Drainsは作成・変更していない。
