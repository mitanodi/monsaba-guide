# モンサバ攻略DB

「モンスターサバイバル」の非公式攻略データベースです。HTML / CSS / Vanilla JavaScript の静的サイトとして運営し、正式なProductionは <https://monster-survival.com/> です。

## 主なページ

- トップ・タタ図鑑: `/`
- 初心者ガイド: `/beginner-guide/`
- フレンド募集掲示板: `/friends/`（Vercel Functions + Upstash Redis）
- モンサバ質問掲示板: `/board/`（質問・回答・解決済み・通報・投稿者/管理者削除）
- サイト・運営者について: `/about/`
- サイト内検索: `/search/`
- 総合Tier: `/tata-tier/`
- 進化優先度: `/evolution-priority/`
- 攻略相談所: `/consult/`
- タタ2体比較: `/compare/`（共有URL、`noindex`）
- コンテンツ攻略ハブ: `/guides/`
- よくある質問: `/faq/`
- コンテンツ攻略: `/zombie-rush/`, `/boss-rally/`, `/badge-dojo/`, `/normal-guide/`
- 属性ハブ・属性別: `/attribute/`, `/attribute/{grass,water,fire,thunder,rock}/`
- 個別タタ: `/tata/{familyId}/`
- 更新履歴・データ方針・プライバシー: `/updates/`, `/about-data/`, `/privacy/`

## データ

主要ゲームJSONは `data/tatari.json`, `data/tata-skills.json`, `data/tier-ratings.json`, `data/evolution-priority.json`, `data/content-guides.json` です。Seasonごとに変わるゾンビラッシュ専用スキルは `data/zombie-rush/seasons/` に分離し、通常スキルDBへ混在させません。収益化設定は `data/monetization.json`、実在する承認済み案件は `data/affiliate-offers.json`、計測・A/B flagは `data/growth-config.json`、ページ確認日は `data/page-freshness.json` で中央管理します。通常広告は無効、承認済みのA8.netアフィリエイト枠だけを限定表示しています。タタ名・進化・スキルは確認済みスクリーンショット、攻略は収録済み公開情報、Tierは当サイト独自の暫定評価を基準とし、不明内容は推測で補いません。

## ローカル確認

Repository直下で静的サーバーを起動します。

```powershell
python -m http.server 8000
```

`http://localhost:8000/` を開きます。`file://` ではJSON fetchが動作しません。

## 生成・検証

```powershell
npm.cmd run generate:tata
npm.cmd run generate:beginner
npm.cmd run generate:updates
npm.cmd run generate:sitemap
npm.cmd run validate
node scripts/update-base-url.mjs --from https://monster-survival.com --to https://example.com --dry-run
```

掲示板のサーバー接続には `@upstash/redis` を使用します。`npm.cmd test` で掲示板のvalidation・削除・スパム対策を含む単体テストを実行できます。GitHub Actionsでは構文、主要JSON、生成差分、内部リンク、SEO、孤立ページ、構造化データ、Analytics定義、鮮度管理、アフィリエイト設定、掲示板テストを検証します。`adsEnabled` は無効のまま、`affiliateEnabled` で承認済みアフィリエイト枠を制御します。

掲示板の接続情報と管理用秘密値はVercelの環境変数で管理し、`.env*` はGitへ追加しません。フレンド投稿は30日で期限切れになり、質問・回答は原則保持します。投稿者の削除tokenはブラウザだけに保存されます。質問掲示板は `BOARD_IP_HASH_SECRET` / `BOARD_ADMIN_TOKEN` を優先し、未設定時は既存 `FRIENDS_IP_HASH_SECRET` / `FRIENDS_ADMIN_TOKEN` を安全に流用します。秘密値はRepositoryやクライアントへ置きません。

## 公式情報の更新フロー

1. 公式X・ゲーム内告知などの一次情報を確認し、参照URLやスクリーンショットを保存する。
2. 既存のスクリーンショット由来DBと矛盾しないか確認し、確認できた対象JSONだけを更新する（公式Xからの自動反映は行わない）。
3. `npm.cmd run generate:site` でHTMLを再生成し、`npm.cmd run validate` と `npm.cmd test` を実行する。
4. 公開向けの変更内容を `/updates/` に記録し、`main` へpushする。
5. GitHub Actions成功後、既存Vercel ProjectのProductionと対象ページを確認する。

## 公式X投稿フィード

トップページの公式X投稿は `/api/official-x` がX API v2から取得し、ブラウザへは整形済みの公開投稿だけを返します。Bearer TokenをHTMLやクライアントJSへ置かないでください。

- 必須：Vercel Sensitive Environment Variable `X_API_BEARER_TOKEN`
- 任意：`X_OFFICIAL_USER_ID`（設定するとusername lookupを省略できます）
- 対象：Production。必要に応じてPreviewにも同じ名前を別途設定します。
- 取得：`GET /2/users/:id/tweets`、最大5件、replies・retweets除外
- cache：Vercel CDN 1時間、stale-while-revalidate / stale-if-error 1日

User ID未設定時は `GET /2/users/by/username/monsaba_jp` で解決します。初回のAPI応答に含まれる公開User IDを `X_OFFICIAL_USER_ID` として保存すれば、それ以降のlookupをなくせます。秘密値は`.env*`やRepositoryへ追加せず、Vercel Dashboardまたは `vercel env add X_API_BEARER_TOKEN production --sensitive` で登録し、登録後にProductionを再デプロイします。

## Deployment

`main` へpushすると、既存のVercel Project `monsaba-guide` が自動でProduction Deploymentを作成します。新しいVercel Projectは作成しません。canonical・robots・sitemap・OG・JSON-LDは `https://monster-survival.com/` を正とします。旧 `monsaba-guide.vercel.app` と `www.monster-survival.com` は正式URLへ恒久リダイレクトします。

問い合わせ・連絡先は [おぢ（@odi_monsaba）X](https://x.com/odi_monsaba) です。
