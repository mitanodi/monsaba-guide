import fs from 'node:fs';
import path from 'node:path';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';
import { renderGa4Tag } from './update-ga4-tag.mjs';

const root = path.resolve(import.meta.dirname, '..');
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const data = readJson('data/summer-party.json');
const tatari = readJson('data/tatari.json');
const assetVersion = readJson('data/asset-build.json').version;
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const percent = (value) => `${Number(value).toFixed(2)}%`;
const allCards = data.album.sets.flatMap((set) => set.cards);
const pendingNames = allCards.filter((card) => card.name === null).length;

const locales = {
  ja: {
    prefix: '', lang: 'ja', ogLocale: 'ja_JP', home: 'トップ', events: 'イベント攻略',
    title: 'モンサバ サマーパーティ攻略｜カードアルバム・パック確率・交換',
    h1: 'サマーパーティ攻略', subtitle: 'カードアルバム・カード交換・カードコレクション',
    description: 'モンサバのサマーパーティをゲーム内情報から解説。15セットのカードアルバム、カードパック、排出確率、カード交換、スター、カードコレクションの仕様を掲載。',
    checked: '2026年8月31日ゲーム内確認', verified: 'ゲーム内確認済み', pending: '確認中',
    setLabel: 'セット', cardLabel: 'カード枠', album: 'アルバム', collection: 'カードコレクション',
    informationModel: '用語と機能の整理', informationIntro: 'サマーパーティがイベント名です。アルバムはカードを集める機能、カードコレクションはお気に入りカードを装飾して展示する別機能です。',
    albumRules: 'アルバムの基本ルール', packTypes: 'カードパック4種類', rates: 'カード排出確率',
    exchange: 'カード交換・プレゼント', sets: '15セット・135カード枠', setNote: 'カード名は日本語ゲーム画面で読めたものだけを掲載。未所持で名称が隠れていた枠は「未確認カード」としています。取得数やセット進捗は掲載していません。',
    reward: 'セット完成報酬', rewardPending: '画面上の表示数値', rewardCaution: 'アイテム名は画像だけで断定せず確認中',
    no: 'No.', name: 'カード名', rarity: 'レアリティ', type: '種別', white: '白カード', gold: '金カード', unknown: '未確認カード',
    source: '一次証拠とデータ方針', sourceText: 'ユーザー提供のゲーム内スクリーンショット23ページPDFを一次証拠として確認しました。p.1〜15をセット一覧、p.16をイベント名、p.17〜21をアルバム・交換・パック確率、p.22〜23をカードコレクションの根拠に使用しています。個人の所持数・進捗・通貨数は除外しました。',
    dataPolicy: 'データ方針を見る', back: 'イベント攻略へ戻る',
    notOfficialLocale: '',
    packNames: { normal: 'ノーマルパック', advance: 'アドバンスパック', premium: 'プレミアムパック', deluxe: 'デラックスパック' },
    guarantee: { normal: '保証なし', advance: '保証なし', premium: '星3以上を1枚確定', deluxe: '未所持を1枚確定。全所持済みなら金カードを1枚確定' },
    rateLabels: { '1_white': '星1白', '2_white': '星2白', '3_white': '星3白', '4_white': '星4白', '4_gold': '星4金', '5_white': '星5白', '5_gold': '星5金' },
    cardsUnit: '枚', probabilityTotal: '各パックの表示確率合計：100.00%',
    collectionTitle: 'カードコレクションとは？', loaderFlow: 'カードを選択 → カードローダーを使用 → 「飾る」 → 思い出ギャラリーへ展示、という流れです。',
    sourceStatus: '情報状態：ゲーム内一次証拠で確認済み。名称が隠れたカードと報酬アイテム名だけ確認中。'
  },
  en: {
    prefix: '/en', lang: 'en', ogLocale: 'en_US', home: 'Home', events: 'Events',
    title: 'Clash of Critters Summer Party Guide | Album, Pack Rates & Exchange',
    h1: 'Summer Party Guide', subtitle: 'Card Album, Card Exchange and Card Collection',
    description: 'A guide to the Summer Party event based on in-game evidence, covering 15 album sets, 135 card slots, four card packs, pull rates, exchange rules, Stars and Card Collection.',
    checked: 'Verified in game on August 31, 2026', verified: 'Verified in game', pending: 'Pending',
    setLabel: 'sets', cardLabel: 'card slots', album: 'Album', collection: 'Card Collection',
    informationModel: 'Event and feature names', informationIntro: 'Summer Party is the event. Album is the card-collecting feature. Card Collection is a separate feature for decorating favorite cards and displaying them in Memory Gallery.',
    albumRules: 'Album rules', packTypes: 'Four card pack types', rates: 'Card pull rates',
    exchange: 'Card exchange and presents', sets: '15 sets and 135 card slots', setNote: 'Japanese card names are preserved only when visible in the supplied in-game screens. Hidden names remain pending. Account-specific duplicate counts and completion progress are excluded.',
    reward: 'Set completion reward', rewardPending: 'Numbers shown in game', rewardCaution: 'Item names remain pending rather than inferred from icons',
    no: 'No.', name: 'Card name', rarity: 'Rarity', type: 'Type', white: 'White card', gold: 'Gold card', unknown: 'Name pending',
    source: 'Primary evidence and data policy', sourceText: 'The primary evidence is a 23-page PDF of user-supplied in-game screenshots: pp.1–15 for sets, p.16 for the event name, pp.17–21 for Album, exchange and pack rates, and pp.22–23 for Card Collection. Personal holdings, progress and currency balances are excluded.',
    dataPolicy: 'View data policy', back: 'Back to events',
    notOfficialLocale: '“Summer Party” and other English feature labels are descriptive translations; this page does not claim they are confirmed official English in-game names.',
    packNames: { normal: 'Normal Pack', advance: 'Advance Pack', premium: 'Premium Pack', deluxe: 'Deluxe Pack' },
    guarantee: { normal: 'No additional guarantee shown', advance: 'No additional guarantee shown', premium: 'One 3★ or higher card guaranteed', deluxe: 'One unowned card guaranteed; if all are owned, one gold card is guaranteed' },
    rateLabels: { '1_white': '1★ white', '2_white': '2★ white', '3_white': '3★ white', '4_white': '4★ white', '4_gold': '4★ gold', '5_white': '5★ white', '5_gold': '5★ gold' },
    cardsUnit: 'cards', probabilityTotal: 'Displayed probability total for every pack: 100.00%',
    collectionTitle: 'What is Card Collection?', loaderFlow: 'Choose a card → use a Card Loader → select Decorate → display it in Memory Gallery.',
    sourceStatus: 'Status: verified from primary in-game evidence; hidden card names and reward item names remain pending.'
  },
  'zh-CN': {
    prefix: '/zh-cn', lang: 'zh-CN', ogLocale: 'zh_CN', home: '首页', events: '活动攻略',
    title: 'Clash of Critters 夏日派对攻略｜卡册、卡包概率与交换',
    h1: '夏日派对攻略', subtitle: '卡册、卡片交换与卡片收藏',
    description: '依据游戏内资料整理夏日派对：15套卡册、135个卡位、4种卡包、抽取概率、卡片交换、星星与卡片收藏。',
    checked: '2026年8月31日游戏内确认', verified: '游戏内确认', pending: '待确认',
    setLabel: '套', cardLabel: '个卡位', album: '卡册', collection: '卡片收藏',
    informationModel: '活动与功能名称', informationIntro: '夏日派对是活动名称；卡册是收集卡片的功能；卡片收藏则是装饰喜欢的卡片并展示到回忆画廊的另一项功能。',
    albumRules: '卡册基本规则', packTypes: '4种卡包', rates: '卡片抽取概率',
    exchange: '卡片交换与赠送', sets: '15套、135个卡位', setNote: '仅保留资料画面中可读的日文卡名；未持有而隐藏名称的卡位标为待确认。账号重复数量与完成进度均已排除。',
    reward: '整套完成奖励', rewardPending: '游戏内显示数值', rewardCaution: '不根据图标猜测道具名称，名称待确认',
    no: '编号', name: '卡名', rarity: '星级', type: '类型', white: '白卡', gold: '金卡', unknown: '卡名待确认',
    source: '第一手证据与数据方针', sourceText: '第一手证据为用户提供的23页游戏内截图PDF：第1–15页用于卡套，第16页用于活动名称，第17–21页用于卡册、交换与卡包概率，第22–23页用于卡片收藏。个人持有量、进度与货币数量均未使用。',
    dataPolicy: '查看数据方针', back: '返回活动攻略',
    notOfficialLocale: '“夏日派对”等中文功能名为说明性翻译，本站不将其标注为已经确认的游戏内官方中文名称。',
    packNames: { normal: '普通卡包', advance: '进阶卡包', premium: '高级卡包', deluxe: '豪华卡包' },
    guarantee: { normal: '未显示额外保底', advance: '未显示额外保底', premium: '必得1张3★以上卡片', deluxe: '必得1张未持有卡；全部持有时必得1张金卡' },
    rateLabels: { '1_white': '1★白', '2_white': '2★白', '3_white': '3★白', '4_white': '4★白', '4_gold': '4★金', '5_white': '5★白', '5_gold': '5★金' },
    cardsUnit: '张', probabilityTotal: '每种卡包的显示概率合计：100.00%',
    collectionTitle: '什么是卡片收藏？', loaderFlow: '选择卡片 → 使用卡片装饰器 → 点击装饰 → 展示到回忆画廊。',
    sourceStatus: '信息状态：已由游戏内第一手证据确认；隐藏卡名与奖励道具名称仍待确认。'
  }
};

