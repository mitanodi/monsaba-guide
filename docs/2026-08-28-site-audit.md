# 2026-08-28 site audit

## Baseline

- main baseline: `eedd2100517c8d4dd842f32f5554c3920a57f6e0`
- 63系統 / 224体 / 通常スキル224 / Season 1専用調整35系統
- baseline validation: 89 HTML / indexable 87 / orphan 0
- Production sitemap baseline: 87 URLs

## Local result after implementation

- 110 HTML / indexable 105 / orphan 0
- canonical、robots、title、description、H1、JSON-LD、内部リンク、sitemapをvalidatorで確認
- `/compare/`、`/items/`、`/systems/`、`/favorites/` は意図したnoindex
- 期限切れ表現validatorを追加
- 共通asset versionをcontent hashに統一
- `content-visibility:auto`、既存lazy image、deferを維持
- A8コード値、affiliate URL、friends security設定、通常スキルDBを変更していない

Search Consoleの集計値は認証済みアクセスがない限り推測しません。確認手順は `docs/search-console-checklist.md` に記載しています。
