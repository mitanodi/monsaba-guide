# Google AdSense 導入手順

状態: **未導入**（2026-08-28）

Repositoryでは導入準備だけを行っています。`data/adsense-config.json` は `enabled: false`、`publisherId: null`、`autoAds: false` です。公開HTMLにAdSenseの配信コードはありません。

## 導入時に人間が行うこと

1. 正しいGoogleアカウントでAdSenseへログインし、対象サイトを登録する。
2. AdSenseの「アカウント情報」で、このアカウント固有のPublisher IDを確認する。
3. Googleが対象サイトに表示したサイト確認コードを、そのまま確認して実装する。コードやIDを推測しない。
4. `data/adsense-config.json` の `publisherId` と `enabled` は、審査・実装方針を確認してから別作業で更新する。
5. `/search/`、`/compare/`、`/consult/`、`/friends/` は広告非表示のまま維持する。
6. Privacyの説明、対象地域に必要な同意取得、広告のラベルと配置を再確認する。

Publisher IDはAdSenseアカウント固有です。公式の確認場所は[Publisher IDの確認方法](https://support.google.com/adsense/answer/105516)を参照してください。

## ads.txt

現時点ではPublisher IDが不明なため、ルート`/ads.txt`は作成せず404のままにします。仮IDや他者のIDを入れてはいけません。

Publisher ID取得後は次の順で対応します。

1. AdSense管理画面に表示されたads.txtの行を正確にコピーする。
2. Repositoryルートへプレーンテキストの`ads.txt`を作る。
3. Google指定の行を改変せず追加する。
4. Productionの`https://monster-survival.com/ads.txt`がHTTP 200かつ`text/plain`で返ることを確認する。
5. 表示されたPublisher IDがAdSenseアカウントの値と完全一致することを再確認する。
6. AdSense管理画面でクロール・認識状況を確認する。反映には時間がかかる場合がある。

形式とクロール要件はGoogle公式の[ads.txt FAQ](https://support.google.com/adsense/answer/9785052)と[ads.txtをクロール可能にする方法](https://support.google.com/adsense/answer/7679060)を都度確認してください。

## 配置上の注意

- 広告をナビゲーションやダウンロードリンクに見せない。
- クリックを依頼・誘導しない。
- コンテンツを妨げるポップアップや固定ボックスへAdSenseを置かない。
- コンテンツのない検索・ツール・UGC画面へ配信しない。
- スマホで本文や主要操作を覆わない。

導入直前に[AdSenseプログラムポリシー](https://support.google.com/adsense/answer/48182)を再確認します。