const albumRules = {
  ja: [
    'カードはカードパックから入手します。カードパックはランニングパーティ、オタカラ探しなどのゲーム内イベントで入手できます。',
    '1セット9枚をそろえるとセット完成報酬を獲得できます。今期アルバム内の全セット完成で目玉報酬を獲得できます。',
    '今回のイベントで獲得できるアイコンフレームは永久アイテムです。',
    'パック開封で重複カードを獲得すると、そのカードの星ランクと同じ数のスターを追加で獲得します。スターは報酬と交換できます。'
  ],
  en: [
    'Cards come from card packs. Packs can be earned from in-game events such as Running Party and Treasure Hunt.',
    'Completing all nine cards in a set awards the set reward. Completing every set in the current Album awards the featured reward.',
    'The icon frame available from this event is a permanent item.',
    'A duplicate from a pack grants additional Stars equal to that card’s star rank. Stars can be exchanged for rewards.'
  ],
  'zh-CN': [
    '卡片来自卡包；卡包可从跑步派对、寻宝等游戏内活动获得。',
    '集齐一套9张卡可获得整套奖励；完成本期卡册的全部套组可获得重点奖励。',
    '本次活动中可获得的头像框为永久道具。',
    '开包获得重复卡时，会额外得到与该卡星级相同数量的星星；星星可兑换奖励。'
  ]
};

