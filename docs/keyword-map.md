# Keyword Map

検索ボリューム実数は未取得のため記載しない。1検索意図につき主要URLを1つ定め、query付き検索・比較URLはindex対象にしない。

| 検索意図 | Primary URL | Supporting URLs | 役割 |
|---|---|---|---|
| モンサバ 攻略 | `/` | `/guides/`, `/beginner-guide/` | サイト入口と目的分岐 |
| モンサバ Tier / タタ Tier | `/tata-tier/` | `/tata/{id}/`, `/compare/` | 総合・用途別評価 |
| タタ 進化 | `/evolution-priority/` | `/tata/{id}/`, `/consult/` | 進化差分と条件判断 |
| 進化 優先 | `/evolution-priority/` | `/consult/?flow=evolution` | 必要星数・優先根拠 |
| 属性別 | `/attribute/` → `/attribute/{slug}/` | `/tata/{id}/`, `/compare/` | 属性→役割→個別 |
| Zombie Rush | `/zombie-rush/` | `/updates/2026-08-26/`, `/tata-tier/` | 旧環境とSeason 1予定を分離 |
| Boss Rally | `/boss-rally/` | `/guides/`, `/consult/` | ボス条件と候補 |
| Badge Dojo | `/badge-dojo/` | `/attribute/{slug}/` | 属性別・配置・役割 |
| 通常攻略 | `/normal-guide/` | `/consult/`, `/beginner-guide/` | 症状別対策 |
| タタ名検索 | `/search/` | `/tata/{id}/` | alias・進化名・スキル検索 |
| 2体比較 | `/compare/` | `/tata/{id}/`, `/consult/` | 共有可能な比較、noindex |
| 初心者 | `/beginner-guide/` | `/faq/`, `/evolution-priority/` | 見る順番を案内 |

## 重複回避

- 個別タタは「系統名＋進化＋スキル＋用途」を担当し、Tier一覧本文を複製しない。
- 属性ページは属性内の一覧・役割・比較導線を担当し、属性相性など未確認仕様を創作しない。
- FAQは短い結論だけを担当し、詳細はprimary URLへ送る。
- `/compare/?a=...&b=...` は `noindex,follow`、canonicalは `/compare/`。
