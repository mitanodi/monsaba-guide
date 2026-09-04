# Phase 2 content / community evidence — 2026-09-04

## Scope and trust boundaries

- Official-asset source: `MonsterSurvival-Official-Creator-Assets/04_MANIFEST/assets-master.json` (read-only).
- Website mappings remain in `data/official-assets/`; the 51 GB original mirror is not copied or modified.
- Community records use `sourceType: community_user` and are not mixed with official, in-game, externally confirmed, or site-rating data.
- No fake production posts or test seed data are included.

## Event asset re-audit (26/26)

All 26 entries map only to Treasure Hunt. The four already-selected larger icon variants remain the only web adoptions. The other 22 are retained outside the repository because they are video/reference material, smaller variants, board-object art with unclear editorial value, or duplicates of the selected concept. Artwork is not treated as evidence for rules or rewards.

| Asset ID | Original filename | Resolution | Alpha | Event candidate | Confidence | Site usage |
|---|---|---:|:---:|---|---|---|
| MSOA-05880 | treasure hunting.mp4 | 2160×3840 | no | treasure-hunt | reference-only | not adopted |
| MSOA-06323 | txui_treasure_1_1.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06324 | txui_treasure_1_2.png | 178×168 | yes | treasure-hunt | candidate | adopted as WebP |
| MSOA-06325 | txui_treasure_1_3.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06326 | txui_treasure_1_4.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06327 | txui_treasure_2_1.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06328 | txui_treasure_2_2.png | 178×168 | yes | treasure-hunt | candidate | adopted as WebP |
| MSOA-06329 | txui_treasure_2_3.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06330 | txui_treasure_2_4.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06331 | txui_treasure_3_1.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06332 | txui_treasure_3_2.png | 178×168 | yes | treasure-hunt | candidate | adopted as WebP |
| MSOA-06333 | txui_treasure_3_3.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06334 | txui_treasure_3_4.png | 88×78 | yes | treasure-hunt | candidate | not adopted; smaller variant |
| MSOA-06335 | txui_treasure_currency.png | 116×132 | yes | treasure-hunt | candidate | adopted as WebP |
| MSOA-06336 | txui_treasurehunt_grid_book.png | 150×150 | yes | treasure-hunt | candidate | not adopted; board object |
| MSOA-06337 | txui_treasurehunt_grid_cola.png | 75×225 | yes | treasure-hunt | candidate | not adopted; board object |
| MSOA-06338 | txui_treasurehunt_grid_radio.png | 225×150 | yes | treasure-hunt | candidate | not adopted; board object |
| MSOA-06339 | 小号.png | 1100×400 | yes | treasure-hunt | candidate | not adopted; unclear editorial use |
| MSOA-06340 | 机械假肢.png | 150×600 | yes | treasure-hunt | candidate | not adopted; unclear editorial use |
| MSOA-06341 | 游戏机.png | 151×230 | yes | treasure-hunt | candidate | not adopted; unclear editorial use |
| MSOA-06342 | 盗版杂志.png | 6000×4912 | yes | treasure-hunt | candidate | not adopted; oversized board object |
| MSOA-06343 | 老式电视机.png | 1100×760 | yes | treasure-hunt | candidate | not adopted; unclear editorial use |
| MSOA-06344 | 臭臭雕像.png | 580×1200 | yes | treasure-hunt | candidate | not adopted; duplicate concept |
| MSOA-06345 | 臭臭雕像2.png | 580×1200 | yes | treasure-hunt | candidate | not adopted; duplicate concept |
| MSOA-06346 | 针管.png | 6000×4912 | yes | treasure-hunt | candidate | not adopted; oversized board object |
| MSOA-06347 | 飞船修改.png | 450×450 | yes | treasure-hunt | candidate | not adopted; unclear editorial use |

## Skill icon audit (58/58)

- Mapping SSOT: `data/official-assets/skill-icons.json`.
- Result: 58 icons, 58 unique `familyId:stage` keys, 58 represented families, duplicate mappings 0, stage mismatch 0, missing optimized files 0.
- Tata detail generation uses that exact key, fixed `64×64` dimensions, lazy decoding, and meaningful `「family skill スキルアイコン」` alt text.
- No placeholder or generated icon is created for skills without an official icon.

## Beginner recommendation evidence

- Candidate source: `data/tier-ratings.json` → `overall.byFamily.beginner`.
- Target T3 source: `data/evolution-priority.json` → `t3Roadmap.firstPriority`.
- Mode filters: existing `normal` and `zombie` rating fields only.
- Images: verified T1 mappings from `data/tata-images.json`.
- No acquisition-ease claim is generated. Candidate cards are capped at eight and regenerated from SSOT.

## Community architecture and migration decision

- Existing Team Builder share schema (`SHARE_VERSION = 4`) is decoded, validated and canonically re-encoded server-side.
- Existing Upstash Redis environment and Board/Friends secret variables are reused; no service, SQL table, or destructive migration is introduced.
- New Redis namespace only: `monsaba:community:*` (build, sorted indexes, comments, trials, reports, rate limits, duplicate/action reservations).
- List page is indexable; query-based UGC detail is `noindex,follow` and excluded from the sitemap until content quality and operating history justify reconsideration.
- Build text, comments and results are untrusted; client rendering uses DOM `textContent`, while the API rejects markup/control characters and never publishes IP hashes or owner-token hashes.

## Human verification intentionally retained

The five existing pending Tata forms remain unchanged: ネンブツヘビ T4, パクマ T2/T3/T4, スケダコ T4. Event fields already marked `humanVerification` remain pending; no missing values were inferred from artwork.
