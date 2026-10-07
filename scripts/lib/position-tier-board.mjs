import { esc } from './tier-board.mjs';
import '../../family-display.js';
const { getFamilyDisplayLabel } = globalThis.MONSABA_FAMILY;

export function renderPositionBoards({ data, legacy, families, images, locale, copy }) {
  const labels = {
    ja: { roles: ['前衛', '中衛', '後衛'], title: 'ゾンビラッシュ・役割別Tier', all: '3役割すべて', pending: '名称の対応を確認中', unrated: '未評価', note: '提供画像の評価を前衛・中衛・後衛ごとに掲載しています。同じタタでも役割によって評価が異なります。画像にないタタには評価を追加していません。', credit: '今後のTier制作：', attribution: '現在掲載中の役割別評価はユーザー提供画像の内容です。既存評価すべての制作・監修を示すものではありません。', archive: '以前の統合ゾンビ評価を確認', source: '元画像の表記：' },
    en: { roles: ['Front', 'Middle', 'Rear'], title: 'Zombie Rush Tier by position', all: 'All three positions', pending: 'Name correspondence pending', unrated: 'Unrated', note: 'Ratings from the supplied image are listed independently by position. A Tatari can have different ratings in different positions. Unlisted Tatari have not been assigned a rating.', credit: 'Future Tier creation: ', attribution: 'The current position ratings come from a user-supplied image. This credit does not attribute all existing ratings or supervision.', archive: 'View the previous combined Zombie rating', source: 'Image label: ' },
    'zh-CN': { roles: ['前卫', '中卫', '后卫'], title: '僵尸突袭·位置强度榜', all: '全部三个位置', pending: '名称对应待确认', unrated: '未评价', note: '按前卫、中卫、后卫分别展示提供图片中的评价。同一塔塔在不同位置的评价可以不同。未出现在图片中的塔塔未被追加评价。', credit: '今后的强度榜制作：', attribution: '当前的位置评价来自用户提供的图片。此署名不表示所有现有评价均由其制作或监修。', archive: '查看以前的综合僵尸评价', source: '原图名称：' }
  }[locale];
  const positions = ['front', 'middle', 'rear'];
  const prefix = locale === 'ja' ? '' : locale === 'en' ? '/en' : '/zh-cn';
  const byId = new Map(families.map(f => [f.id, f]));
  const imageById = new Map(images.map(f => [f.familyId, f.stage1]));
  const boards = positions.map((position, index) => {
    const rows = ['SS', 'S', 'A', 'B', 'C', 'HOLD'].map(tier => {
      const entries = data.entries.filter(e => e.position === position && e.tier === tier).sort((a, b) => a.order - b.order);
      if (!entries.length) return '';
      const cards = entries.map(entry => {
        const f = byId.get(entry.familyId);
        if (!f) return `<div class="tier-chart-tata tier-name-pending" data-tier-entry data-source-name="${esc(entry.sourceName)}" data-attribute="pending" data-status="name-pending"><span class="tier-family-name localized-original-name" translate="no" lang="ja">${esc(entry.sourceName)}</span><small>${esc(labels.pending)}</small></div>`;
        const image = imageById.get(f.id), name = getFamilyDisplayLabel(f, locale);
        return `<a class="tier-chart-tata" data-tier-entry data-family-id="${esc(f.id)}" data-source-key="${entry.order}" data-attribute="${esc(f.attribute)}" data-status="${entry.status}" href="${prefix}/tata/${encodeURIComponent(f.id)}/"><img src="${esc(image.src)}" width="${image.width}" height="${image.height}" loading="lazy" decoding="async" alt="${esc(name)}"><span class="tier-family-name">${esc(name)}</span><small>${esc(copy.attributes[f.attribute])}</small><small class="localized-original-name" translate="no" lang="ja" data-tier-source-name>${esc(labels.source + entry.sourceName)}</small></a>`;
      }).join('');
      return `<div class="tier-chart-row rank-${tier.toLowerCase()}" data-tier="${tier}"><div class="tier-chart-label"><strong>${tier === 'HOLD' ? labels.unrated : tier}</strong><span class="tier-row-count">${entries.length}</span></div><div class="tier-chart-members">${cards}<p class="tier-empty" hidden>${esc(copy.empty)}</p></div></div>`;
    }).join('');
    return `<section class="tier-role-board" id="zombie-${position}" data-tier-position="${position}" aria-labelledby="heading-zombie-${position}"><h3 id="heading-zombie-${position}">${labels.roles[index]} Tier</h3><div class="tier-chart">${rows}</div></section>`;
  }).join('');
  // Earlier combined grades are a closed reference, never an average of roles.
  const archive = legacy.replace('class="wrap static-section tier-board" id="mode-zombie"', 'class="tier-legacy-board" id="legacy-zombie"').replaceAll('heading-zombie', 'heading-legacy-zombie');
  return `<section class="wrap static-section tier-board" id="mode-zombie" data-mode="zombie" aria-labelledby="heading-zombie"><h2 id="heading-zombie">${labels.title}</h2><p>${labels.note}</p><p class="tier-contributor">${labels.credit}<a href="${esc(data.futureContributor.url)}" target="_blank" rel="noopener noreferrer" translate="no" lang="ja">${esc(data.futureContributor.name)}</a></p><p class="tier-source-note">${labels.attribution}</p><nav class="tier-position-nav" aria-label="${labels.title}">${[['all', labels.all], ...positions.map((position, i) => [position, labels.roles[i]])].map(([position, name], i) => `<a href="${position === 'all' ? '#mode-zombie' : '#zombie-' + position}" data-tier-role="${position}" aria-current="${i === 0}">${name}</a>`).join('')}</nav>${boards}<details class="tier-legacy-reference"><summary>${labels.archive}</summary>${archive}</details></section>`;
}
