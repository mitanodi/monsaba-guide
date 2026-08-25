# Technical SEO Check

## Implemented

- HTTPS canonicalは `https://monster-survival.com` に統一。
- 404はcanonicalなし・noindex、sitemap除外。
- index対象は自己参照canonicalを持ち、query/hashをcanonicalへ含めない。
- `/compare/` は共有queryを持つ機能ページのため `noindex,follow`、sitemap除外。
- `trailingSlash:true`、lowercaseの既存URLを維持。
- `/attribute/earth/` → `/attribute/rock/` の既存恒久redirectを維持。
- robots.txtは全体crawl許可と正式sitemap URLを保持。
- sitemapはindexable canonicalだけを自動生成。
- validatorはcanonical重複、metadata、JSON-LD parse、孤立ページ、内部リンクを検査。

## Production verification items

- apex HTTPS、`www`、旧Vercel URLの正式ドメインへの恒久redirect。
- 大文字URL、末尾slashなし、不要queryの応答。
- 存在しないURLが404を返し、soft 404にならないこと。
- Vercel Functions `/api/friends` の `X-Robots-Tag: noindex, nofollow`。

Googleはredirect、`rel=canonical`、sitemapをcanonical signalとして扱い、相互に矛盾させないことを推奨している。  
参考: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls  
参考: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
