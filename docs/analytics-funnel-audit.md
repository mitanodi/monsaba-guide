# Analytics Funnel Audit

確認日: 2026-09-05

GA4標準レポート: 2026-08-08〜2026-09-04

Funnel実装Production反映: 2026-09-05 09:03 JST以降

GA4標準レポートは75,651 events、5,430 users、36 event names。6件のFunnel eventはレポート期間末より後に本番反映されたため、現時点では未観測であり0件とは断定しない。

|Event|Trigger|Code status|Production test|GA4 observed|Sample|Status|
|---|---|---|---|---|---|---|
|`home_to_tata`|TOPからTata詳細または`#tatari`|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|
|`tata_to_compare`|Tata詳細からCompare|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|
|`tata_to_team`|Tata詳細からTeam Builder|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|
|`team_to_community`|Team BuilderからCommunity|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|
|`community_to_team`|CommunityからTeam Builder|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|
|`beginner_to_tata`|BeginnerからTata詳細|PASS|実装・対象CTA確認|未観測|null|WAIT_REPORTING_WINDOW|

## 切り分け

- A「まだ実ユーザーが踏んでいない」: 判定不能。標準レポートに実装日がまだ含まれない。
- B「実装後の時間が短い」: 該当。
- C「送信処理が発火していない」: コード・再現テストでは否定。Productionの実利用イベント受信は未確認。
- D「GA4表示遅延」: 該当。標準イベントレポートの終了日は9月4日。
- E「event name mismatch」: 6件のallowlist、click mapping、GA4 event名が完全一致しており否定。

Custom eventのGA4送信は`monster-survival.com`と`www.monster-survival.com`だけで有効。localhostやpreviewからは送信しない。

## Privacy guard

GA4へ送るFunnel parameterは`source_type`、`destination_type`、queryを除去した`page_location`だけ。Tata個別パスは`/tata/:family/`へ匿名化する。検索語、Tata名、family ID、formation、chip、Community本文・title、username、UID、free text、localStorage内容は送らない。

Productionへ検証用の偽イベントは送信していない。次回GA4レポートに2026-09-05が含まれた時点で再確認し、それでも全6件が未観測なら、ユーザー本人に実導線を1回だけ操作してもらいRealtimeで確認する。
