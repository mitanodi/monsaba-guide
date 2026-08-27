# Google AdSense 導入手順

状態: **所有権確認・審査準備中**（2026-08-28）

Google AdSense管理画面でPublisher ID `pub-2710725734378326` を確認済みです。Repositoryではサイト所有権確認用の`ads.txt`だけを公開し、`data/adsense-config.json` は引き続き `enabled: false`、`autoAds: false` です。公開HTMLにAdSenseの広告配信コードはありません。

## 導入時に人間が行うこと

1. 正しいGoogleアカウントでAdSenseへログインし、対象サイトを登録する。
2. AdSenseの「アカウント情報」で、このアカウント固有のPublisher IDを確認する。（完了）
3. Googleが対象サイトに表示したads.txt行を、そのまま実装する。（完了）
4. AdSense管理画面へ戻り、「コードを配置しました」相当の確認操作を行う。
5. 所有権確認後、サイト審査をリクエストする。
6. 広告配信を実装する別作業までは、`enabled: false`と`autoAds: false`を維持する。
7. `/search/`、`/compare/`、`/consult/`、`/friends/` は広告非表示のまま維持する。
8. 広告配信開始前にPrivacy、対象地域に必要な同意取得、広告のラベルと配置を再確認する。

Publisher IDはAdSenseアカウント固有です。公式の確認場所は[Publisher IDの確認方法](https://support.google.com/adsense/answer/105516)を参照してください。

## ads.txt

Publisher ID取得済みのため、ルート`/ads.txt`へ次の正式な1行を実装済みです。

```text
google.com, pub-2710725734378326, DIRECT, f08c47fec0942fa0
```

確認手順は次のとおりです。

1. Productionの`https://monster-survival.com/ads.txt`がHTTP 200かつ`text/plain`で返ることを確認する。
2. 本文がGoogle指定行と完全一致することを確認する。
3. AdSense管理画面で「コードを配置しました」相当のチェックを入れて確認する。
4. 所有権確認後、サイト審査をリクエストする。
5. AdSense管理画面でads.txtのクロール・認識状況を確認する。反映には時間がかかる場合がある。

形式とクロール要件はGoogle公式の[ads.txt FAQ](https://support.google.com/adsense/answer/9785052)と[ads.txtをクロール可能にする方法](https://support.google.com/adsense/answer/7679060)を都度確認してください。

## 配置上の注意

- 広告をナビゲーションやダウンロードリンクに見せない。
- クリックを依頼・誘導しない。
- コンテンツを妨げるポップアップや固定ボックスへAdSenseを置かない。
- コンテンツのない検索・ツール・UGC画面へ配信しない。
- スマホで本文や主要操作を覆わない。

導入直前に[AdSenseプログラムポリシー](https://support.google.com/adsense/answer/48182)を再確認します。
