# Structured Data

## 使用方針

| Type | 使用ページ | 画面との対応 |
|---|---|---|
| `WebSite` | top | サイト名・検索入口 |
| `WebPage` / `CollectionPage` | 一般・一覧 | title/descriptionと一致 |
| `Article` | 攻略・更新記事 | 表示headline・日付・本文 |
| `BreadcrumbList` | top/404以外 | 表示パンくずと一致、現在ページはURLなし |
| `FAQPage` | `/faq/` | 画面に表示する5問だけ |
| `ItemList` | `/guides/`、一覧 | 画面に表示するリンクだけ |

JSON-LDは生成時に `<` をescapeし、validatorで全scriptをJSON parseする。画面にない質問・回答、架空のrating、利用者数、レビューはschemaへ入れない。

GoogleはFAQ rich resultを一般攻略サイトでは表示しない方針を示しており、2026年5月にはFAQ rich result自体が検索結果で表示されなくなった旨が更新履歴に記載されている。`FAQPage` は画面との機械可読な一致のために残し、CTR改善を保証しない。

参考:

- https://developers.google.com/search/docs/appearance/structured-data/sd-policies
- https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- https://developers.google.com/search/blog/2023/08/howto-faq-changes
