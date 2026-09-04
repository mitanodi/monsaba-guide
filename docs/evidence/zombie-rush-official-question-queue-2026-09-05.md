# Zombie Rush 公式確認質問queue（2026-09-05）

運営チームへ送信する前の内部整理。回答を得るまで、ここにある数値・条件を公式仕様とは扱わない。

| 分類 | 現在サイトでの扱い | 現在の根拠 | 公式へ確認したいこと | 回答後の更新先 |
|---|---|---|---|---|
| A. Season仕様 | Season 1のゲーム内変更と当サイト予測を分離表示 | `data/zombie-rush/seasons/season-1.json` と予測台帳 | Seasonの開始・終了条件、切替時刻、地域差、継続ルール | season JSON、Zombie Rush本文、更新履歴 |
| B. Difficulty仕様 | 難易度1〜4を編成投稿メタデータとして選択可能 | `team-builder/team-core.js` の現行UIモデル | 難易度段階の正式名称、解放条件、敵・報酬への影響 | Team Builder、Community、Zombie Rush本文 |
| C. 報酬仕様 | 未確認の開催期間・報酬は断定しない | 公開ページのHuman Verification表示 | 難易度・Round・Season別の報酬、受取条件、更新周期 | Zombie Rush本文、関連データ、FAQ |
| D. Chip効果 | 49種の名称・効果をゲーム内資料から表示 | `data/zombie-rush/chips.json`、ゲーム内PDF | 各Chipの対象、重複、上限、発動順、Season更新時の扱い | chips JSON、Chip図鑑、Team Builder |
| E. Tata配置上限 | 盤面全体は6×6、空きマスを含む | Team Builderの現在のUIモデル | 1チーム全体の正式な配置上限と盤面制約 | `team-core.js`、Team Builder説明 |
| F. Playerごとの配置上限 | Playerごとに基本10体、設定ONで11体 | `BASE_PLAYER_LIMIT=10` / `MAX_PLAYER_LIMIT=11` | 正式上限、Player間の制約、同一系統の重複可否 | `team-core.js`、Team Builder UI/検証 |
| G. 上限解放条件 | 「配置上限+1」「Lv上限+1」を取得済み前提の手動設定 | Team Builderの設定UI | 各+1の正式名称、取得条件、Season持越し、Player単位か | Team Builder UI、共有schema説明 |
| H. Tata Lv上限 | 基本Lv7、設定ONでLv8 | `BASE_LEVEL_LIMIT=7` / `MAX_LEVEL_LIMIT=8` | 正式Lv上限、Lv8解放条件、Season・Difficulty差 | `team-core.js`、Team Builder、Zombie Rush本文 |
| I. Round関連 | 最高Roundを0〜9999の投稿メタデータとして保持 | Community共有schemaの入力制約 | Round進行、クリア条件、上限、途中参加、報酬判定 | Team Builder challenge、Community、Seasonデータ |
| J. Team Builder採用仕様 | 2 Players、各最大3 Chip、Player別上限、同Player内同系統重複不可 | `team-core.js` の現行モデルとゲーム内資料 | 2 Players・3 Chip・重複制約・配置/Lv上限が現行正式仕様か | `team-core.js`、関連tests、3言語UI |

送信時は一度に内部仕様全般を求めず、1テーマごとに画面と現在の掲載内容を添える。
