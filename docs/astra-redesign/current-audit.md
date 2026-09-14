# Current audit

## Control
- Production HEAD / initial local HEAD / origin/main: `6111788e392892c19a4452a3fb186cc97fc8bd45`
- Production deployment: `dpl_5y5wX8JXWhydYpLGEs5W23i3Z6W5` (READY, Git main)
- Backup tag: `pre-astra-redesign-20260915` (annotated, pushed)
- Branch: `astra-redesign-experiment`
- 既存monsaba-guide project: `prj_rc9C235IAF3GjmpcBLmO3igogfqQ`
- 空の作業フォルダへ `clone --no-checkout` 後、mainへファイルを展開せず専用branchへswitch。初期のdeleted表示はこのno-checkoutに由来し、利用者の削除ではない。
- Repository外 `../astra-evidence/` にGit状態、復旧bundle、Production sitemap、ブラウザJSON、78枚のBefore画像を保存。

## 実際に確認した能力
agent-browser 0.37.1でChrome起動・ナビゲーション・snapshot/DOM・viewport・screenshot・click・select・fill・hover・keyboard・scroll・lab vitals。同条件キャプチャはPlaywrightのChrome操作でも実行。最終QAでは独立Chrome contextを使い、実行中の別セッションと分離した。ドラッグ、視覚比較、axeの後続結果は最終レポートに記載。実機iPhoneは未接続。

## 巡回
TOP・図鑑・Tier・Beginner・takepanda/nusuke詳細・Evolution・Team Builder・Community・Events・Calendar・Search・Compare・My Monsaba・Zombie Rush・Chips・Boss Rally・Badge Dojo・Friends・Board。390/430/768/1366/1440/1920。画像とDOMを保存。

## 抽出した問題（15件）
1. `/events/calendar/` に実ファイルがなく、Productionは404内容をHTTP200で表示するsoft 404。
2. Eventsで月全体の予定が攻略一覧より前にあり、イベント攻略の探索が長い。
3. カレンダーへの常設の直通ナビがない。
4. TOPの図鑑が複数の目的別CTA・最新情報・広告導線の後ろに埋もれる。
5. TOPで同じ初心者/Tier/編成/イベントの入口が繰り返される。
6. TOPの検索とソートが図鑑から遠く、入力後の結果を同じ画面で追いにくい。
7. MobileのTOPでゲーム素材が見えず、画面が汎用的な文章リストに見える。
8. Tier初期画面の説明・目次が長く、390pxで実Tier表は下部にしか見えない。
9. Team Builder初期画面はチュートリアルと大量の設定が先行し、Desktopでも盤面が折り返し下にある。
10. Team BuilderのMobile選択ボタンが上中央に固定され、閲覧内容と競合する。
11. Team Builderでチップ設定一覧が盤面より先にあり、Zombieモードで配置操作まで遠い。
12. 図鑑や記事の多くのカードが同じ強さの枠で表示され、重要度が分かりにくい。
13. 最新データ65系統236体に対して、Header説明・OG・一部本文に64系統230体が残る（データは変更せずUIの新規件数は実データ使用）。
14. 初心者と進化ページは根拠が充実しているが、次の一手へ進むリンクより説明が先行。
15. A8のポイント/調査系案件は直接の攻略目的との関連性が弱い。新案件を捏造せず別タスクの候補とする。

## Currentの長所
65系統236体の豊富な静的本文、出典区分、独自Tierの明示、既存share互換、モードごとの保存、検索語の秘匿。これらは再発明しない。20ルート×6幅の測定ではviewport overflowは検出されていない。既存の実ユーザーによる馴染みはAstra版が勝ったと判断できない。

## Beforeの検証上の注意
初回validateはsitemap生成結果不一致。初回testは生成冪等性ハッシュで不一致。Windows改行と生成前の状態を分けて保存し、生成後の再実行で確認する。元からある失敗をAstra起因として数えない。

## Analyticsと広告
GA4タグあり。GA4/Search Consoleの集計コネクタはこのセッションに接続されていないため、PVや人気順位を推定で作らない。既存Vercelプロジェクト情報は取得済み。
`data/monetization.json`: adsEnabled=false、affiliateEnabled=true、low密度、sticky/slide/bottom/desktopRail=false。AdSense審査状態そのものはコードから断定不能。A8の配置はmajor記事でhero後と中盤、detail/compactで中盤。A8データはそのまま保存する。
