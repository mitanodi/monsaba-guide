# Performance finalization — implementation audit

## CSS分類と配信設計

Initialの追加CSSは33,533B。Finalは編集用source 34,314B、全生成ファイル合計33,976B。全体を25KB未満にするために操作・アクセシビリティ規則を削ることはしなかった。代わりにページが必要とするCSSだけを配信する。

| 分類 | 監査と判断 |
|---|---|
| 本当に必要 | Desktop常設ナビ、Mobile bottom navigation、focus、touch target、3言語の折り返し、Sheet、Tier色、広告寸法予約は維持 |
| 既存CSSと重複 | styles.css / my-tools.cssの旧button・card・container・gridと照合。変更後の値は共通tokenと共通Astra層へ集約。旧CSSは他ページと既存rendererで必要なため一括削除しない |
| 同一ruleの重複 | selector・条件・property・important・scopeを照合し、安全に後続で上書きされる3宣言を削除。shorthandの意味やfocus状態が異なるものは残す |
| Viewport限定 | 320–700のSheet、820の広告desktop限定、1024付近のナビ切替などを保持。viewportだけで追加requestを作らずCSS内のmedia queryを利用 |
| Page限定 | TOP/Events、Team、Calendar、Community、Detail、Tierを6ファイルに分離。articleの一部で必要な4ステップはhomeを共有 |
| 未使用 | hover/focus/reduced-motion/開閉状態は初期Coverageで未使用でも必要。全状態で未使用と断定できないselectorは削除しない |
| 上書き専用 | 既存headerのbackdrop-filter、旧slot非表示、articleレイアウトの変更は実験隔離に必要。navの固定包含ブロックが変わらないようunprefixed backdrop-filter:noneもテストで保護 |

| 配信ファイル | bytes |
|---|---:|
| common | 13,215 |
| home | 8,311 |
| team | 6,039 |
| calendar | 2,560 |
| community | 732 |
| detail | 1,560 |
| tier | 1,559 |

TOP/Events/Beginner/Evolutionは21,526B（−12,007B、−35.8%）。Tierは14,774B（−55.9%）。Team Builderは19,254B（−42.6%）。Calendarは15,775B。Communityは19,986B。Detailは14,775B。他のページは13,215B。最大でも追加CSSは約21.5KB。通常1request増（Communityは2増）と、転送減少のトレードオフをPreviewで測る。

共通tokenは既存の --bg/--surface/--text/--muted/--line/--primary/--max を維持。Astraのspacing/radius/border/shadow/type/tier/attributeも共通ファイルだけに置く。PostCSS・Lightning CSSはbuild時だけのdevDependenciesで、ブラウザにframeworkを配信しない。生成順序はCSS→asset hash→HTMLで、二重generateの無差分を検証する。

## Critical CSS

TOPのnav・hero・予定・図鑑は初期に必要。common+homeを通常のstylesheetとしてheadから読み込む。criticalの重複inline化や後読みのFOUCを追加せず、不要なTeam/Calendar/Communityを初期ブロックから外す。遅延loadによる表示の跳ねより、小さな2ファイルを優先する。

## 画像

Initial TOP390はHero480と複数の512pxカードを取得し、初期画像221,821Bだった。Heroは108pxのMobile表示に対して120/240/360/600px候補を用意し、sizesを108px/252pxへ合わせた。既存公式Creator AssetからSharpでWebPを生成し、元画像は変更しない。LCP候補Heroはeager、width/heightを維持。

図鑑/Tierは表示サイズに合う128px候補を、元の256/512候補に追加。静的HTMLとapp.jsの双方を揃え、初期512pxの取得後に別画像を再取得する流れを防ぐ。既存srcsetがないパクマ画像も有効なfallbackを持つ。64の確認済み第1形態とHero4サイズだけを生成し、出典・元SHA・寸法を image-derivatives.json に保存。未確認画像は捏造しない。DPR3の390pxならHero360pxを選ぶのは適正であり、viewport幅だけで120pxに強制しない。

## JS / listener / DOM / font

Tierを動かす処理は既に静的generatorで完了しているため、astra.jsの重複したruntime移動を削除。Navigation・Searchは既存初期化を利用。SheetのMutationObserverはpickerのclass属性だけを監視し、毎回listenerを追加しない。追加scroll listenerなし。広告observerは任意のlive枠が見えたらdisconnectし、元rendererを一度だけload。

Menu、Search、Team Picker、Calendar月移動を50回ずつ操作し、CDPのGC後DOM listener数を比較。各試験で増加0。重複wrapperを削ってSEO本文を落とす変更は行っていない。DOMは意味のあるarticle/section/detailsを維持する。新fontファイル、外部font request、font-face追加は0。既存system fallbackを使用。

## 計測の条件と限界

Current / Initial SHA90b4c2f / Finalの同一Chrome、CPU4倍、cache無効、390/1440、各3回。第三者通信は3者で同条件に除外し、初期画面のencodedBodySizeをHTML/CSS/JS/画像/JSON別に記録する。広告の実ネットワークと実ユーザーINPは別物で、架空のCWVを報告しない。Current Calendar URLはsoft404なので同機能比較から除外する。完全な同時刻・同一CDN edgeを保証できないため、LCPの小差を断定しない。

数値結果は final-performance.md、最終判断は finalization-report.md に記録する。EvidenceはRepository外 finalization/ に保存。