const exchangeRules = {
  ja: [
    '余ったカードは他のトレーナーと交換・プレゼントできます。',
    '金カードの交換・プレゼントは特定の時期に限られます。今回の証拠だけでは現在が対象期間か断定しません。',
    'プレゼントは、そのカードを持っていないトレーナーにのみ行えます。',
    '交換を申し込めるのは、自分が未所持のカードだけです。',
    '1日のプレゼント・交換には回数制限があります。失敗・撤回時は消費回数が返還されます。',
    'プレゼントまたは交換が完了するとスター×1を獲得します。この方法で1日に得られるスター数には上限があります。'
  ],
  en: [
    'Extra cards can be exchanged with or presented to other trainers.',
    'Gold-card exchanges and presents are limited to special periods. The supplied evidence does not establish whether one is active now.',
    'A card can be presented only to a trainer who does not own it.',
    'You can request only cards that you do not own.',
    'Daily exchange and present attempts are limited. A failed or withdrawn attempt refunds the consumed count.',
    'A completed exchange or present grants one Star. Stars earned this way have a daily cap.'
  ],
  'zh-CN': [
    '多余卡片可与其他训练师交换或赠送。',
    '金卡只能在特定时期交换或赠送；现有证据不能判断当前是否处于该时期。',
    '只能把卡片赠送给尚未持有该卡的训练师。',
    '只能申请交换自己尚未持有的卡片。',
    '每天的赠送与交换有次数限制；失败或撤回时会返还已消耗次数。',
    '赠送或交换完成后可获得1颗星星；通过此方式每天获得的星星存在上限。'
  ]
};

const collectionRules = {
  ja: ['カードローダーを使ってお気に入りカードを装飾できます。', '装飾したカードは思い出ギャラリーへ展示できます。', 'カードローダーが不足している場合は、1個につきビー玉100で購入できます。', '今期アルバム終了後も、未使用のカードローダーは次期アルバムへ持ち越されます。'],
  en: ['Use a Card Loader to decorate a favorite card.', 'Decorated cards can be displayed in Memory Gallery.', 'If you need another Card Loader, one costs 100 marbles.', 'Unused Card Loaders carry over to the next Album after the current Album ends.'],
  'zh-CN': ['可使用卡片装饰器装饰喜欢的卡片。', '装饰后的卡片可展示到回忆画廊。', '卡片装饰器不足时，可用100颗弹珠购买1个。', '本期卡册结束后，未使用的卡片装饰器会结转到下一期卡册。']
};

