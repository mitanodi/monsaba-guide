const state={families:[],meta:{},imageByFamily:new Map(),query:'',attribute:'すべて',sort:'default',selectedId:null};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const attrIcon=Object.fromEntries(Object.entries(ATTRIBUTE_META).map(([attr,meta])=>[attr,meta.icon]));
const {getFamilyDisplayName,getFamilyDisplayLabel,getFamilySearchAliases}=MONSABA_FAMILY;
let searchEventTimer;

const stage1Image=id=>state.imageByFamily.get(id)?.stage1;
const formImage=(id,stage)=>state.imageByFamily.get(id)?.forms.find(item=>item.stage===stage&&item.status==='verified');
const pendingImageLabel=document.documentElement.lang==='en'?'Image pending verification':document.documentElement.lang==='zh-CN'?'图片待确认':'画像確認中';

async function boot(){
  const [res,imageRes]=await Promise.all([
    fetch('/data/tatari.json',{cache:'no-store'}),
    fetch('/data/tata-images.json',{cache:'no-store'})
  ]);
  if(!res.ok||!imageRes.ok) throw new Error(`data load ${res.status}/${imageRes.status}`);
  const [data,imageData]=await Promise.all([res.json(),imageRes.json()]); state.families=data.families||[]; state.meta=data.meta||{}; state.imageByFamily=new Map((imageData.families||[]).map(item=>[item.familyId,item]));
  const params=new URLSearchParams(location.search);
  state.query=window.__MONSABA_PRIVATE_SEARCH__?.q||''; state.attribute=params.get('attribute')||'すべて'; state.sort=params.get('sort')||'default';
  if(!['すべて',...new Set(state.families.map(f=>f.attribute))].includes(state.attribute)) state.attribute='すべて';
  if(!['default','name','stages'].includes(state.sort)) state.sort='default';
  state.selectedId=location.hash.startsWith('#family-')?location.hash.slice(8):state.families[0]?.id;
  if(!state.families.some(f=>f.id===state.selectedId)) state.selectedId=state.families[0]?.id;
  $('#search').value=state.query; $('#sort').value=state.sort;
  bind(); renderMeta(); renderFilters(); renderCards(); renderSelect(); renderDetail();
}
function bind(){
  $('#search').addEventListener('input',e=>{state.query=e.target.value;syncQuery();renderCards();clearTimeout(searchEventTimer);searchEventTimer=setTimeout(()=>{const rows=filteredFamilies();window.MONSABA_TRACK?.event('site_search',{query_length:[...state.query.trim()].length,result_count:rows.length,search_surface:'tata_directory'})},600)});
  $('#sort').addEventListener('change',e=>{state.sort=e.target.value;syncQuery();renderCards()});
  $('#clearFilters').addEventListener('click',()=>{state.query='';state.attribute='すべて';state.sort='default';$('#search').value='';$('#sort').value='default';syncQuery();renderFilters();renderCards()});
  $('#familySelect').addEventListener('change',e=>selectFamily(e.target.value,true));
  window.addEventListener('hashchange',()=>{if(location.hash.startsWith('#family-'))selectFamily(location.hash.slice(8),false)});
}
function syncQuery(){
  const p=new URLSearchParams(); if(state.attribute!=='すべて')p.set('attribute',state.attribute); if(state.sort!=='default')p.set('sort',state.sort);
  const q=p.toString(); try{history.replaceState(null,'',`${location.pathname}${q?'?'+q:''}${location.hash}`)}catch(_){};
}
function renderMeta(){
  const m=state.meta,total=Number(m.screenshotTotal||0),done=Number(m.processedScreenshotCount||0),pct=total?done/total*100:0;
  if($('#progressPct')) $('#progressPct').textContent=`${pct.toFixed(0)}%`; if($('#progressBar')) $('#progressBar').style.width=`${pct}%`;
  $('#processedCount').textContent=done.toLocaleString(); $('#familyCount').textContent=(m.familyCount||state.families.length).toLocaleString();
  $('#monsterCount').textContent=(m.monsterCount||state.families.reduce((a,f)=>a+f.evolutions.length,0)).toLocaleString(); $('#totalCount').textContent=total.toLocaleString();
  $('#processedRange').textContent=`確認範囲：${m.processedRange||'—'}`;
}
function renderFilters(){
  const attrs=['すべて',...new Set(state.families.map(f=>f.attribute).filter(Boolean))];
  $('#attributeFilters').innerHTML=attrs.map(a=>`<button type="button" class="filter ${state.attribute===a?'is-active':''}" data-attribute="${esc(a)}">${a==='すべて'?'すべて':`${attrIcon[a]||''} ${esc(a)}属性`}</button>`).join('');
  $('#attributeFilters').querySelectorAll('.filter').forEach(b=>b.addEventListener('click',()=>{state.attribute=b.dataset.attribute;syncQuery();renderFilters();renderCards()}));
}
function searchableText(f){return [...getFamilySearchAliases(f),f.attribute,...f.skills.flatMap(s=>[s.name,s.summary,...s.stats.flat()])].join(' ').toLowerCase()}
function filteredFamilies(){
  const q=state.query.trim().toLowerCase(); let rows=state.families.filter(f=>(state.attribute==='すべて'||f.attribute===state.attribute)&&(!q||searchableText(f).includes(q)));
  if(state.sort==='name') rows=[...rows].sort((a,b)=>getFamilyDisplayName(a).localeCompare(getFamilyDisplayName(b),'ja'));
  if(state.sort==='stages') rows=[...rows].sort((a,b)=>b.evolutions.length-a.evolutions.length||getFamilyDisplayName(a).localeCompare(getFamilyDisplayName(b),'ja'));
  return rows;
}
function renderCards(){
  const rows=filteredFamilies(); $('#resultCount').textContent=`${rows.length}系統 / ${rows.reduce((a,f)=>a+f.evolutions.length,0)}体`;
  $('#cards').innerHTML=rows.length?rows.map(f=>{const image=stage1Image(f.id);return `<article class="card" tabindex="0" role="button" data-family="${esc(f.id)}" aria-label="${esc(getFamilyDisplayLabel(f))}を比較表示">
    <div class="card-image"><img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(f.evolutions[0].name)}" /></div>
    <div class="card-body"><div class="card-top"><span class="attribute">${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span><span class="source-state">${f.evolutions.length}段階</span></div>
    <h3>${esc(getFamilyDisplayLabel(f))}</h3><div class="chain">${f.evolutions.map(e=>esc(e.name)).join(' → ')}</div><div class="card-bottom"><span class="skill-chip">${esc(f.skills.at(-1)?.name||f.skills[0]?.name||'スキル')}</span><a class="detail-link" href="/tata/${encodeURIComponent(f.id)}/" aria-label="${esc(getFamilyDisplayLabel(f))}の個別ページを見る">詳細を見る</a></div></div></article>`}).join(''):'<div class="empty">条件に合うタタがありません。検索語や属性を変えてください。</div>';
  $('#cards').querySelectorAll('.card').forEach(card=>{const go=e=>{if(e?.target?.closest('.detail-link'))return;selectFamily(card.dataset.family,true);$('#compare').scrollIntoView({behavior:'smooth',block:'start'})};card.addEventListener('click',go);card.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&!e.target.closest('.detail-link')){e.preventDefault();go(e)}})});
}
function renderSelect(){
  $('#familySelect').innerHTML=state.families.map(f=>`<option value="${esc(f.id)}">${attrIcon[f.attribute]||''} ${esc(getFamilyDisplayLabel(f))}</option>`).join('');
  if(state.selectedId) $('#familySelect').value=state.selectedId;
}
function selectFamily(id,pushHash){if(!state.families.some(f=>f.id===id))return;state.selectedId=id;$('#familySelect').value=id;renderDetail();if(pushHash){try{history.replaceState(null,'',`${location.pathname}${location.search}#family-${id}`)}catch(_){}}}
function renderDetail(){
  const f=state.families.find(x=>x.id===state.selectedId)||state.families[0]; if(!f)return;
  const evo=f.evolutions.map((e,i)=>{const image=formImage(f.id,e.stage);const visual=image?`<img loading="lazy" decoding="async" src="${esc(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(e.name)}">`:`<div class="tata-image-pending" role="img" aria-label="${esc(e.name)}"><span>${pendingImageLabel}</span></div>`;return `${i?'<span class="evo-arrow" aria-hidden="true">→</span>':''}<div class="evo-card">${visual}<div><small>進化 ${e.stage}</small><strong>${esc(e.name)}</strong></div></div>`}).join('');
  const skills=f.skills.map(s=>`<section class="skill-block"><div class="skill-head"><div><small>スキル ${s.stage}</small><h4>${esc(s.name)}</h4></div><p class="skill-summary">${esc(s.summary)}</p></div><div class="stats-grid">${s.stats.map(([k,v])=>`<div class="stat-cell"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div><details class="source-details"><summary>参照スクショ</summary><div class="sources">${s.sources.map(esc).join(' / ')}</div></details></section>`).join('');
  $('#detailPanel').innerHTML=`<div class="detail-title-row"><div><span class="attribute">${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span><h3>${esc(getFamilyDisplayLabel(f))}</h3></div><div class="detail-actions"><span class="detail-source-note">${f.evolutions.length}段階 / ${f.skills.length}スキル</span><a class="ghost-button compact-button" href="/tata/${encodeURIComponent(f.id)}/">個別ページ</a></div></div><div class="evolution-row">${evo}</div><div class="skills">${skills}</div>`;
}
boot().catch(err=>{console.error(err);$('#cards').innerHTML='<div class="empty">データの読み込みに失敗しました。ページを再読み込みしてください。</div>'});
