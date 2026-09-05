# Lightweight Feedback Decision

確認日: 2026-09-05

攻略ページの「情報が古い」「ゲーム画面と違う」を、ページIDとcategoryだけで送る仕組みを検討した。

今回は実装しない。既存Board/Community backendへ別用途を混在させると、rate limit・通報・管理画面・保持方針の責務が増える。一方、現時点で古さ報告の実需要は計測されていないため、追加backendを正当化できない。

将来の最小案は次の2 categoryだけとし、自由文・username・UIDは送らない。

- `outdated`
- `different_from_game`

実装判断は、問い合わせや公式回答フローで同種報告が複数件確認された時点で再評価する。