function orderedList(items) {
  return `<ol class="number-list">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ol>`;
}

function renderPackCards(t) {
  return `<div class="summer-pack-grid">${data.packs.map((pack) => `<article class="summer-pack-card"><h3>${esc(t.packNames[pack.id])}</h3><p class="summer-pack-count"><strong>${pack.cardCount}</strong> ${esc(t.cardsUnit)}</p><p>${esc(t.guarantee[pack.id])}</p></article>`).join('')}</div>`;
}

function renderRates(t) {
  const keys = Object.keys(data.packs[0].probabilities);
  return `<div class="summer-rate-grid">${keys.map((key) => `<article class="summer-rate-card"><h3>${esc(t.rateLabels[key])}</h3><dl>${data.packs.map((pack) => `<div><dt>${esc(t.packNames[pack.id])}</dt><dd>${percent(pack.probabilities[key])}</dd></div>`).join('')}</dl></article>`).join('')}</div><p class="section-note"><strong>${esc(t.probabilityTotal)}</strong></p>`;
}

function renderSets(t) {
  return `<div class="summer-set-list">${data.album.sets.map((set, index) => {
    const amounts = set.completionReward.displayedAmounts.join(' / ');
    const cards = set.cards.map((card) => `<li class="summer-card-slot ${card.name ? '' : 'is-pending'}"><span class="summer-card-no">${esc(t.no)}${card.cardNo}</span><strong>${esc(card.name || t.unknown)}</strong><span>${'★'.repeat(card.stars)} · ${esc(card.cardType === 'gold' ? t.gold : t.white)}</span></li>`).join('');
    return `<details class="summer-set"${index === 0 ? ' open' : ''}><summary><span>${index + 1}. ${esc(set.name)}</span><span>9 ${esc(t.cardLabel)}</span></summary><div class="summer-set-body"><p class="summer-reward"><strong>${esc(t.reward)}:</strong> ${esc(t.rewardPending)} ${esc(amounts)}（${esc(t.rewardCaution)}）</p><ul class="summer-card-grid">${cards}</ul></div></details>`;
  }).join('')}</div>`;
}

function body(locale, t) {
  return `<article class="wrap static-section summer-party-guide">
    <div class="trust-label-row"><span class="trust-label is-verified">${esc(t.verified)}</span><span class="trust-label is-pending">${pendingNames} ${esc(t.pending)}</span></div>
${t.notOfficialLocale ? `<div class="alert-box"><p>${esc(t.notOfficialLocale)}</p></div>` : ''}
    <div class="summer-stats"><article><strong>15</strong><span>${esc(t.setLabel)}</span></article><article><strong>9</strong><span>${esc(t.cardLabel)} / ${esc(t.setLabel)}</span></article><article><strong>135</strong><span>${esc(t.cardLabel)}</span></article><article><strong>4</strong><span>${esc(t.packTypes)}</span></article></div>
    <section aria-labelledby="summer-structure"><h2 id="summer-structure" class="page-h2">${esc(t.informationModel)}</h2><p>${esc(t.informationIntro)}</p><div class="summer-structure"><article><h3>${esc(t.album)}</h3><p>Card sets · Card packs · Exchange · Stars · Set rewards</p></article><article><h3>${esc(t.collection)}</h3><p>Card Loader · Memory Gallery · Decorated cards</p></article></div></section>
    <section aria-labelledby="summer-album"><h2 id="summer-album" class="page-h2">${esc(t.albumRules)}</h2>${orderedList(albumRules[locale])}</section>
    <section aria-labelledby="summer-packs"><h2 id="summer-packs" class="page-h2">${esc(t.packTypes)}</h2>${renderPackCards(t)}</section>
    <section aria-labelledby="summer-rates"><h2 id="summer-rates" class="page-h2">${esc(t.rates)}</h2>${renderRates(t)}</section>
    <section aria-labelledby="summer-exchange"><h2 id="summer-exchange" class="page-h2">${esc(t.exchange)}</h2>${orderedList(exchangeRules[locale])}</section>
    <section aria-labelledby="summer-sets"><h2 id="summer-sets" class="page-h2">${esc(t.sets)}</h2><p>${esc(t.setNote)}</p>${renderSets(t)}</section>
    <section aria-labelledby="summer-collection"><h2 id="summer-collection" class="page-h2">${esc(t.collectionTitle)}</h2>${orderedList(collectionRules[locale])}<div class="summary-box"><strong>Card Loader → Memory Gallery</strong><p>${esc(t.loaderFlow)}</p></div></section>
    <section aria-labelledby="summer-source"><h2 id="summer-source" class="page-h2">${esc(t.source)}</h2><p>${esc(t.sourceText)}</p><p>${esc(t.sourceStatus)}</p><nav class="attribute-guide-nav"><a href="${t.prefix}/about-data/">${esc(t.dataPolicy)}</a><a href="${t.prefix}/events/">${esc(t.back)}</a></nav></section>
  </article>`;
}

