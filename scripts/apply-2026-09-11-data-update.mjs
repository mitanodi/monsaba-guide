import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const write = (file, value) => fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
const today = '2026-09-11';
const storeJa = 'https://play.google.com/store/apps/details?hl=ja&id=com.farlightgames.pgame.gp';
const storeEn = 'https://play.google.com/store/apps/details?hl=en&id=com.farlightgames.pgame.gp';
const nusukeWiki = 'https://w.atwiki.jp/monstersurvival/pages/129.html';
const catalogFile = 'Tatari_Name (1).xlsx';

const forms = {
  nusuke: [
    [1, 'ヌスケ', 'Ringtail', '干脆面', 'コソコソッと登場', 'Bushy Debut', 226],
    [2, 'ラクディット', 'Rizzler', '改头浣面', '変面トリック', 'Sleight of Hand', 227],
    [3, 'マスクーン', 'Zorrock', '怪盗千面', '千面マジック', 'Myriad Masks', 228],
    [4, 'トリックーン', 'Phantothief', '偷心假面', '仮面フィナーレ', 'The Final Act', 229]
  ],
  shizukuchou: [[4, 'エーテリファル', 'Morphanessa', '潋滟水蝶', '永眠ミサイル', null, 164]],
  tsubaruka: [[4, 'ジャンガルパカ', 'Blechlama', '一塌糊驼', 'ドシャツバ嵐', null, 190]]
};

const tatari = read('data/tatari.json');
for (const id of ['shizukuchou', 'tsubaruka']) {
  const family = tatari.families.find((item) => item.id === id);
  for (const [stage, name, nameEn, nameZhHans] of forms[id]) {
    if (!family.evolutions.some((item) => item.stage === stage)) family.evolutions.push({
      stage, name, source: storeJa, image: null, nameEn, nameZhHans,
      verification: { implementation: 'official-store-confirmed', names: 'official-name-table-confirmed', checkedAt: today }
    });
  }
}
if (!tatari.families.some((item) => item.id === 'nusuke')) tatari.families.push({
  id: 'nusuke', familyName: 'ヌスケ', attribute: '岩',
  evolutions: forms.nusuke.map(([stage, name, nameEn, nameZhHans]) => ({
    stage, name, source: stage === 1 ? storeJa : nusukeWiki, image: null, nameEn, nameZhHans,
    verification: { implementation: stage === 1 ? 'official-store-confirmed' : 'external-guide-confirmed', names: 'official-name-table-confirmed', checkedAt: today }
  })),
  skills: forms.nusuke.map(([stage, , , , skillName]) => ({ stage, name: skillName, summary: '効果の詳細は外部攻略資料で確認。ゲーム内数値は未確認です。', stats: [], sources: [nusukeWiki] })),
  searchAliases: ['ヌスケ', 'ラクディット', 'マスクーン', 'トリックーン', 'Ringtail', 'Rizzler', 'Zorrock', 'Phantothief', '干脆面', '改头浣面', '怪盗千面', '偷心假面'],
  zombieRushSkills: {
    sourceType: 'external-guide', sourceUrl: nusukeWiki, checkedAt: today,
    entries: [{ level: 3, name: '盗みにも道義あり' }, { level: 5, name: '一投千金' }, { level: 7, name: '祝砲エース' }]
  }
});
tatari.meta.familyCount = tatari.families.length;
tatari.meta.monsterCount = tatari.families.reduce((sum, family) => sum + family.evolutions.length, 0);
tatari.meta.latestEvidence = { ...tatari.meta.latestEvidence, checkedAt: today, gameVersion: '0.47.1', sourceUrl: storeJa };
write('data/tatari.json', tatari);

