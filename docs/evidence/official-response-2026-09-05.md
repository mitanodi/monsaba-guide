# モンスターサバイバル運営チーム回答台帳（2026-09-05）

## 位置づけ

- 攻略DB運営に対して、モンスターサバイバル運営チームから情報提供・素材利用案内・確認協力の回答を受領した。
- この回答は「公式側から得た最新確認情報」として扱う。
- 当サイトが公式攻略サイト、公式公認、公式パートナー、公式提携、公式監修になったことを示すものではない。

## 回答内容と反映状態

1. 公式静止画を確認できていない5形態（ネンブツヘビ T4、パクマ T2/T3/T4、スケダコ T4）は運営側確認中。`data/tata-images.json` の pending を維持した。
2. Creator Assetsは定期更新されるが、ゲーム本体のアップデートと素材Driveの更新には時差が生じる場合がある。
3. 必要素材は今後も個別に確認依頼できる。Stage対応を証明できない素材はverifiedへ昇格しない。
4. Tataの正式英語名・中国語名一覧は準備中で、ゲーム内データ共有に向けたチーム内確認・承認待ち。candidate / internal_onlyを正式名へ昇格しない。
5. 日本語イベント名は「ランニングパーティー」、英語・海外表記は「Running Star」。既存の内部ID・slug `running-star` は互換性維持のため変更しない。正式中国語名は未回答。
6. ランニングパーティー / Running Star、Surprise Roulette、Treasure Huntの詳細仕様・開催期間・報酬・その他最新仕様は担当者回答待ち。未確認値は作らない。
7. Zombie Rushは、具体的な質問をDMで送ると公開可能な範囲で個別確認・回答可能。質問候補は `docs/evidence/zombie-rush-official-question-queue-2026-09-05.md` に分離した。
8. Tata画像素材は、以前共有された公式素材Driveから使用している旨を記載すれば使用可能。サイト共通footerへCreator Assetsの出典を表示した。
9. 「アップデート等により、実際のゲーム内仕様と異なる場合があります」という注意書きの掲載要望を受領。サイト共通footerへ反映した。
10. 通常問い合わせと不具合報告に添える情報は `docs/evidence/official-inquiry-guidelines-2026-09-05.md` に記録した。
11. 攻略DBについて、引き続き可能な範囲で確認協力を受けられる。ただし公式認定という意味ではない。

## 検証スナップショット

- Tata画像Manifest: 64 families / 230 forms / 225 verified / 5 pending / 224 official Creator Assets。
- pending 5形態は `official_team_checking`、基準日 `2026-09-05`。
- イベント確認待ちは `data/events.json` の `officialInquiry.status = awaiting_official_response` で保持。
- 正式英語名・中国語名の準備待ちは本台帳に記録し、未確認名は追加していない。

## 公開表現

- 公開サイトは従来どおり「非公式攻略サイト」と表示する。
- Creator Assetsの利用許可を、サイト自体への公認・提携・監修へ拡大解釈しない。
- 外部確認、ゲーム内確認、運営回答待ちを混同しない。
