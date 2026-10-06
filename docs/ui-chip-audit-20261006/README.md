作業ブランチ: fix/ui-chip-audit-20261006。同期元 main f75a219930ed9f9808ce895c279ed0d7a51f23f7。既存checkout/別作業ブランチは編集せず、新規workspace内cloneを使用。push/本番デプロイ未実施。

Libraryの元スクリーンショット3枚と追加Tier画像1枚をPCに実体化してview_imageで実ピクセル確認。現行転送helperはWindowsでos.setxattr未実装により失敗したため、helper本体を変更せずNTFS名前付きストリームで属性保存/読取検証する互換ラッパーを使用。全4ファイルのバイト数とLibrary ID/version属性を確認済み。

チップ参照は https://w.atwiki.jp/monstersurvival/pages/128.html （モンスターサバイバル@wiki、チップ一覧。表示上の最終更新2026-09-27 22:55）。49行の画像URL・効果文をDOMから記録。各素材URLはchip-sources.jsonを参照。

名前は49/49でファイル名と現行名が対応（I/II/III表記の正規化を含む）。これは実画像49/49一致の意味ではない。画像の実ピクセル比較を完了したのは糖分補給IIIの1件のみ。現行はキャンディ絵部分の切り抜き、Wikiは同じ絵を使い名前とカード外枠を含む全体画像。取り違えはこの1件では認められず。残り48種は未比較。

取得の制約: Node fetchでチップ一覧URLがHTTP403。アクセス拒否を迂回せず。この後の通常ブラウザでpageAssets一括取得は長時間応答せず中断、downloadMediaによる単一画像取得は成功したが約20分を要し短い指定タイムアウトが効かなかった。追加取得中止。フルページスクリーンショットもUnable to capture screenshot。これらの取得不能を一致扱いにしない。

素材条件: https://atwiki.jp/tos の第11条（知的財産権）を確認。公開画像だから第三者の転載が一律許諾されるとは読めず、対象Wiki側にも採用できる明示ライセンスを確認できなかった。著作権者・切り抜き加工者の許諾は未確認。Wiki画像はサイトへ追加せず、既存ユーザー提供ゲーム内PDF由来素材を継続。転載には条件確認が必要。公式Creator Assets manifest 9,726件を検索。chip語の候補はChipmunkのキャラクター素材など、sugar候補はsugar_cake（食べ物）で、チップ同一素材の確定候補0。official-asset-search.jsonに記録。名前検索だけで全画像の不在を断定していない。

効果差分候補（現行は2026-08-30ゲーム0.46.1、Wiki/既存9月23日テスト告知との比較）:

| チップ | 現行 | Wiki/告知候補 |
|---|---|---|
| サボる | 90秒 | 40秒 |
| ボスキラー | 25% | 20% |
| マーベリック | 20% | 35% |
| 後方支援 | 30% | 解説45%、効果表30%（Wiki内不一致） |
| 芝生のお手入れ | 50% | 40% |
| アップグレード | +1レベル | +2レベル |
| 別れの贈り物 | 200個 | 40個 |
| 戦略的移動 | 20秒 | 30秒 |
| バケツ理論 | 10% | 告知15%、効果表10%（Wiki内不一致） |

これら9件は既存season-2-test-preview.jsonに未本実装確認として記録されている差分と対応。今回ライブのゲーム画面や公式確定告知は取得できていないため、chips.jsonの確定値・出典状態を変更せず。ほか40件は表記差を除き効果文の意味上の変更候補なし。

追加役割別Tier: data/zombie-rush/position-tiers.json、ユーザー提供IMG_9021.pngに基づく47役割エントリ。前衛19、中衛7、後衛21。SS/S/A/B/C/未評価の原文ランクと順序を維持。役割間の平均や未記載タタへのランク補完なし。シズクシ・ブラピ・イルカはfamilyId=null、名称対応確認中で推測リンク/画像なし。既存統合ゾンビ評価は閉じた参照detailsに保持。総合・通常・道場・初心者データ変更なし。今後のTier制作のクレジットとして始祖 https://x.com/twx84 を表示し、現存全評価の制作・監修は帰属させていない。

UI修正: 図鑑カードの余白を含む全体を個別詳細へのネイティブリンク化（app.jsと静的生成元）。#tatari/#family系ハッシュ・history変化に応じPC/モバイルナビのaria-currentを更新。サイト内検索inputの汎用枠/フォーカス指定に勝つ専用CSS、外枠blue focus-within、スマホdialog内余白16px。

