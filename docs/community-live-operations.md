# Community Live Operations

最初の実投稿が入るまでは `INSUFFICIENT DATA` とし、架空投稿・架空Helpful・架空クリア報告を作らない。

## Phase 6確認（2026-09-05）

- Production実投稿: 0件
- Team Builder保存状態: P1ベロパカT1、P1コパンダT1、P2コパンダT1、P1チップ3種をUI上で確認
- 真実性: 実ゲームで使った編成か未確認
- 投稿フォーム: 開いたが、title・Difficulty・Resultを推測入力せず未送信
- 次のHuman Action: 編成内容が本物か投稿者が確認し、必要なら正しいTier・Lv・Chipへ直してから公開確認へ進む

## 読み取り専用の自動監査

```sh
npm run audit:community:live
```

Productionの一覧APIを最後のcursorまで読み、実投稿数を数える。投稿が存在する場合は先頭の実投稿についてdetail、36マス、P1/P2、Tier、Lv、Chip、共有URL、公開レスポンスへのowner token混入がないことを検査する。POST・DELETEは実行しない。

## 最初の実投稿後の端末A/B確認

実ユーザー本人の同意を得て、テスト用ではない本人の投稿で確認する。端末Aは投稿者、端末Bは別の閲覧端末として扱い、owner tokenやブラウザ保存領域をコピーして別人を装わない。

|順番|端末|操作|合格条件|
|---|---|---|---|
|1|A|Team Builderで実編成を作る|P1/P2・Tier・Lv・Chipが本人の意図どおり|
|2|A|Communityへ投稿|一覧とdetailに同じ内容が表示される|
|3|A|URL Copy・X・Discordを開く|タイトル・Difficulty・Round・サイトURLのみ。本文・username・UIDを含めない|
|4|B|共有URLを新しい端末で開く|detailと6×6 previewが崩れない|
|5|B|「この編成を読み込む」|Team BuilderへP1/P2・Tier・Lv・Chipを保持して読込|
|6|B|Helpful|1回だけ反映し、重複操作が拒否される|
|7|B|Trial Report|自己申告ラベル付きで反映される|
|8|B|CommentとReply|親子関係が保たれ、不正HTMLが表示されない|
|9|A|Edit|owner token保持端末だけ更新できる|
|10|B|Report|理由選択が必要で、同一対象への重複通報を拒否する|
|11|A|Delete|owner token保持端末だけ削除できる|

## 維持するセキュリティ境界

- same-origin検証
- HMAC化したIP識別子
- publish/action/report rate limit
- owner tokenによるEdit/Delete認可
- server-side formation/text validation
- duplicate reservation
- 20KB request limit

## 実データが十分になるまで保留

Helpful順、Trials順、Clear reports、Difficulty別、Season別の機能は既に受け皿があるが、人気・トレンドの表現や順位付けは十分な実投稿と操作数が蓄積するまで判断しない。
