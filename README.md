# モンサバ攻略DB

「モンスターサバイバル」の非公式攻略データベースです。HTML / CSS / Vanilla JavaScript の静的サイトとして運営し、Production は <https://monsaba-guide.vercel.app/> です。

## 主なページ

- トップ・タタ図鑑: `/`
- サイト内検索: `/search/`
- 総合Tier: `/tata-tier/`
- 進化優先度: `/evolution-priority/`
- 攻略相談所: `/consult/`
- コンテンツ攻略: `/zombie-rush/`, `/boss-rally/`, `/badge-dojo/`, `/normal-guide/`
- 属性別: `/attribute/{grass,water,fire,thunder,rock}/`
- 個別タタ: `/tata/{familyId}/`
- 更新履歴・データ方針: `/updates/`, `/about-data/`

## データ

主要JSONは `data/tatari.json`, `data/tata-skills.json`, `data/tier-ratings.json`, `data/evolution-priority.json`, `data/content-guides.json` です。タタ名・進化・スキルは確認済みスクリーンショット、攻略は収録済み公開情報、Tierは当サイト独自の暫定評価を基準とし、不明内容は推測で補いません。

## ローカル確認

Repository直下で静的サーバーを起動します。

```powershell
python -m http.server 8000
```

`http://localhost:8000/` を開きます。`file://` ではJSON fetchが動作しません。

## 生成・検証

```powershell
npm.cmd run generate:tata
npm.cmd run generate:sitemap
npm.cmd run validate
node scripts/update-base-url.mjs --to https://monster-survival.com --dry-run
```

Node標準機能だけを使用し、追加packageはありません。GitHub Actionsでも構文、5 JSON、生成差分、内部リンク、SEOを検証します。

## Deployment

`main` へpushすると、既存のVercel Project `monsaba-guide` が自動でProduction Deploymentを作成します。新しいVercel Projectは作成しません。独自ドメイン取得完了まではcanonical・robots・sitemap・OG・JSON-LDとも `https://monsaba-guide.vercel.app/` を正とします。

問い合わせ・連絡先は [おぢ（@odi_monsaba）X](https://x.com/odi_monsaba) です。