検証状況・残作業:

- 元スクリーンショット4枚のローカルファイルと実ピクセルを確認済み（task/screenshots/reference-0.jpeg～reference-3.png）。
- PCブラウザ：図鑑導線でURLが/#tatari・スクロール位置が変わること、66カードが個別詳細への単一リンクとして描画されること、図鑑のaria-current、検索ダイアログ開く/入力を確認。pc-catalog.png/pc-search.pngは途中の実表示証拠。最終focus CSSの実画面再確認前にブラウザ操作ツールが利用不能となった。
- 実ブラウザ未確認：カード右上余白の実クリック、戻る/進む、検索閉じる/再検索/Tab/Escape、役割切替と複合検索、スマホ表示・余白・横はみ出し、チップ選択/配置/共有/保存PNG。テストコードでの確認を、これらの実操作確認済みとは扱わない。物理端末も未確認。
- ナビのunit回帰：3言語の#tatari/#family-、popstate/hashchange、タタ詳細・ボスラリー既存選択を実際の初期化コードで検証。
- 役割別Tierの回帰：47原文エントリ/順序/役割間の独立性/3未確定名称/3言語の静的カード・リンク・旧評価参照欄を検証。data/tata-tier.json、data/zombie-rush/chips.json、ゲーム正本・広告/GA4設定・編成codec/保存キーは変更なし。
- generate:siteの再現性エラーはEN/zh-CNの名称一覧2ページ。generate:tatari-namesが翻訳更新前の検索HTMLをテンプレートとして読んでいたため、generate:i18nの直後へ移動。全npm testで生成前後一致(A=B)と再生成一致(B=C)が成功した。Windows UNKNOWN/openや一時的な未完生成の失敗ログはtask内に残すが、成功確認とは混同しない。
- 外部投稿、issue7返信、push、本番デプロイなし。既存checkout/feat/tata-assets-20261006/chigonoki/promoは不変更。Obsidianの最新プロジェクトノートは参照のみ。

主な編集元：app.js、site.js、astra.js、styles/astra.pcss、scripts/generate-core-pages.mjs、scripts/generate-tier-pages.mjs、scripts/lib/tier-board.mjs、scripts/lib/position-tier-board.mjs、scripts/validate-site-data.mjs、data/zombie-rush/position-tiers.json、data/i18n/en.json/zh-CN.json、tata-tier/tata-tier.js、tata-tier/tier-boards.css、package.json、tests/tata-tier.test.mjs、tests/position-tier.test.mjs、tests/site-navigation.test.mjs。生成CSS・全体asset-version付きHTML・監査JSONはこれらに対応する生成物。

今後の更新：役割別評価はposition-tiers.jsonのentriesを更新。position/front-middle-rear、tier、原文sourceName、確定済みfamilyId、order、source provenanceを揃える。未記載の系統へランクを補完しない。未確認3名称を解決する時はユーザー確認に基づきfamilyId/statusを変更し、対応する元資料fixtureと3言語生成結果を再検証。始祖の表示はfuture-tier-creationの範囲を維持する。

最終自動検査（2026-10-06）：npm.cmd test成功、38スクリプト群・403テスト・失敗0（生成A=B/B=Cを含む）。npm.cmd run validate全項目成功。git diff --check成功。asset version 1a87d3028bf1、369 indexable URLs、66系統/240体、broken link/image 0。ログはtask/tests-final.log、task/validation-final.log、task/generation-final.log。実ブラウザ未確認事項は上記のとおり残る。

ローカルレビューcommit: fix/ui-chip-audit-20261006。最終保存時にworking tree cleanを確認。437変更ファイルには全411 HTMLのasset-version同期を含む。保護対象のゲーム/チップ/従来Tier正本、広告設定、編成core、promoにcommit差分なし。ローカルQA用127.0.0.1:8765のLISTENは最終netstat確認時に存在しなかった。一時ブラウザviewport overrideのresetは操作ツール不在により未確認。

権限/取得診断：git実行時にC:\Users\asahi/.config/git/ignoreのPermission denied警告が出たが、commit・status・テストは成功。サンドボックス内のGet-CimInstance Win32_Process読取はアクセス拒否となり、権限付きの同読取にも識別可能な結果がなく、未知のNodeプロセスは停止していない。HTTP403のWiki取得を偽装User-Agent/認証/別経路で回避していない。ブラウザ素材取得は、アクセスできていた通常表示ページからの依頼済み保存として実施。