const skills = read('data/tata-skills.json');
for (const id of ['shizukuchou', 'tsubaruka']) {
  const family = tatari.families.find((item) => item.id === id);
  for (const [stage, name, nameEn, nameZhHans, skillName] of forms[id]) {
    if (!skills.byFamily[id].stages.some((item) => item.stage === stage)) skills.byFamily[id].stages.push({
      stage, tataName: name, skillName, description: 'スキル名のみ外部攻略資料で確認。効果と数値はゲーム内資料待ちです。', values: [],
      sources: [id === 'shizukuchou' ? 'https://w.atwiki.jp/monstersurvival/pages/37.html' : 'https://w.atwiki.jp/monstersurvival/pages/60.html'],
      evolutionSource: storeJa, nameEn, nameZhHans, verificationStatus: 'name-confirmed-values-pending'
    });
  }
  skills.byFamily[id].familyName = family.familyName;
}
if (!skills.byFamily.nusuke) skills.byFamily.nusuke = {
  familyId: 'nusuke', familyName: 'ヌスケ', attribute: '岩',
  stages: forms.nusuke.map(([stage, name, nameEn, nameZhHans, skillName, skillNameEn]) => ({
    stage, tataName: name, skillName, skillNameEn,
    description: '外部攻略資料でスキル名と概要を確認。ゲーム内の効果数値は未確認です。', values: [], sources: [nusukeWiki], evolutionSource: stage === 1 ? storeJa : nusukeWiki,
    nameEn, nameZhHans, verificationStatus: 'external-guide-confirmed-values-pending'
  }))
};
skills.totals.families = tatari.meta.familyCount;
skills.totals.stages = tatari.meta.monsterCount;
skills.totals.skills = tatari.meta.monsterCount;
skills.version = '2026-09-11';
skills.latestUpdateEvidence = [{ sourceType: 'official-store', url: storeJa, checkedAt: today, scope: ['nusuke-implementation', 'new-t4-implementation'] }, { sourceType: 'external-guide', url: nusukeWiki, checkedAt: today, scope: ['nusuke-evolution', 'skill-names', 'zombie-rush-skill-names'] }];
write('data/tata-skills.json', skills);

const images = read('data/tata-images.json');
for (const id of ['shizukuchou', 'tsubaruka']) {
  const mapped = images.families.find((item) => item.familyId === id);
  const [stage, name] = forms[id][0];
  if (!mapped.forms.some((item) => item.stage === stage)) mapped.forms.push({ stage, name, src: null, status: 'pending', reason: 'official_image_not_obtained', verifiedAt: today });
}
if (!images.families.some((item) => item.familyId === 'nusuke')) images.families.push({
  order: images.families.length + 1, familyId: 'nusuke', familyDisplay: 'ヌスケ', attribute: '岩',
  stage1: { stage: 1, name: 'ヌスケ', src: '/assets/tata-image-pending.svg', width: 512, height: 512, status: 'pending', reason: 'official_image_not_obtained' },
  forms: forms.nusuke.map(([stage, name]) => ({ stage, name, src: null, status: 'pending', reason: 'official_image_not_obtained', verifiedAt: today }))
});
const mappedForms = images.families.flatMap((item) => item.forms || []);
images.counts = { ...images.counts, families: images.families.length, forms: mappedForms.length, verifiedForms: mappedForms.filter((item) => item.status === 'verified').length, pendingForms: mappedForms.filter((item) => item.status === 'pending').length };
images.officialPendingReview = { ...(images.officialPendingReview || {}), nusuke: 'Official creator image not obtained as of 2026-09-11', shizukuchouT4: 'Official creator image not obtained', tsubarukaT4: 'Official creator image not obtained' };
write('data/tata-images.json', images);

const nameSources = read('data/tata-name-i18n-sources.json');
for (const [familyId, entries] of Object.entries(forms)) for (const [stage, japaneseName, englishName, simplifiedChineseName, , , sourceRow] of entries) {
  if (!nameSources.forms.some((item) => item.familyId === familyId && item.stage === stage)) nameSources.forms.push({
    familyId, stage, japaneseName, englishName, simplifiedChineseName, confidence: 'confirmed',
    sourceType: 'official-name-table', nameListSource: { file: catalogFile, sheet: '塔塔名字 Tatari Names', sourceRow },
    implementationSource: { ja: storeJa, en: storeEn }, checkedAt: today
  });
}
nameSources.summary = { canonicalForms: tatari.meta.monsterCount, englishConfirmed: tatari.meta.monsterCount, simplifiedChineseConfirmed: tatari.meta.monsterCount, bothConfirmed: tatari.meta.monsterCount, needsReview: 0 };
write('data/tata-name-i18n-sources.json', nameSources);

