# タタ日本語名・進化段階監査台帳（2026-09-10）

## 判定範囲

- 対象: `data/tatari.json` の全64系統・230形態
- 確認状態: **external confirmation**（現行ゲーム画面・運営回答による official verified ではない）
- 画像: 保存済み公式クリエイター素材台帳で family ID・stage・asset path を照合。画像ファイル自体の差し替えは0件。
- 安定ID・公開URL・数値stageは変更しない。
- 旧表示名は検索互換用aliasとして保持する。

## 根本原因

2026-09-09のcommit `b5a077e6`（`Apply workbook Tatari names site-wide`）で、
`data/tatari-name-catalog.json` の古い日本語名が、それ以前の正しい正規データを上書きした。
同commit直前の `data/tatari.json` と今回の訂正fixtureを family ID + stage で比較し、全訂正値が一致することを確認した。

再生成時の再混入を防ぐため、生成済みHTMLではなく `data/tata-japanese-name-corrections-2026-09-10.json` を独立fixtureとして追加し、名称カタログ適用時に優先する。

## 最優先7系統

| family ID | stage | 変更前 | 変更後 | 分類 | 画像変更 | 根拠 | 状態 |
|---|---:|---|---|---|---|---|---|
| korotama | T3 | スカリギオ | スカラーべ | T4追加時の旧T3名残存 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| yanzaru | T3 | エテコウハ | イビルザル | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| birimori | T1 | ビリリモリ | ビリモ | 段階ずれ・旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| birimori | T2 | パルバット | ビリモリ | 段階ずれ | なし | 同上 | external confirmation |
| birimori | T3 | ヴァンパルス | パルバット | 段階ずれ | なし | 同上 | external confirmation |
| korokon | T1 | タマキツネ | コロコン | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| korokon | T2 | ニコキツネ | ニコン | 旧名 | なし | 変更前commit、攻略Wiki更新履歴 | external confirmation |
| korokon | T3 | ミセキツネ | ヨウエンビ | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| himori | T2 | ツノイモリ | フレイモリ | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki | external confirmation |
| himori | T3 | フレイドラ | ボルケザード | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| tafupen | T1 | トコペンギン | トコペン | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki更新履歴 | external confirmation |
| tafupen | T2 | タフペンギン | タフペン | 旧名 | なし | 同上 | external confirmation |
| tafupen | T3 | フブペンギン | フブペン | 旧名 | なし | 同上 | external confirmation |
| shizukuchou | T1 | シズクムシ | シズクジ | 旧名 | なし | 保存台帳、変更前commit、攻略Wiki | external confirmation |

確認後の進化列:

- `korotama`: コロタマ → コロロック → スカラーべ → スカリギオ
- `yanzaru`: ヤンザル → ワルキー → イビルザル → サルタイセイ
- `birimori`: ビリモ → ビリモリ → パルバット → ヴァンパルス
- `korokon`: コロコン → ニコン → ヨウエンビ → キツネビア
- `himori`: ヒモリ → フレイモリ → ボルケザード → インフェルドラ
- `tafupen`: トコペン → タフペン → フブペン → ペンペラー
- `shizukuchou`: シズクジ → シズクチョウ → ミストリア

## 全系統横断監査

保存済み `official-name-candidates.csv` の `confirmed` 行と全230形態を family ID + stage で比較し、同じ混入による不一致を抽出した。
全訂正値は `b5a077e6` 直前の正規データとも一致する。完全な機械可読一覧は
`data/tata-japanese-name-corrections-2026-09-10.json` を参照。

追加重点確認:

- `nenbutsuhebi`: T3をボンノオロチへ復元。T4ナムアミダイジャは既存ゲーム内PDF根拠を維持し、stageをずらしていない。
- `haamitora`: T3をゼンガーへ復元。T4マスタイガーを維持。
- `hikaru`: T3をルシフェルへ復元。公開slug `/tata/hikaru/` は維持。
- `birimori` T4: 英語欄へ混入していた中国語名を `Umbraveil` へ復元。簡体字中国語 `夜翼领主` は維持。

## 確認待ち

- `shizukuchou` T4候補「エーテリファル」: 攻略Wikiには掲載があるが、保存済み公式名称・画像台帳にT4がない。現行ゲーム画面または運営根拠が得られるまで、選択可能データへ追加しない。

## 根拠資料

- 保存済み原本: `MonsterSurvival-Official-Creator-Assets/04_MANIFEST/official-name-candidates.csv`
- Repository履歴: `b5a077e6^:data/tatari.json`
- コロタマ系: https://w.atwiki.jp/monstersurvival/pages/70.html
- ヤンザル系: https://w.atwiki.jp/monstersurvival/pages/66.html
- ビリモ系: https://w.atwiki.jp/monstersurvival/pages/81.html
- コロコン系: https://w.atwiki.jp/monstersurvival/pages/44.html
- ヒモリ系: https://w.atwiki.jp/monstersurvival/pages/43.html
- トコペン系: https://w.atwiki.jp/monstersurvival/pages/33.html
- シズクジ系: https://w.atwiki.jp/monstersurvival/pages/37.html

## 影響範囲と再発防止

名称カタログから `tatari.json`、スキル段階、画像台帳、名称ソース、多言語辞書を同期し、
タタ個別ページ・検索・Tier選択・Team Builder・共有表示が同じ family ID + stage を参照する。
独立fixtureの全行、最優先7系統の進化列、旧名alias、段階名重複、確認待ち進化の非公開をtestで固定する。
