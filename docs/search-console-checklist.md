# Google Search Console確認手順

Search Consoleの認証済みセッションをCodexから利用できない場合の確認手順です。

1. `https://search.google.com/search-console/` を開き、プロパティ `https://monster-survival.com/` を選ぶ。
2. 「ページ」で、インデックス登録済み・クロール済み未登録・検出未登録を確認する。
3. 「ページがインデックスに登録されなかった理由」で、重複・canonical不一致・robots・404をURL単位で確認する。
4. sitemap `https://monster-survival.com/sitemap.xml` の最終読み込みと検出URL数を確認する。
5. URL検査で `/events/treasure-hunt/`、`/stages/`、`/evolution/`、`/roles/`、`/compare-guides/purabi-vs-denjika/` を確認する。
6. 「検索パフォーマンス」でページ・クエリ・国・デバイスを28日/3か月比較する。
7. noindexを意図した `/compare/`、`/items/`、`/systems/`、`/favorites/` がインデックス対象外であることを確認する。

認証後に記録する値：indexed、crawled not indexed、discovered not indexed、canonical issue、sitemap discovered URLs。値を推測して記載しません。
