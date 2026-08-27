# A8広告配置監査

生成元: `data/monetization.json` / `data/affiliate-offers.json`
対象: 公開HTML 110ページ（404を含む）
監査日: 2026-08-25

## Before

- 広告ページ数: 4
- 広告枠数: 4
- 通常広告: OFF（`adsEnabled:false`）

| URL | 広告数 | 案件 | 位置 | desktop/mobile | 表示可否 |
|---|---:|---|---|---|---|
| https://monster-survival.com/ | 1 | ワラウ | 本文下部 | desktop / mobile | 表示 |
| https://monster-survival.com/404.html | 0 | — | — | — | 非表示 |
| https://monster-survival.com/about-data/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/about/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/fire/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/grass/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/rock/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/thunder/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/attribute/water/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/badge-dojo/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/beginner-guide/ | 1 | ポイントインカム | 本文下部 | desktop / mobile | 表示 |
| https://monster-survival.com/boss-rally/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/compare-guides/purabi-vs-denjika/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/compare/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/consult/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/events/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/events/treasure-hunt/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/evolution-priority/ | 1 | マクロミル | 本文下部 | desktop only | 820px以下は非表示 |
| https://monster-survival.com/evolution/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/evolution/t3/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/evolution/t4/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/faq/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/favorites/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/friends/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/guides/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/items/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/normal-guide/ | 1 | Ipsos iSay | 本文下部 | desktop / mobile | 表示 |
| https://monster-survival.com/privacy/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/area-damage/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/buff/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/debuff/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/heal/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/paralysis/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/pierce/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/shield/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/slow/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/stun/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/roles/tank/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/search/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/stages/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/systems/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata-tier/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/atatama/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/batarisu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/birimori/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/birinamazu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/biripiyo/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/boruzarashi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/capibarrie/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/daishell/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/denjika/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/denrou/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/doriruu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/erekineko/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/erekoon/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/fugumaru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/fukurogumo/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/fureebi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/fureimuji/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/furuggu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/gantoru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/gaoden/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/greenbee/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/guuhog/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/haamitora/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/hanarenaishi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/hihidog/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/hikaru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/hikikomoru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/himawarin/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/himori/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/hinyao/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/kaenjack/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/kenkani/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/komakiri/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/korokon/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/korotama/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/kowagaru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/kunbuu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/marushu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/matchiba/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/mogurin/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/mumukaba/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/nekoori/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/nemukurage/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/nenbutsuhebi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/potakage/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/pupunku/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/purabi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/riifuro/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/rokubuhi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/rokuju/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/sabooru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/shiiparusu/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/shizukuchou/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/sukedako/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/tafupen/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/takepanda/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/togegyo/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/tsubaruka/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/tsubutsumuri/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/umimi/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/yaminome/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/yanzaru/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/tata/yotsubird/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/updates/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/updates/2026-08-26/ | 0 | — | — | — | 非表示 |
| https://monster-survival.com/zombie-rush/ | 0 | — | — | — | 非表示 |

## After

- 広告対象ページ数: 79
- インライン枠数: 88
- 固定広告候補枠数: 79（実表示は1セッション最大1回）
- Desktop rail: /evolution-priority/ の1600px以上のみ。表示時は固定slideを出さない。
- 通常広告: 引き続きOFF。空の通常広告枠は表示しない。

| URL | 広告数 | 案件 | 位置 | desktop/mobile | 表示可否 |
|---|---:|---|---|---|---|
| https://monster-survival.com/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/404.html | 0 | — | — | — | 対象外 |
| https://monster-survival.com/about-data/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/about/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/attribute/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/attribute/fire/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/attribute/grass/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/attribute/rock/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/attribute/thunder/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/attribute/water/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/badge-dojo/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/beginner-guide/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/boss-rally/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/compare-guides/purabi-vs-denjika/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/compare/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/consult/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/events/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/events/treasure-hunt/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/evolution-priority/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide）、マクロミル（1920px級 desktop rail） | top / mid / floating / rail | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/evolution/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/evolution/t3/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/evolution/t4/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/faq/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/favorites/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/friends/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/guides/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/items/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/normal-guide/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/privacy/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/area-damage/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/buff/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/debuff/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/heal/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/paralysis/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/pierce/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/shield/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/slow/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/stun/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/roles/tank/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/search/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/stages/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/systems/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/tata-tier/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/atatama/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/batarisu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/birimori/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/birinamazu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/biripiyo/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/boruzarashi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/capibarrie/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/daishell/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/denjika/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/denrou/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/doriruu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/erekineko/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/erekoon/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/fugumaru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/fukurogumo/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/fureebi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/fureimuji/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/furuggu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/gantoru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/gaoden/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/greenbee/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/guuhog/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/haamitora/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/hanarenaishi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/hihidog/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/hikaru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/hikikomoru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/himawarin/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/himori/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/hinyao/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/kaenjack/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/kenkani/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/komakiri/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/korokon/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/korotama/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/kowagaru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/kunbuu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/marushu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/matchiba/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/mogurin/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/mumukaba/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/nekoori/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/nemukurage/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/nenbutsuhebi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/potakage/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/pupunku/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/purabi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/riifuro/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/rokubuhi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/rokuju/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/sabooru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/shiiparusu/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/shizukuchou/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/sukedako/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/tafupen/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/takepanda/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/togegyo/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/tsubaruka/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/tsubutsumuri/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/umimi/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/yaminome/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/yanzaru/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/tata/yotsubird/ | 最大2 | ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |
| https://monster-survival.com/updates/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/updates/2026-08-26/ | 0 | — | — | — | 対象外 |
| https://monster-survival.com/zombie-rush/ | 最大3 | ワラウ（top）、ポイントインカム / Ipsos iSay（mid）、ワラウ（mobile bottom）/ ポイントインカム・Ipsos iSay（desktop slide） | top / mid / floating | desktop / mobile | 表示（固定広告は1セッション1回） |

## A8広告掲載URL管理

A8.net公式ヘルプでは、同一ドメイン内でトップページからリンクされたページへの掲載は可能と案内されています。一方、提携プログラムごとの広告掲載URL提出機能があるため、新規掲載URLは人間がA8管理画面から提出してください。

- 公式: https://support.a8.net/a8/as/faq/2004/08/post_41.html
- 公式: https://support.a8.net/a8/as/faq/manual/ad_url_manage.php
- 一括提出用: `docs/a8-ad-url-submission.csv`（ヘッダーなし、A列=プログラムID、B列=URL）
- このRepository変更だけではA8管理画面への提出は完了しません。