const trials = read('data/evolution-trials.json');
for (const id of ['shizukuchou', 'tsubaruka']) {
  const item = trials.families.find((family) => family.familyId === id);
  const [stage, tataName] = forms[id][0];
  if (!item.conditions.some((condition) => condition.stage === stage)) item.conditions.push({ stage, tataName, condition: '進化条件の詳細を確認中', status: 'pending', needsHumanVerification: true, sourceType: 'official-store-plus-community', sourceUrl: storeJa, verifiedAt: today });
}
if (!trials.families.some((item) => item.familyId === 'nusuke')) trials.families.push({ familyId: 'nusuke', familyName: 'ヌスケ', attribute: '岩', conditions: forms.nusuke.slice(1).map(([stage, tataName]) => ({ stage, tataName, condition: '進化条件のアイコン意味・AND/ORを確認中', status: 'pending', needsHumanVerification: true, sourceType: 'community', sourceUrl: nusukeWiki, verifiedAt: today })) });
trials.familyCount = trials.families.length;
trials.updated = today;
write('data/evolution-trials.json', trials);

const gifts = read('data/gift-codes.json');
const externalRewards = {
  openfesta26: [['candy', 3000], ['silver_brick', 5], ['capsule', 1]],
  openfestb26: [['candy', 1500], ['silver_brick', 1], ['cookie', 1]],
  openfestc26: [['candy', 1000], ['silver_brick', 1], ['cookie', 1]],
  ttukkapet26: [['candy', 1500], ['silver_brick', 5], ['capsule', 1]]
};
for (const entry of gifts.active) if (externalRewards[entry.code]) Object.assign(entry, { reward: externalRewards[entry.code].map(([item, quantity]) => ({ item, quantity })), rewardStatus: 'external_source_unredeemed', confirmationStatus: 'externally_listed_unredeemed', lastChecked: today, isNew: entry.code === 'ttukkapet26' });
if (!gifts.active.some((entry) => entry.code === 'ttukkapet26')) gifts.active.unshift({ code: 'ttukkapet26', isNew: true, reward: externalRewards.ttukkapet26.map(([item, quantity]) => ({ item, quantity })), rewardStatus: 'external_source_unredeemed', expiresAt: null, expiryStatus: 'unannounced', confirmationStatus: 'externally_listed_unredeemed', lastChecked: today, sourceUrl: 'https://w.atwiki.jp/monstersurvival/pages/1.html' });
gifts.version = 2; gifts.lastChecked = today; gifts.availabilityStatement = 'publicly_listed_not_all_redeemed';
gifts.researchNotes = { checkedAt: today, notAdded: ['dcardtatago', 'steeamertata'], reason: '日本版の適用地域・有効性を確認できる根拠不足', statusFieldsSeparated: true };
write('data/gift-codes.json', gifts);

