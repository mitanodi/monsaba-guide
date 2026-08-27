# AdSense審査前チェックリスト

更新日: 2026-08-28

## Technical

- [x] HTTPSのProduction URLを使用
- [x] `robots.txt`からsitemapを案内
- [x] noindexページをsitemapから除外
- [x] canonicalの重複なし
- [x] custom 404を維持
- [x] indexableページのorphan 0
- [x] 320〜1920pxのレスポンシブ設計
- [ ] ProductionのCore Web Vitalsを人間がSearch Console / Vercelで再確認
- [x] 正式Publisher IDで`/ads.txt`を追加（ProductionのHTTP 200・`text/plain`確認はデプロイ後）

## Content

- [x] 役割別ページに独自の判断軸・用途別比較・関連導線を追加
- [x] 確認済みDBと当サイト独自整理を区別
- [x] 個別タタ63系統を機械監査し、極端な薄いページなし
- [x] About・データ検証方針・Privacy・連絡先を維持
- [x] サイト内検索を`noindex,follow`化
- [x] 不明なゲーム仕様やBoss専用順位を創作しない

## Monetization

- [x] `affiliateDensity: low`
- [x] sticky A8を無効化
- [x] slide A8を無効化
- [x] bottom floating A8を無効化
- [x] desktop rail A8を無効化
- [x] 既存の静的A8は1ページ最大1枠
- [x] A8のリンク・バナー・計測pixelを変更しない
- [x] 正式Publisher IDを保存し、AdSenseは`enabled: false`、Auto Adsは`false`
- [x] `/search/`、`/compare/`、`/consult/`、`/friends/`をAdSense除外候補へ登録
- [x] AdSense広告配信コードと仮Publisher IDをProductionへ入れない

## UGC / Privacy

- [x] friendsのrate limit・UID cooldown・honeypot・Origin検証・body上限を維持
- [x] friendsのdelete token・admin secret・30日TTL・raw IP非保存を維持
- [x] 個人情報注意・荒らし禁止・通報導線を維持
- [x] ユーザー名・ひとことへのURL投稿をサーバー側で拒否
- [x] PrivacyへAdSense導入前の説明を追加
- [ ] 導入時に対象地域のGoogle同意要件を人間が確認

## Human Verification

- [ ] AdSenseアカウント作成・正しいGoogleアカウント確認
- [x] Google Publisher ID取得
- [x] Googleが指定した正確なads.txt行を追加
- [ ] AdSense管理画面で「コードを配置しました」相当の確認操作
- [ ] AdSense管理画面でサイト・ads.txt認識を確認
- [ ] Googleの最新Consent / Privacy要件を確認
- [ ] Farlight Gamesへゲーム画像の広告収益化許諾を確認（`docs/copyright-verification.md`）

## 申請判断

コード側の準備がすべて成功しても、Googleの審査通過は保証されません。上記Human Verification、特にゲーム画像の収益化許諾とAdSense固有情報を確認した後に申請します。
