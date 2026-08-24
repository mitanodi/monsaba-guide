# 総合タタTier 再評価メモ（2026-08-24）

## 評価方法

- 総合Tierは単一モードの強さではなく、通常・ゾンビラッシュ・道場・ボス、進化後の伸び、育成コスト、長期的な編成価値を合わせて判断する。
- 外部Tierは転載せず、更新日・評価対象（Overall / Horde / Boss / Dojo / Beginner / F2P）と複数ソース間の一致度だけを判断材料にする。
- 日本名、進化名、スキル内容は `data/tatari.json` と `data/tata-skills.json` を正とする。海外名の対応を確認できない系統は変更しない。
- 「評価保留」は弱いという意味ではなく、総合順位を付ける根拠が不足している状態とする。

## 参照ソース

### 海外

- Pocket Gamer（2026-08-18更新、Version 0.44.1）  
  https://www.pocketgamer.com/clash-of-critters/tier-list/
- TatariHub（各モード、2026-08-19更新表示を確認）  
  https://tatarihub.fun/tier-list
- Pocket Tactics（2026-07-01更新）  
  https://www.pockettactics.com/clash-of-critters/tier-list
- Clash of Critters Wiki（進化ライン・属性・スキル照合）  
  https://clashofcritters.wiki.gg/wiki/Tatari
- Reddit r/ClashofCritters（2026年8月のT3、Horde、Dojo、general benefitに関する複数投稿）  
  https://www.reddit.com/r/ClashofCritters/

### 日本

- モンスターサバイバル@wiki（初心者ガイド、第3進化ロードマップ、タタ、ゾンビラッシュ、バッジ道場、FAQ。2026-08-20〜24の更新表示を確認）  
  https://w.atwiki.jp/monstersurvival/
- モンスターサバイバル攻略Wiki（総合育成Tier、2026-08-17更新表示を確認）  
  https://monster-survival.games-wiki.com/ranking

## 海外名と日本名の照合

| 海外名 | 日本版familyId | 日本版の進化 | 照合点 |
|---|---|---|---|
| Punchimp | `yanzaru` | ヤンザル → ワルキー → イビルザル → サルタイセイ | 岩属性、分身、進化後の範囲火力 |
| Voltfawn | `denjika` | ビリジカ → デンジカ → ジバジカ → マグネクス | 雷属性、貫通、麻痺、進化後の束縛 |
| Dewgrub | `shizukuchou` | シズクジ → シズクチョウ → ミストリア | 水属性、減速、睡眠、進化後の隣接支援 |
| Cheerling | `purabi` | プラビ → スタピョン → ステラビット → アストラビット | 雷属性、回復、攻防バフ、無敵 |
| Buddi | `himawarin` | ヒマワリン → キラワー → サーフクリン → サンフクリン | 草属性、回復、攻撃・防御支援 |
| Taptail | `nenbutsuhebi` | ボウズヘビ → ネンブツヘビ → ボンノオロチ | 岩属性、低速・高速音波、T3無限貫通、スタン |
| Manteeny | `komakiri` | コマキリ → ハナキリ → ヴァルキリ → サクランティス | 草属性、前衛、連撃、被ダメージ増加 |
| Ashlarva | `fureimuji` | ヒノムシ → フレイムシ → バタフレア → バタブレイズ | 火属性、範囲攻撃、回復、攻撃支援 |
| Frugling | `furuggu` | フルッグ → フルルッグ → ドラフルッグ → フルグロウン | 草属性、爆発系範囲火力、減速、進化後オーラ |

## 総合判断

| 系統 | 変更前 | 変更後 | 判断 |
|---|---:|---:|---|
| ヤンザル系 | SSS | SSS | 海外Overall・Hordeと最近のT3評価、日本の長期育成評価、分身火力が一致。 |
| ビリジカ系 | SS | SSS | 海外Overall・Boss・Dojo、日本Tier、当サイトの貫通・麻痺・束縛データが重なる。個別モード値は変更しない。 |
| シズクジ系 | S | SSS | Hordeを含む海外評価、日本Tier、減速・睡眠・隣接CC支援による複数モード価値が重なる。個別モード値は変更しない。 |
| プラビ系 | SSS | SSS | 海外単体Tierには差があるが、最近の実戦投稿、日本の長期育成評価、回復・バフ・無敵の汎用性を重視。 |
| ヒマワリン系 | SSS | SSS | 海外Overallと日本Tier、低めのT3コスト、回復・攻防支援の長期価値を重視。 |
| フレイムシ系 | SSS | SS | 回復・範囲火力・攻撃支援は強いが、最新海外Overallでは最上位5系統ほど評価が一致しない。 |
| ボウズヘビ系 | 評価保留 | SS | Pocket Tactics・日本Tier・TatariHubのBoss/Dojoでは高評価だが、Pocket Gamer最新版との差が大きいためSSSにはしない。 |
| フルッグ系 | S | S | 最新海外Tierでは高評価もある一方、Overall・終盤・Horde評価に差があり、低コスト育成を含めS維持。 |
| コマキリ系 | S | S | 道場・前衛性能は高いが、モード依存と海外Overallの評価差からS維持。 |
| ネコオリ系 | SS | SS | 日本環境での低コストT3、通常・道場・初心者価値を重視して維持。 |
| ウミミ系 | S | S | ゾンビラッシュでは最上位だが、総合Tierへ単一モード評価を転用せずS維持。 |
| ヒバイヌ系 | S | S | 通常・前衛・デバフ用途を確認できるが、SS以上へ上げる一致した根拠が不足。 |
| ガオデン系 | S | S | 低コストT3と押し返し役は有用だが、総合最上位へ上げる根拠が不足。 |

最終SSSは、ヤンザル系・ビリジカ系・シズクジ系・プラビ系・ヒマワリン系の5系統。ゾンビラッシュ専用Tierと各モード値は変更しない。