const events = read('data/events.json');
events.version = 3; events.updated = today;
const upsertEvent = (event) => { const index = events.events.findIndex((item) => item.id === event.id); if (index >= 0) events.events[index] = { ...events.events[index], ...event }; else events.events.push(event); };
upsertEvent({ id: 'carnival-fest', name: 'カーニバルフェス', status: 'implemented', href: '/events/carnival-fest/', summary: 'v0.47.1で追加されたイベント。詳細な報酬・確率は外部攻略資料で確認し、ゲーム内検証待ち。', verificationStatus: 'official-store-confirmed', sourceType: 'official-store', sourceUrl: storeJa, verifiedAt: today, officialNames: { ja: 'カーニバルフェス', en: 'Carnival Rush', 'zh-CN': null }, needsHumanVerification: true, humanVerification: ['開催中サーバー', '全報酬', '全確率'] });
const officialEventFacts = { sourceType: 'official-store', sourceUrl: storeJa, checkedAt: today, version: '0.47.1' };
for (const id of ['running-party', 'fishing-tournament', 'island-treasure']) { const event = events.events.find((item) => item.id === id); event.officialUpdate = { ...officialEventFacts, fact: id === 'running-party' ? '新テーマ「ラフティング大会」追加' : '新しい繰り返し報酬追加' }; }
events.officialSystemUpdates = [
  { id: 'boss-rally-cookie-reward', fact: '各ボスの全難易度クリアごとにランキングのクッキー報酬を基本値の10%加算（上限50%）', calculation: 'base-value-additive', unknowns: ['同一ボス再クリア', 'リセット時期', '過去クリア分'], sourceType: 'user-shared-patch-note-transcription', checkedAt: today, officialOutline: officialEventFacts },
  { id: 'camp-day-night-bamboo', fact: 'キャンプ場の昼夜変化、時間帯に応じたタタの様子の変化、建物ショップの「竹林の街」追加', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, officialOutline: officialEventFacts },
  { id: 'friend-limit-80', fact: 'フレンド上限80人', ...officialEventFacts },
  { id: 'card-album-filters', fact: 'カード交換時の星ランク絞り込みと、プレゼントカードの連続受取演出最適化', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, officialOutline: officialEventFacts },
  { id: 'recommended-tatari-entry', fact: 'ボスラリー・ゾンビラッシュ・アイランドトレジャーの上級プレイヤー使用率と参考編成への入口を「オススメのタタ」画面へ移動', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, numericUsageRates: null },
  { id: 'status-display-fix', fact: '一部画面のタタのステータス表示不具合を修正', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, balanceChange: false },
  { id: 'zombie-rush-pakuma-effect', fact: 'パクマ系のゾンビラッシュ専用スキルのエフェクト表現を最適化', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, balanceChange: false },
  { id: 'zombie-rush-special-chip-repeat-fix', fact: '一部の特殊チップを繰り返し選択できる不具合を修正', sourceType: 'user-shared-patch-note-transcription', checkedAt: today, affectedChipIds: null }
];
const runningParty = events.events.find((item) => item.id === 'running-party');
runningParty.currentTheme = {
  label: 'ラフトレース', themeNameInNotice: 'ラフティング大会', relationship: 'ランニングパーティーの新テーマ',
  scheduledStart: '2026-09-12', timezone: 'Asia/Tokyo', scheduleStatus: 'user-reported', sourceType: 'user-report',
  ruleStatus: 'pending', note: '従来テーマと完全に同じルールかは未確認',
  searchAliases: ['ランニングパーティ', 'ランニングパーティー', 'ラフティング大会', 'ラフトレース', 'Marathon Party', 'Raft Race']
};
const fishing = events.events.find((item) => item.id === 'fishing-tournament');
fishing.officialUpdate = { ...fishing.officialUpdate, threshold: { item: 'シルバーサカナコイン', amount: 20000000 }, repeatRewardContents: null, sourceType: 'user-shared-patch-note-transcription', officialOutline: officialEventFacts };
const island = events.events.find((item) => item.id === 'island-treasure');
island.officialUpdate = { ...island.officialUpdate, sourceType: 'user-shared-patch-note-transcription', officialOutline: officialEventFacts, changes: [
  'MVP報酬へフェスボックス追加', 'フェスボックス初回獲得時にパーティホール追加', 'バンケットハウスでギフトボックスを共有',
  '訪問者はランダムなビー玉報酬を獲得', 'ギフトボックスは獲得から5日間有効', '期限切れギフトボックスは金レンガへ自動変換',
  'バンケットハウスで実績を展示', 'チームキルランキングのエアドロップ報酬を削除'
], unknowns: ['変換レート', 'ビー玉の抽選範囲', '訪問回数制限'] };
events.season2Preview = {
  status: 'announced-for-next-update-not-implemented', sourceType: 'user-shared-patch-note-transcription', checkedAt: today,
  items: ['ゾンビラッシュ専用スキルとチップ等のバランス調整', '専用スキルのステータス確認機能', 'シーズンランキングのリセット', 'ステージ難易度の調整', 'Season 1最高到達難易度の1つ前を引き継ぐ'],
  noNumericChanges: true, wordingCaveat: '最高到達難易度を最高クリア難易度へ読み替えない'
};
write('data/events.json', events);

