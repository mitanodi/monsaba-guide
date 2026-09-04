# UI/UX benchmark — 2026-09-04

調査日: 2026-09-04。外部サイトのHTML/CSS/JS・画像・記事本文は取得・転用せず、公開画面から情報設計の原則だけを整理した。

| Site | Pattern | 良い点 | モンサバへ採用 | 採用しない理由 |
|---|---|---|---|---|
| [GameWith](https://gamewith.jp/genshin/article/show/230360) | 冒頭の関連導線、役割別Tier、目次 | 検索流入後すぐ次の比較軸へ移れる | 目的別TOP、Tier mode、TOC | 広告配置・記事量は模倣しない |
| [Game8](https://game8.jp/genshin/352210) | 関連カテゴリ、更新履歴、評価基準 | ランキングの前提と変更理由を確認できる | 評価基準panel。履歴は実データができるまで非表示 | 架空投票・PV・変動履歴は禁止 |
| [AppMedia](https://appmedia.jp/starsavior/79517015) | 序盤関連記事、短いTier早見 | 初心者の次の行動が近い | BeginnerからMy Monsaba/Tataへ接続 | 他ゲームの評価内容は使わない |
| [アルテマ](https://altema.jp/sumaburaswitch/saikyoranking) | 評価基準の明示 | Tierを結論だけにしない | 独自評価・出典・更新日を一体表示 | 外部Tierの転載はしない |
| [Prydwen](https://www.prydwen.gg/nikke/tier-list/) | mode tabs、criteria、filters、character profile | 大量データでも文脈を失いにくい | 共有可能なmode state、compact cards、detail hero | 未実装mode・統計は作らない |
| [Mobalytics](https://mobalytics.gg/tft/tier-list/champions) | database filters、Team Builder優先 | 記事と操作UIの目的が明確 | Team Builderのapp layout、focus mode | 実在しない勝率・pick率は禁止 |
| [Maxroll](https://maxroll.gg/) | guideからplannerへの連続導線 | 読む→試すの切替が短い | 「次にできること」、tool CTA | 画面を覆う固定UI、複雑な装備概念は不採用 |
| [Fandom Help](https://help.fandom.com/wiki/Main_page_and_navigation) | 重要カテゴリを先に、具体的名称 | 初見でも分類を推測しやすい | 5カテゴリnav、breadcrumb、関連リンク | 重要本文をtabsだけに隠さない |

## 採用原則

- 情報アーキテクチャ: タタ / 攻略 / 育成 / ツール / コミュニティの5カテゴリ。
- Progressive disclosure: PC dropdown、mobile accordion、長文TOC、Tier criteria。
- Task first: TOPはサイト構造ではなく「今、何をしたい？」から開始。
- Tool first: Team Builderでは盤面・picker・保存共有を記事説明より優先。
- Trust first: 公式情報、ゲーム内確認、外部確認、独自評価、Community、確認待ちを文字付きbadgeで区別。
- Privacy: 検索履歴はlocalStorage最大5件。検索語・Tata名・formation・自由文はAnalyticsへ送らない。

## 30項目の採否

1–13、15–30は実装。14「Tier変更履歴」は信頼できる履歴SSOTがないため表示しない。将来データが整ったときだけ実装する。7はPVを取得せず「注目攻略」と明記。25はmobile bottom sheetを採用。mobile bottom navigationは主要行動を5個に限定しmenuと重複しないため採用。
