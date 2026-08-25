# Performance / Core Web Vitals Report

測定日: 2026-08-25

## Baseline

- localhostのトップページは本文表示成功、console error/warning 0、default viewport 1265×720でページ全体のhorizontal overflowなし。
- 組み込みブラウザではNavigation Timing/transfer sizeが取得できなかったため、LCP/INP/CLSや通信量の数値は作らない。
- field data（CrUX/Search Console/Vercel Speed Insights実数）は未取得。
- 変更前の主要サイズ:
  - `styles.css`: 58,567 bytes
  - `app.js`: 7,984 bytes
  - `site.js`: 5,448 bytes
  - `search/search.js`: 6,632 bytes
  - `monetization.js`: 5,989 bytes
  - tracked JS/MJS total: 302,414 bytes

## After implementation

- `growth.js`: 3,804 bytes（全ページ共通、defer）
- `compare/compare.js`: 6,841 bytes（比較ページだけ）
- `styles.css`: 61,873 bytes（+3,306）
- `app.js`: 8,252 bytes（+268）
- `site.js`: 5,595 bytes（+147）
- `search/search.js`: 8,539 bytes（+1,907）
- `monetization.js`: 4,776 bytes（-1,213、案件データをJSONへ分離）
- `data/tatari.json`: 272,216 bytes（変更なし）
- `data/tata-skills.json`: 283,195 bytes（変更なし）
- current JS/MJS total: 342,147 bytes（39 files）。増加分の大半は新規比較・生成・検証コードで、全ページが取得する追加JSは3.8KB。

## Implemented controls

- 検索bundleへ外部ライブラリを追加せず、既存JSONを利用。
- 比較JSは比較ページだけで読み込む。
- affiliate bannerへwidth/height、lazy loading、aspect ratio領域を設定。
- 通常広告は未設定時hidden、AdSlotはmin-heightを指定可能。
- 既存hero responsive image、lazy loading、Vercel Speed Insightsを維持。
- reduced motion、mobile 1-column、ページ全体のoverflow抑制を維持・補強。

## 未取得

- LCP / INP / CLSの実測前後値: 未取得。
- CrUX field data: 未取得。
- Vercel Speed InsightsのProduction集計: 人間のdashboard権限で確認。

Core Web Vitalsは実ユーザー環境で測る指標であり、localの単発値をfield値として扱わない。  
参考: https://web.dev/articles/vitals