const quality = read('data/i18n/quality-overrides.json');
const translations = {
  en: {
    'モンサバのタタ65系統を草・水・火・雷・岩の属性別に探し、Tier・役割・進化優先・比較へ進める属性ハブです。': 'Browse all 65 Tatari families by Grass, Water, Fire, Lightning, and Rock, then continue to tiers, roles, evolution priorities, and comparisons.',
    '65系統を5属性から探す': 'Browse 65 families across 5 attributes', '10件': '10 entries', 'カーニバルフェス': 'Carnival Rush',
    'v0.47.1で追加されたイベント。詳細な報酬・確率は外部攻略資料で確認し、ゲーム内検証待ち。': 'An event added in v0.47.1. Detailed rewards and rates are based on an external guide and await in-game verification.',
    '確認日：2026-09-11': 'Checked: September 11, 2026', 'ミストリア → エーテリファル': 'Waveflutter → Morphanessa',
    'ラクディット → マスクーン': 'Rizzler → Zorrock', 'マスクーン → トリックーン': 'Zorrock → Phantothief',
    'モンサバ攻略DBは、モンスターサバイバル（モンサバ）のタタ65系統・236体を収録。Tier、進化先、スキル効果・数値を一覧で確認できます。': 'Clash of Critters Guide DB covers 65 Tatari families and 236 forms, with tier ratings, evolution paths, skills, and verified values.',
    'シズクジ → シズクチョウ → ミストリア → エーテリファル': 'Dewgrub → Ripplewing → Waveflutter → Morphanessa', '永眠ミサイル': 'Eternal Sleep Missile',
    'ベロパカ → ツバルカ → ビチャルパカ → ジャンガルパカ': 'Lollama → Slobberlama → Ptooielama → Blechlama', 'ドシャツバ嵐': 'Torrential Spitstorm',
    'ヌスケ → ラクディット → マスクーン → トリックーン': 'Ringtail → Rizzler → Zorrock → Phantothief',
    'コソコソッと登場': 'Bushy Debut', '変面トリック': 'Sleight of Hand', '千面マジック': 'Myriad Masks', '仮面フィナーレ': 'The Final Act',
    '外部攻略資料でスキル名と概要を確認。ゲーム内の効果数値は未確認です。': 'The skill name and overview were checked against an external guide; in-game values remain unverified.',
    'スキル名のみ外部攻略資料で確認。効果と数値はゲーム内資料待ちです。': 'Only the skill name is externally confirmed; effects and values await in-game evidence.',
    '確認済み数値は収録されていません。': 'No verified values are currently recorded.',
    'モンサバのベロパカ系（ベロパカ → ツバルカ → ビチャルパカ → ジャンガルパカ）の進化先、スキル、確認済み数値を掲載。': 'Evolution, skill, and verified-value data for the Lollama family (Lollama → Slobberlama → Ptooielama → Blechlama).'
  },
  'zh-CN': {
    'モンサバのタタ65系統を草・水・火・雷・岩の属性別に探し、Tier・役割・進化優先・比較へ進める属性ハブです。': '按草、水、火、雷、岩五种属性浏览全部65个Tatari系列，并查看Tier、定位、进化优先级与比较。',
    '65系統を5属性から探す': '按5种属性浏览65个系列', '10件': '10项', 'カーニバルフェス': '嘉年华冲刺',
    'v0.47.1で追加されたイベント。詳細な報酬・確率は外部攻略資料で確認し、ゲーム内検証待ち。': 'v0.47.1新增活动。详细奖励与概率来自外部攻略资料，仍待游戏内验证。',
    '確認日：2026-09-11': '确认日期：2026年9月11日', 'ミストリア → エーテリファル': '水舞蝶 → 潋滟水蝶',
    'ラクディット → マスクーン': '改头浣面 → 怪盗千面', 'マスクーン → トリックーン': '怪盗千面 → 偷心假面',
    'モンサバ攻略DBは、モンスターサバイバル（モンサバ）のタタ65系統・236体を収録。Tier、進化先、スキル効果・数値を一覧で確認できます。': 'Clash of Critters 攻略数据库收录65个Tatari系列、共236个形态，可查看Tier、进化路线、技能效果和已确认数值。',
    'シズクジ → シズクチョウ → ミストリア → エーテリファル': '露水虫 → 露水蝶 → 水舞蝶 → 潋滟水蝶', '永眠ミサイル': '永眠导弹',
    'ベロパカ → ツバルカ → ビチャルパカ → ジャンガルパカ': '小舌驼 → 口水驼 → 啊呸驼 → 一塌糊驼', 'ドシャツバ嵐': '暴雨唾液风暴',
    'ヌスケ → ラクディット → マスクーン → トリックーン': '干脆面 → 改头浣面 → 怪盗千面 → 偷心假面',
    'コソコソッと登場': '悄然登场', '変面トリック': '变脸戏法', '千面マジック': '千面魔术', '仮面フィナーレ': '假面终章',
    '外部攻略資料でスキル名と概要を確認。ゲーム内の効果数値は未確認です。': '技能名称与概要已由外部攻略资料确认，游戏内数值仍未验证。',
    'スキル名のみ外部攻略資料で確認。効果と数値はゲーム内資料待ちです。': '仅技能名称由外部攻略资料确认，效果与数值等待游戏内资料。',
    '確認済み数値は収録されていません。': '目前未收录已验证数值。',
    'モンサバのベロパカ系（ベロパカ → ツバルカ → ビチャルパカ → ジャンガルパカ）の進化先、スキル、確認済み数値を掲載。': '收录小舌驼系列（小舌驼 → 口水驼 → 啊呸驼 → 一塌糊驼）的进化、技能与已确认数值。'
  }
};
Object.assign(quality.en, translations.en);
Object.assign(quality['zh-CN'], translations['zh-CN']);
Object.assign(quality.en, {
  'カーニバルフェス 攻略｜モンサバ イベント': 'Carnival Rush Guide | Clash of Critters Events', 'カーニバルフェス 攻略': 'Carnival Rush Guide',
  'v0.46.1・2026年8月31日確認': 'v0.46.1 · Checked August 31, 2026', '現行詳細は確認待ち': 'Current details pending', 'v0.47.1で追加': 'Added in v0.47.1',
  'イベント概要・基本ルール': 'Overview and basic rules', 'クエストでラッキーコインを獲得し、ラッキーマシンで特定アイコンをそろえて報酬を得るイベントです。': 'Complete quests for Lucky Coins and match specific icons on the Lucky Machine to earn rewards.',
  '攻略の流れ・優先事項': 'Strategy and priorities', 'まずゲーム内のクエストと開催期間を確認し、未確認の確率や必要コイン数を前提にしないで進めます。': 'Check the live quests and event period first; do not rely on unverified rates or coin costs.',
  '初心者が最初にやること': 'First steps for beginners', '現行の倍率・必要数・報酬値を確認できていない項目は数値を掲載していません。': 'No numeric value is shown where the current rate, cost, or reward has not been verified.',
  '重要アイテムと報酬': 'Key items and rewards', '現在の日本版で名称・必要数・報酬内容を確認できる資料が不足しています。過去情報を現行報酬として表示せず、確認後に追加します。': 'Current Japanese evidence for names, costs, and rewards is incomplete. Old rewards are not presented as current.',
  'よくある失敗': 'Common mistakes', '開催期間や過去の倍率・報酬を現行仕様だと決めつけないでください。ゲーム内の開催表示とヘルプを優先してください。': 'Do not treat an old schedule, rate, or reward as current. Follow the in-game event notice and help.',
  '開催中サーバー、全報酬、確率、日別解放条件は確認待ちです。': 'Live servers, all rewards, rates, and daily unlocks remain pending.', '情報源': 'Sources', '国内攻略情報': 'Japanese strategy source',
  'を2026年8月31日に照合し、当サイトで独自に要約しました。画像・表・記事本文は転載せず、詳細仕様を公式確認済みとは表示していません。': 'Cross-checked on August 31, 2026 and independently summarized. Images, tables, and article text were not reproduced, and detailed rules are not labeled official.',
  'イベント攻略へ戻る': 'Back to event guides', 'ゲーム内確認': 'Verified in game', '確認待ち': 'Pending',
  '当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：2026年8月31日': 'Independently organized with primary evidence separated from external information. Last checked: August 31, 2026',
  '新規6形態を追加し、65系統・236体へ更新しました。': 'Added six forms, bringing the database to 65 families and 236 Tatari.'
  ,'v0.46.1・2026年9月11日確認': 'v0.47.1 · Checked September 11, 2026'
  ,'当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：2026年9月11日': 'Independently organized with primary evidence separated from external information. Last checked: September 11, 2026'
  ,'クッキーランキング報酬の変更': 'Cookie ranking reward change'
  ,'各ボスの全難易度クリアごとに、ランキングのクッキー報酬へ基本値の10%を加算（上限は基本値の50%）。複利ではありません。再クリア・リセット・過去クリア分は確認中です。': 'Clearing every difficulty for a boss adds 10% of the base ranking cookie reward, capped at 50%. It is additive, not compound; repeat clears, resets, and retroactive handling remain unverified.'
  ,'現行修正とSeason 2予告': 'Current fixes and Season 2 preview'
  ,'現行更新はパクマ系専用スキルのエフェクト最適化と、一部特殊チップの繰り返し選択不具合修正です。性能変更とは扱いません。Season 2のスキル・チップ調整、ステータス確認、ランキングリセット、難易度調整、Season 1最高到達難易度の1つ前への引き継ぎは次回アップデート予告であり、現行仕様へ適用していません。': 'The current update optimizes Pakuma-family effects and fixes repeated selection of some special chips; it is not treated as a balance change. Season 2 balance, stat inspection, ranking reset, difficulty tuning, and inheritance from one level below the highest Season 1 difficulty reached remain a next-update preview.'
});
Object.assign(quality['zh-CN'], {
  'カーニバルフェス 攻略｜モンサバ イベント': 'Carnival Rush 攻略｜Clash of Critters 活动', 'カーニバルフェス 攻略': 'Carnival Rush 攻略',
  'v0.46.1・2026年8月31日確認': 'v0.46.1・2026年8月31日确认', '現行詳細は確認待ち': '当前细节待确认', 'v0.47.1で追加': 'v0.47.1新增',
  'イベント概要・基本ルール': '活动概要与基本规则', 'クエストでラッキーコインを獲得し、ラッキーマシンで特定アイコンをそろえて報酬を得るイベントです。': '完成任务取得幸运币，在幸运机中配出指定图标即可获得奖励。',
  '攻略の流れ・優先事項': '攻略流程与优先事项', 'まずゲーム内のクエストと開催期間を確認し、未確認の確率や必要コイン数を前提にしないで進めます。': '先确认游戏内任务与举办时间，不要依赖尚未验证的概率或硬币需求。',
  '初心者が最初にやること': '新手首先要做的事', '現行の倍率・必要数・報酬値を確認できていない項目は数値を掲載していません。': '当前倍率、需求数或奖励值尚未确认的项目不显示数值。',
  '重要アイテムと報酬': '重要道具与奖励', '現在の日本版で名称・必要数・報酬内容を確認できる資料が不足しています。過去情報を現行報酬として表示せず、確認後に追加します。': '目前缺少可确认日本版名称、需求数与奖励的资料，不将旧奖励当作当前奖励。',
  'よくある失敗': '常见错误', '開催期間や過去の倍率・報酬を現行仕様だと決めつけないでください。ゲーム内の開催表示とヘルプを優先してください。': '不要把旧举办时间、倍率或奖励当作当前规则，请以游戏内活动显示与帮助为准。',
  '開催中サーバー、全報酬、確率、日別解放条件は確認待ちです。': '当前服务器、全部奖励、概率与每日解锁条件仍待确认。', '情報源': '信息来源', '国内攻略情報': '日本攻略资料',
  'を2026年8月31日に照合し、当サイトで独自に要約しました。画像・表・記事本文は転載せず、詳細仕様を公式確認済みとは表示していません。': '于2026年8月31日核对并由本站独立整理，未转载图片、表格或正文，也未将详细规则标为官方确认。',
  'イベント攻略へ戻る': '返回活动攻略', 'ゲーム内確認': '游戏内确认', '確認待ち': '待确认',
  '当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：2026年8月31日': '本站区分第一手证据与外部信息后独立整理。最后确认：2026年8月31日',
  '新規6形態を追加し、65系統・236体へ更新しました。': '新增6个形态，数据库更新为65个系列、236个Tatari。'
  ,'v0.46.1・2026年9月11日確認': 'v0.47.1・2026年9月11日确认'
  ,'当サイトで一次証拠と外部情報を区別して独自に整理した内容です。最終確認日：2026年9月11日': '本站区分第一手证据与外部信息后独立整理。最后确认：2026年9月11日'
  ,'クッキーランキング報酬の変更': '曲奇排名奖励变更'
  ,'各ボスの全難易度クリアごとに、ランキングのクッキー報酬へ基本値の10%を加算（上限は基本値の50%）。複利ではありません。再クリア・リセット・過去クリア分は確認中です。': '每完成一个首领的全部难度，排名曲奇按基础值增加10%，上限50%，不是复利。重复通关、重置与既往通关仍待确认。'
  ,'現行修正とSeason 2予告': '当前修复与Season 2预告'
  ,'現行更新はパクマ系専用スキルのエフェクト最適化と、一部特殊チップの繰り返し選択不具合修正です。性能変更とは扱いません。Season 2のスキル・チップ調整、ステータス確認、ランキングリセット、難易度調整、Season 1最高到達難易度の1つ前への引き継ぎは次回アップデート予告であり、現行仕様へ適用していません。': '当前更新仅优化パクマ系列特效并修复部分特殊芯片重复选择问题，不视为数值调整。Season 2的平衡、属性查看、排名重置、难度调整及从Season 1最高到达难度的前一级继承仍属下次更新预告。'
});
write('data/i18n/quality-overrides.json', quality);

console.log(`Applied 2026-09-11 data update: ${tatari.meta.familyCount} families / ${tatari.meta.monsterCount} forms / ${gifts.active.length} gift codes / ${events.events.length} events`);
