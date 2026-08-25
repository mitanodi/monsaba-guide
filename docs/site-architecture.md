# Site Architecture

## 目的別導線

| 目的 | 1操作目 | 2操作目 | 3操作目 |
|---|---|---|---|
| タタを探す | header「タタ図鑑」/「検索」 | 個別タタ | 比較/相談 |
| 育成する | Tier | 個別タタ | 進化相談 |
| 進化する | 進化優先度 | 個別差分 | 相談 |
| 属性から探す | トップ属性カード / footer「属性別」 | 属性ハブ / 属性ページ | 個別/比較 |
| コンテンツ攻略 | 攻略ハブ | モード | 適性タタ/相談 |
| 比較 | header「比較」 | 2体選択 | 個別/進化 |
| 初心者 | mobile nav/トップ | 初心者ガイド | Tier/進化/FAQ |

## Navigation

- Desktop header: タタ図鑑 / Tier / 進化優先 / 攻略ハブ / 比較 / 相談 / 検索。
- Mobile menu: 上記に初心者ガイドとフレンド掲示板を追加。
- Footer: 属性別、攻略ハブ、比較、FAQ、運営、データ、更新、privacy、掲示板。
- パンくずの現在ページは自己リンクにしない。画面表示とBreadcrumbListを一致させる。

## URL policy

- 既存公開URLは変更しない。
- 新規index URLは `/guides/`、`/attribute/`、`/faq/`。
- `/compare/` は機能ページとして `noindex,follow`。queryは共有状態でありSEO landing pageにしない。
- lowercase・末尾slashを維持し、旧 `/attribute/earth/` だけ既存の恒久redirectを継続する。
