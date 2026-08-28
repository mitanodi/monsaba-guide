# モンサバ質問掲示板 管理者運用

対象は既存Vercel Project `monsaba-guide` の `/board/` です。掲示板は既存Upstash Redis内の `monsaba:board:*` に分離され、`monsaba:friends:*` には触れません。質問・回答・返信は原則保持し、通報レコードだけ180日で整理されます。

管理用secretは `BOARD_ADMIN_TOKEN` を推奨します。未設定時だけ既存 `FRIENDS_ADMIN_TOKEN` を利用します。値をコマンド履歴、画面共有、Git、HTML、クライアントJavaScriptへ残さないでください。

## 確認手順（約1分）

1. ブラウザで `https://monster-survival.com/board/` を開き、新着順と未回答を確認します。
2. 不審な質問を開き、回答とその返信も確認します。URLは自動リンクにならないため、記載URLを直接開かないでください。
3. 通報一覧も続けて確認します。

## 通報確認手順（約1分）

PowerShellのユーザー環境変数からsecretを読み、本文を表示せず通報対象IDだけ確認します。

```powershell
$boardAdmin = [Environment]::GetEnvironmentVariable('BOARD_ADMIN_TOKEN','User')
if (-not $boardAdmin) { $boardAdmin = [Environment]::GetEnvironmentVariable('FRIENDS_ADMIN_TOKEN','User') }
$headers = @{ Authorization = "Bearer $boardAdmin" }
Invoke-RestMethod -Uri 'https://monster-survival.com/api/board?admin=reports' -Headers $headers
```

結果の `targetType` が `thread` なら質問、`answer` なら回答または返信です。`targetId` と `reason` を見て、該当する質問詳細を確認します。通報だけで投稿は自動削除されません。

## 削除手順（約1分）

質問を削除すると、その質問に紐づく回答・返信も削除されます。回答または返信だけを削除する場合は `answer` を指定します。子返信がある投稿は会話を壊さないよう本文を消した「この投稿は削除されました」表示になります。必ず対象IDを一度確認してから実行してください。

```powershell
$boardAdmin = [Environment]::GetEnvironmentVariable('BOARD_ADMIN_TOKEN','User')
if (-not $boardAdmin) { $boardAdmin = [Environment]::GetEnvironmentVariable('FRIENDS_ADMIN_TOKEN','User') }
$headers = @{ Authorization = "Bearer $boardAdmin"; Origin = 'https://monster-survival.com'; 'Content-Type' = 'application/json' }
$body = @{ type = 'thread'; id = '削除対象ID' } | ConvertTo-Json
Invoke-RestMethod -Method Delete -Uri 'https://monster-survival.com/api/board' -Headers $headers -Body $body
```

回答だけの場合は `$body` の `type` を `answer` にします。成功時は `ok: true` が返ります。secretが取得できない、403になる、対象判断に迷う場合は削除せず、Vercelの既存Project環境変数を確認してください。

投稿者自身は投稿端末のlocalStorageに保存された削除情報で削除できます。管理者用secret、生IP、削除tokenはRedisの公開投稿レコードやAnalyticsへ保存・送信しません。
