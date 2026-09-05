# Search Console Opportunity Report

確認日: 2026-09-05

実データ期間: 2026-08-23〜2026-09-02（28日設定で利用可能な期間）

サイト全体は6,693 clicks、28,717 impressions、CTR 23.3%、平均掲載順位5.0。期間が短いため、今回は変更を急がず次回比較用の基準値を作る。

## Low hanging fruit

|Query|主Landing|Clicks|Impressions|CTR|Position|判断|
|---|---|---:|---:|---:|---:|---|
|モンスターサバイバル最強キャラ|`/tata-tier/`|78|458|17.0%|6.5|内部リンク・冒頭説明の候補|
|モンバサ 最強|`/tata-tier/`|51|341|15.0%|6.5|表記ゆれ。誤記をSEO文言へ追加しない|
|モンスターサバイバル 道場|`/badge-dojo/`|21|126|16.7%|5.8|明示的な内部リンク文言を候補化|
|モンスターサバイバル パクマ|`/tata/pakuma/`|16|119|13.4%|7.1|個別ページを正規Landingとして維持|
|モンスターサバイバー 進化|`/evolution-priority/`|11|137|8.0%|5.1|進化条件への到達性を確認|
|モンスターサバイバル タタ|`/tata-tier/`|11|111|9.9%|7.3|図鑑・属性別への役割を明示する候補|
|モンスターサバイバル 攻略|`/`|10|99|10.1%|12.6|TOPと攻略ハブの役割を継続観測|
|モンスターサバイバル 進化|`/evolution-priority/`|7|120|5.8%|7.5|進化優先度と試練の違いを明確化する候補|
|モンサバ ティア|`/tata-tier/`|7|70|10.0%|7.4|次回期間でも低CTRか確認|
|モンスターサバイバル 進化の試練|`/evolution/`|5|70|7.1%|4.8|順位が高いためtitle・H1は維持|

## Query × Page所見

- 「モンスターサバイバル パクマ」は`/tata/pakuma/`が14 clicks / 73 impressionsで主Landing。TOPは3 / 54、updatesとTierにも少数表示があり、軽い分散として監視する。
- 「モンスターサバイバル 道場」は`/badge-dojo/`が21 clicks / 102 impressions。TierとTOPにも表示されるがクリックは主Landingへ集約している。
- 進化系queryは`/evolution-priority/`、進化の試練queryは`/evolution/`へ着地しており、役割分担は概ね成立している。
- 最強・Tierクラスタは`/tata-tier/`が主Landing。強い既存ページを一括変更しない。

## Content Gap / Cannibalization

実需要があり、かつ既存ページでは回答できないと判断できる検索意図は今回0件。新ページは作らない。

パクマqueryは複数URLに表示されるが個別ページが主クリックを得ているため、canonical・redirect・title変更は行わず次回もQuery × Pageで比較する。

構造化データは[data/search-console-opportunities.json](../data/search-console-opportunities.json)に保存した。
