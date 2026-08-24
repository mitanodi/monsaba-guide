# Repository rules

- サイトは静的HTML / CSS / Vanilla JavaScriptを維持する。大規模frameworkへ移行しない。
- 正式ProductionとBase URLは `https://monster-survival.com`。旧Vercel URLへ戻さない。
- 新しいVercel Projectを作らない。既存Project `monsaba-guide` のGit Integrationを使用する。
- `chigonoki-ramen-blog` には触らない。
- タタ名、進化、スキル数値、攻略内容を推測で追加・修正しない。
- 正式表記は「岩属性」「ビビドッグ」「モエミン」「クンブー」。これらを別表記へ変更しない。
- データ基準は63系統・224体。`tatari.json` と `tata-skills.json` のstage/nameを一致させる。
- Tier順位と進化優先度を、明示的な根拠・依頼なしに変更しない。
- `data/monetization.json` は明示的な収益化依頼と承認がない限り `adsEnabled: false` / `affiliateEnabled: false` を維持し、実広告・実affiliateリンクを追加しない。
- ゲーム画像はユーザー提供の正式素材だけを使用する。画像生成・描き足しは禁止。
- Hero画像のH1はHTMLテキストで維持し、画像へ焼き込まない。
- 公開外部リンクを新しいタブで開く場合は `rel="noopener noreferrer"` を付ける。
- フレンド掲示板は既存Vercel Projectに接続済みのUpstash Redisだけを使用する。秘密値、Redis token、生IP、削除tokenをGit・HTML・ログへ出さない。
- 掲示板投稿はVercel Functions経由に限定し、静的JSONやGit commitへ保存しない。rate limit、UID cooldown、honeypot、Origin検証、30日TTLを維持する。
- 変更後は `npm.cmd run validate` を実行し、生成対象は差分が残らないことを確認する。
- Deploymentは`main`へのpushによる既存Vercel Git Integrationを使用する。
