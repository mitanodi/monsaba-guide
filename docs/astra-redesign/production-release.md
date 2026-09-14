# Astra Final 本番公開準備（2026-09-15）

ユーザーはAstra Finalの本番反映を承認済み。新しいデザイン変更は含めない。

## 統合・復旧地点

- 比較済みAstra Final: `56856a14707eca6bf4553f37035b4548d7e30efe`
- 作業前origin/main・実際のProduction: `6111788e392892c19a4452a3fb186cc97fc8bd45`
- 健全なProduction: `dpl_5y5wX8JXWhydYpLGEs5W23i3Z6W5`（monster-survival.comの割当を確認）
- 既存タグ: `pre-astra-redesign-20260915`を保持
- 追加復旧タグ: `pre-astra-production-20260915`（上記Production HEAD、originへ保存）
- 実験開始後のmain追加コミットは作業開始時点では0。統合直前にも再fetchする。
- タグの対象は追跡済みコード・静的データのみ。DB、端末localStorage、環境変数のバックアップではない。

## 公開に必要な差分

- Vercelの既存Git連携で新しくProductionビルドする。Previewの昇格は行わない。
- `prepare-deployment.mjs`は明示的な`VERCEL_ENV=production`でのみ投稿停止UIを外し、元のGA4タグとA8描画を復帰。生成ソースは比較用のまま保持。
- Preview・開発・未知環境はread-only、GA4停止、追加meta noindex。API書き込みもProduction以外で拒否。
- HTTPの一律noindexを本番2ホストだけ除外。API自身のnoindex、元のページ別robots指定を保持。
- A8はJAの既存4枠だけ。TOPの育成導線後、初心者のT3説明後、進化の移行一覧後（Desktopのみ）、通常攻略のボス説明後。案件・正本・計測pixel・relは変更しない。
- 本番はプレースホルダーと実験フッターを除去。広告枠の寸法予約・PR表示・操作領域からの分離を維持。
- 広告なしのTools／Calendar／Community等を維持。AdSense無効の設定、ads.txt、広告コード正本に変更なし。
- localStorageキー・共有URL codec・データ正本・投稿サービスのOrigin／owner／rate／サイズ制限は変更しない。

## 検証と公開経路

既存generate・validate・全tests・冪等性・HTTP smokeと追加環境分離テストを実施。投稿書き込みは隔離テストのみ。本番の投稿データは作成・削除しない。
実験ブランチのCI／Previewを確認してからmainへ統合。mainのGitHub Actionsと既存Vercel Production READY、実ドメインのソース／HTML／操作を確認する。

## 重大障害時

上記健全Deploymentへ復旧し、この公開のソース差分を安全にrevertして整合させる。他作業を巻き戻すreset／force pushは使わない。DB・環境変数は今回変更しないため、コードタグによる復元とは扱わない。

## 公開後候補・未確認

- TOPでの直接検索入力：今回追加しない。
- Undo／Redoの常時表示：今回追加しない。
- 物理iPhoneでのスクロール・指によるドラッグ・保存／共有の最終確認は未実施。ブラウザ検証と区別する。

promo/、chigonoki、A8正本、AdSense設定、ads.txt、本番投稿データ、外部アカウント設定は対象外。
