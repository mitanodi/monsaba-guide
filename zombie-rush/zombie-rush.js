const tierGroups=[
  {rank:'SSS',label:'ゾンビラッシュ最優先',ids:['umimi','shizukuchou','fureimuji','takepanda','himawarin','yanzaru','denjika','purabi','birimori']},
  {rank:'SS',label:'主力級',ids:['korokon','hinyao','marushu','biripiyo']},
  {rank:'S',label:'優秀',ids:['boruzarashi','erekoon']},
  {rank:'A',label:'編成次第で強い',ids:['kunbuu','komakiri','gaoden','riifuro']}
];
const comments={
  purabi:'回復・味方強化・無敵をまとめて担える。高Waveの安定性を大きく上げるサポート枠。',
  denjika:'貫通攻撃＋麻痺が大量処理と足止めの両方で強力。スノーフィスト対策にも使いやすい。',
  yanzaru:'第3進化以降の火力が高く、ゾンビラッシュの主力ディーラー候補。',
  takepanda:'味方への攻撃・攻撃速度バフや防御補助が優秀。低進化段階から仕事ができる。',
  umimi:'高キル編成で採用率が高い中核候補。',
  gaoden:'ノックバックなどの役割を持てるが、現状の高キル編成ではSSS勢より優先度は下。'
};
const adoption={
  umimi:'100%',shizukuchou:'100%',fureimuji:'100%',takepanda:'100%',himawarin:'100%',yanzaru:'100%',denjika:'100%',purabi:'100%',birimori:'100%',
  korokon:'75%',hinyao:'75%',marushu:'75%',biripiyo:'75%',
  boruzarashi:'62.5%',erekoon:'62.5%',
  kunbuu:'37.5%',komakiri:'25%',gaoden:'25%',riifuro:'25%'
};
const annotations={
  kunbuu:'公開攻略ではワンブー種表記',
  korokon:'旧：タマキツネ系'
};
const attrIcon={草:'🌿',水:'💧',火:'🔥',雷:'⚡',土:'🪨'};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;

async function bootZombieRush(){
  const res=await fetch('/data/tatari.json',{cache:'no-store'});
  if(!res.ok) throw new Error(`data load ${res.status}`);
  const data=await res.json();
  const families=data.families||[];
  const byId=new Map(families.map(f=>[f.id,f]));
  const ranked=new Set(tierGroups.flatMap(g=>g.ids));
  $('#tierRoot').innerHTML=tierGroups.map(group=>renderTier(group,byId)).join('');
  const unrated=families.filter(f=>!ranked.has(f.id)).sort((a,b)=>a.familyName.localeCompare(b.familyName,'ja'));
  $('#unratedList').innerHTML=unrated.map(f=>`<a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a>`).join('');
}

function renderTier(group,byId){
  const cards=group.ids.map(id=>{
    const f=byId.get(id);
    return f?renderCard(f,group.rank):`<div class="empty">未登録: ${esc(id)}</div>`;
  }).join('');
  return `<section class="tier-section rank-${group.rank.toLowerCase()}">
    <div class="tier-head"><span>${esc(group.rank)}</span><h3>${esc(group.label)}</h3></div>
    <div class="tier-cards">${cards}</div>
  </section>`;
}

function renderCard(f,rank){
  const first=f.evolutions[0];
  const chain=f.evolutions.map(e=>esc(e.name)).join(' → ');
  return `<a class="tier-card" href="/tata/${encodeURIComponent(f.id)}/">
    <div class="tier-image"><img loading="lazy" src="${esc(thumb(first.image))}" alt="${esc(first.name)}"></div>
    <div class="tier-body">
      <div class="tier-meta"><span class="tier-badge">${esc(rank)}</span><span>${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span></div>
      <h4>${esc(f.familyName)}系</h4>
      ${annotations[f.id]?`<p class="tier-annotation">${esc(annotations[f.id])}</p>`:''}
      ${adoption[f.id]?`<p class="adoption-rate">1000キル以上編成 採用率 ${esc(adoption[f.id])}</p>`:''}
      <p class="tier-chain">${chain}</p>
      ${comments[f.id]?`<p class="tier-comment">${esc(comments[f.id])}</p>`:''}
    </div>
  </a>`;
}

bootZombieRush().catch(err=>{
  console.error(err);
  $('#tierRoot').innerHTML='<div class="empty">data/tatari.json の読み込みに失敗しました。</div>';
});
