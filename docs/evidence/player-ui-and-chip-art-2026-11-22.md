# 2026-11-22: player UI and chip art follow-up

## User instructions and scope

- Player 1 is blue; player 2 is red. Only presentation changes. IDs, cells, chip order, saved drafts and shared encodings remain unchanged.
- The Tata picker is available immediately, including on small screens. Empty-cell selection also leads directly to the list. Existing search, filters, drag, save/share and mode controls remain.
- Remove optional public citations and editorial/research self-explanations in Japanese, English and simplified Chinese. Keep gameplay conditions, short numeric uncertainties, ordinary navigation, operator/creator credit, official Creator Assets attribution/disclaimer and legal/advertising/privacy notices. The final `generate:player-copy` build pass implements that presentation policy; evidence in data and historical generation inputs is retained.
- Do not add public permission-status or verification-status commentary.

## Little Adult resolution

The user explicitly confirmed: 「小さな大人はレベル５以下対象だよ」. The current condition is Lv.5 or below, inclusive. Lv.4 and Lv.5 are eligible; Lv.6 is outside the condition. This is **user confirmation**, not official confirmation. The previous Wiki table/comment discrepancy is retained in `conditionHistory`. The 30% ATK/DEF/max-HP values remain unchanged. The existing maker selects and shares chips; no battle/stat simulation was added.

## Original Wiki game-card images

The user said 「ウィキに乗ってたよそのページに」「載せていいよ」 and explicitly authorized publishing the 24 additional cards using the existing material policy. This supersedes the previous withholding decision. User authorization and independent third-party licensing are recorded separately: a general third-party redistribution license has not independently been established.

The images come from https://w.atwiki.jp/monstersurvival/pages/128.html and its original `img.atwiki.jp/monstersurvival/attach/83/` attachments. All 24 cards were rendered and visually compared for Japanese name, rank/rarity and artwork. No TataCalc artwork, hotlinks, generated replacements or wrong-rank substitutions are used. The original WebP bytes are stored under content-hashed local filenames. `data/zombie-rush/chip-supplement-2026-11-22.json` records every attachment URL, full SHA-256, dimensions, card ID, name, rarity, correspondence and publication history.

There are six profession emblems at each of ranks I/II/III (18 cards), plus Last Stand III, Long Training III, Little Adult II, Tata Revival II, Frontier Expansion II and Delayed Reward I. The catalog remains append-only: 49 prior chips plus 24 additions, 73 total. Unknown formal English/Chinese names continue to use the Japanese name; effect text remains localized. The required official-material attribution and disclaimer remain in the footer.

Reference: https://tatacalc.shop/en/ld/s4/chips/ was used only for comparison. No licensing claim is inferred from its display.