function localizedLayout(locale, tag) {
  const source = fs.readFileSync(path.join(root, locale === 'en' ? 'en/search/index.html' : 'zh-cn/search/index.html'), 'utf8');
  return (source.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`))?.[0] || '').replaceAll(' aria-current="page"', '');
}

function shell(locale, t) {
  const route = `${t.prefix}/events/summer-party/`;
  const crumbs = [{ label: t.home, href: `${t.prefix}/` }, { label: t.events, href: `${t.prefix}/events/` }, { label: t.h1 }];
  const graph = [
    { '@type': 'Article', '@id': absoluteUrl(route), url: absoluteUrl(route), name: t.title, headline: t.h1, description: t.description, dateModified: '2026-08-31', inLanguage: t.lang, mainEntityOfPage: absoluteUrl(route) },
    breadcrumbSchema(crumbs)
  ];
  const alternates = [['ja', '/events/summer-party/'], ['en', '/en/events/summer-party/'], ['zh-Hans', '/zh-cn/events/summer-party/'], ['x-default', '/events/summer-party/']].map(([lang, href]) => `<link rel="alternate" hreflang="${lang}" href="${absoluteUrl(href)}" data-i18n-alternate>`).join('');
  const ogAlternates = ['ja_JP', 'en_US', 'zh_CN'].filter((value) => value !== t.ogLocale).map((value) => `<meta property="og:locale:alternate" content="${value}" data-i18n-alternate>`).join('');
  let head = renderSeoHead({ title: t.title, description: t.description, route, type: 'article' }).replace('ja_JP', t.ogLocale);
  if (locale !== 'ja') head = head.replaceAll('content="モンサバ攻略DB"', `content="${locale === 'en' ? 'Clash of Critters Guide DB' : 'Clash of Critters 攻略数据库'}"`);
  head = head.replace(/(<link rel="canonical"[^>]*?)\s*\/>/, '$1>');
  const header = locale === 'ja' ? renderHeader(route) : localizedLayout(locale, 'header');
  const footer = locale === 'ja' ? renderFooter(`${tatari.families.length}系統 / ${tatari.families.flatMap((family) => family.evolutions).length}体`) : localizedLayout(locale, 'footer');
  const breadcrumb = locale === 'ja' ? renderBreadcrumb(crumbs) : `<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="${t.prefix}/">${esc(t.home)}</a><span aria-hidden="true">›</span><a href="${t.prefix}/events/">${esc(t.events)}</a><span aria-hidden="true">›</span><span>${esc(t.h1)}</span></nav>`;
  const runtime = locale === 'ja' ? '' : `<script src="/i18n/${locale === 'en' ? 'en' : 'zh-cn'}-runtime.js?v=${assetVersion}" defer></script><script src="/i18n-runtime.js?v=${assetVersion}" defer></script>`;
  return `<!doctype html><html lang="${t.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${head}${alternates}${ogAlternates}<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png"><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/assets/aug30-update.css"><script type="application/ld+json">${safeJsonLd({ '@context': 'https://schema.org', '@graph': graph })}</script>${renderGa4Tag()}</head><body data-locale="${locale}" data-page-type="summer-party"><a class="skip-link" href="#main-content">${locale === 'ja' ? '本文へスキップ' : 'Skip to content'}</a>${header}<main id="main-content"><section class="page-hero"><div class="wrap">${breadcrumb}<div class="family-page-head"><div><span class="visible-kicker">${esc(t.checked)}</span><h1>${esc(t.h1)}</h1><p>${esc(t.subtitle)}</p></div></div></div></section>${body(locale, t)}</main>${footer}${runtime}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js" defer></script></body></html>`;
}

for (const [locale, t] of Object.entries(locales)) {
  const route = `${t.prefix}/events/summer-party/`;
  const directory = path.join(root, route.slice(1));
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), shell(locale, t));
}

console.log(`Summer Party pages generated: ${data.album.setCount} sets, ${allCards.length} card slots, ${pendingNames} hidden names, ${data.packs.length} packs, 3 locales.`);
