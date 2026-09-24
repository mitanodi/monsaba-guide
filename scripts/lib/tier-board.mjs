import { MODES, groupRankings } from '../../lib/tata-tier.mjs';
import '../../family-display.js';
const {getFamilyDisplayName,getFamilyDisplayLabel}=globalThis.MONSABA_FAMILY;
export const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export function renderTierBoard({data, families, images, locale, copy, mode, afterDescription = ''}) {
  const prefix=locale==='ja'?'':locale==='en'?'/en':'/zh-cn';
  const index=MODES.indexOf(mode);
  const byId=new Map(families.map(f=>[f.id,f]));
  const imageById=new Map(images.map(f=>[f.familyId,f.stage1]));
  const rows=groupRankings(data,mode).filter(g=>g.tier!=='HOLD'||g.entries.length).map(group=>{
    const cards=group.entries.map(entry=>{
      const f=byId.get(entry.familyId), image=imageById.get(f.id), ranking=entry.rankings[mode];
      const name=getFamilyDisplayName(f,locale);
      const status=ranking.status==='provisional'?copy.provisional:ranking.status==='hold'?copy.pending:'';
      const title=ranking.rawEvaluation?`${status} (${ranking.rawEvaluation})`:status;
      const modes=MODES.slice(1).map((m,i)=>`<span>${esc(copy.labels[i+1])} <b>${entry.rankings[m].tier==='HOLD'?esc(copy.hold):entry.rankings[m].tier}${entry.rankings[m].status==='provisional'?'※':''}</b></span>`).join('');
      return `<a class="tier-chart-tata" href="${prefix}/tata/${encodeURIComponent(entry.slug)}/" data-family-id="${esc(f.id)}" data-attribute="${esc(f.attribute)}" data-status="${ranking.status}"><img loading="lazy" decoding="async" src="${esc(image.src)}"${image.srcset?` srcset="${esc(image.srcset)}" sizes="72px"`:''} width="${image.width}" height="${image.height}" alt="${esc(name)}"><span class="tier-family-name">${esc(getFamilyDisplayLabel(f,locale))}</span><small>${esc(copy.attributes[f.attribute])} · T1–T${f.evolutions.length}</small>${status?`<small class="tier-status" title="${esc(title)}">${esc(status)}</small>`:''}${mode==='overall'?`<span class="tier-card-modes">${modes}</span>`:''}</a>`;
    }).join('');
    return `<div class="tier-chart-row rank-${group.tier.toLowerCase()}" data-tier="${group.tier}"><div class="tier-chart-label"><strong>${group.tier==='HOLD'?esc(copy.hold):group.tier}</strong><span class="tier-row-count">${group.entries.length}</span></div><div class="tier-chart-members">${cards}<p class="tier-empty"${cards?' hidden':''}>${esc(copy.empty)}</p></div></div>`;
  }).join('\n');
  return `<section class="wrap static-section tier-board" id="mode-${mode}" data-mode="${mode}" aria-labelledby="heading-${mode}"><h2 id="heading-${mode}">${esc(copy.headings[index])}</h2><p>${esc(copy.descriptions[index])}</p>${afterDescription}<div class="tier-chart">${rows}</div><a class="tier-back" href="#tier-navigation">↑ ${esc(copy.labels.join(' / '))}</a></section>`;
}
