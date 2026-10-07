# CSS・JSの固定URLと再検証

CSS・JSの内容から共通の `?v=` を計算する方式は廃止しました。URLは固定し、`Cache-Control: public, no-cache` によって、保存した応答を再利用する前に更新確認します。`no-store` は使用しません。

正本は `data/asset-build.json` と `vercel.json`。Vercelが提供するETag／Last-Modifiedを利用し、固定の検証値を自前でヘッダーへ書き込みません。未変更の条件付きリクエストは304で本文を再送せず、変更時は新しい本文を取得します。画像等は従来の長期immutableを維持し、CSS／JSと適用ルールが重ならないようにしています。

## 生成・検証

- `npm run generate:assets`：既存CSSビルド＋固定URLの正規化。
- `npm run generate:asset-version`：従来の呼び出しを壊さないための互換入口。ハッシュの計算・バージョン更新は行いません。
- `npm run generate:site`：各generatorが固定URLを生成し、共通処理でも正規化。配備準備でも同じ処理を実行。
- `npm run validate:assets`／`npm run test:asset-cache`：旧バージョンURLの復活、クエリ保持、参照先、ヘッダー競合、更新でHTMLを変えないことを検証。全validate／全test／CIにも組み込み済み。

正規化はサイト内CSS／JSのscript・link参照にある `v=` だけを除去します。他のパラメータやfragment、外部スクリプト、画像、API、広告のURLは維持します。SEOの更新日やsitemapの日付をキャッシュ更新目的で変更しません。`promo/` と他の案件は走査しません。

## 初回移行

通常のCSS／JSは既存パスから `?v=` を除いた固定URLになります。本番調査ではこれらの既存パスは `max-age=0, must-revalidate` でした。

一方、`/assets/aug30-update.css` は1年間のimmutableでした。サーバー側の変更ではブラウザの保存済みfresh cacheを消せないため、このCSSだけ一回限りで `/styles/aug30-update.css` へ移します。今後の編集対象も `styles/aug30-update.css` です。旧ファイルは古いHTMLや履歴URLの互換用としてそのまま残します。既存のfresh cacheが即座に再検証されるとは扱いません。

初回は全言語のHTML参照URLに変更が必要です。移行後はCSS／JSだけの更新による共通バージョン更新も、それだけを理由とする全HTML差分も発生しません。新しい資産を追加／削除してページの参照自体を変えた場合や、生成コンテンツの実際の変更ではHTML差分が生じます。

既に開いているページや履歴スナップショットは、通常のページ読込みで新しいHTMLを取得するまで旧参照を使う場合があります。サイトデータや保存済み編成を削除して移行する方式ではありません。

## 本番公開前後

今回の実装は本番反映前の確認対象です。承認後、最新mainと共同編集を再確認し、既存CI／Vercel Projectの通常公開手順で反映します。公開直後は実ドメインでCSS／JSのCache-Control、ETag／Last-Modified、304、画像のimmutable、新CSSパス、3言語ページの読込みを確認します。ローカルVercelの応答確認を、本番Vercel CDN確認済みとは扱いません。

Vercel CLI 59.1.4の `dev --local` は、静的ファイルのCache-Controlを `public, max-age=0, must-revalidate` に上書きしました。ローカルでは条件付きリクエストと内容変更を検証できても、設定した `no-cache` と画像の `immutable` が実際のCDNで配信されることは、承認後の実Deploymentで別途確認する必要があります。開発配信に合わせて本番設定の検証を弱めません。

## 根拠

- [Vercelのヘッダー設定](https://vercel.com/docs/project-configuration/vercel-json#headers)
- [Vercel Cache-Control](https://vercel.com/docs/caching/cache-control-headers)
- [MDN no-cacheと既存キャッシュ](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control)
