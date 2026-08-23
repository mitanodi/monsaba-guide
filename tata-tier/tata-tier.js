const overallTierGroups=[
  {rank:'SSS',label:'最優先クラス',ids:['purabi','himawarin','fureimuji','yanzaru']},
  {rank:'SS',label:'非常に優秀',ids:['nekoori','denjika','birimori','biripiyo','marushu','tafupen','boruzarashi','potakage','fureebi']},
  {rank:'S',label:'強力・用途次第で上位級',ids:['takepanda','umimi','shizukuchou','hinyao','komakiri','matchiba','fukurogumo','gaoden','riifuro','denrou','shiiparusu','himori','furuggu']}
];

const assessments={
  purabi:{normal:'SS',zombie:'SSS',dojo:'SS',beginner:'SS',roles:['回復','バフ','生存補助'],comment:'回復・攻防バフ・ピンチ時無敵・高速回復を持つ。ゾンビラッシュを中心に安定性を大きく上げる。'},
  himawarin:{normal:'SS',zombie:'SSS',dojo:'SSS',beginner:'SS',roles:['回復','攻防バフ'],comment:'回復と攻防バフを同時に担当。編成全体を支えるサポートとして汎用性が高い。'},
  fureimuji:{normal:'SS',zombie:'SSS',dojo:'SS',beginner:'SS',roles:['範囲火力','回復','攻撃バフ'],comment:'範囲攻撃と回復、攻撃力強化をまとめて担当。複数コンテンツで採用しやすい。'},
  yanzaru:{normal:'SS',zombie:'SSS',dojo:'SS',beginner:'SS',roles:['火力','分身','前線補助'],comment:'進化で分身数が増える火力枠。第3進化以降の戦力上昇が大きい。'},
  nekoori:{normal:'SSS',zombie:'A',dojo:'SSS',beginner:'SSS',roles:['遠距離火力','減速','貫通'],comment:'低コストで第3進化を狙いやすい。減速・広範囲攻撃・貫通で序盤から使いやすい。'},
  denjika:{normal:'SS',zombie:'SSS',dojo:'SS',beginner:'S',roles:['貫通','麻痺','CC'],comment:'貫通攻撃＋麻痺による足止めが強力。ゾンビラッシュでは特に高評価。'},
  birimori:{normal:'SS',zombie:'SSS',dojo:'SS',beginner:'S',roles:['被ダメ増加','範囲支援'],comment:'敵への被ダメージ増加で味方の火力を伸ばせる。範囲支援役としてゾンビラッシュでも扱いやすい。'},
  biripiyo:{normal:'SS',zombie:'SS',dojo:'SS',beginner:'S',roles:['攻撃バフ','被ダメ軽減','サポート'],comment:'味方への攻撃力増加と被ダメージ軽減を同時に付与。サポート性能が非常に高い。'},
  marushu:{normal:'SS',zombie:'SS',dojo:'SS',beginner:'S',roles:['攻撃速度バフ','被ダメ増加','防御補助'],comment:'攻撃速度強化、被ダメージ増加、被ダメージ軽減を持つ。編成全体への貢献度が高い。'},
  tafupen:{normal:'SS',zombie:'SS',dojo:'SS',beginner:'S',roles:['タンク','シールド','前衛'],comment:'シールドを使って前線を維持するタンク。ゾンビラッシュでもLv5・Lv7の役割が大きい。'},
  boruzarashi:{normal:'SS',zombie:'S',dojo:'SS',beginner:'S',roles:['広範囲火力','妨害'],comment:'進化後はボール数が増え、広い範囲へ火力を出しやすい。通常ステージでも使いやすい。'},
  potakage:{normal:'SS',zombie:'A',dojo:'SSS',beginner:'S',roles:['ステルス','火力','生存'],comment:'ステルスによる生存力が特徴。特にバッジ道場で強力。'},
  fureebi:{normal:'SS',zombie:'S',dojo:'SSS',beginner:'S',roles:['近距離火力','燃焼'],comment:'進化で攻撃回数が増え、単体への火力を伸ばしやすい。道場でも高評価。'},
  takepanda:{normal:'S',zombie:'SSS',dojo:'S',beginner:'S',roles:['継続ダメージ','減速'],comment:'タケノコによる継続ダメージと減速。ゾンビラッシュの敵集団を抑えるのに優秀。'},
  umimi:{normal:'S',zombie:'SSS',dojo:'S',beginner:'S',roles:['減速','被ダメ増加','範囲支援'],comment:'継続範囲ダメージ、減速、被ダメージ増加を担当。敵集団への支援性能が高い。'},
  shizukuchou:{normal:'S',zombie:'SSS',dojo:'SSS',beginner:'S',roles:['睡眠','減速','CC'],comment:'減速と睡眠によるCCが特徴。ゾンビラッシュ・道場などで刺さる。'},
  hinyao:{normal:'S',zombie:'SS',dojo:'S',beginner:'S',roles:['範囲火力','ニャンコシナジー'],comment:'範囲攻撃で複数レーンに火力を出しやすい。ニャンコ系との組み合わせも狙える。'},
  komakiri:{normal:'S',zombie:'A',dojo:'SSS',beginner:'S',roles:['前衛','連撃','被ダメ増加'],comment:'連撃と被ダメージ増加を持つ前衛。道場で前線役として使いやすい。'},
  matchiba:{normal:'SS',zombie:'A',dojo:'S',beginner:'S',roles:['広範囲火力','デバフ'],comment:'火属性の広範囲火力として扱いやすい。敵へのデバフも絡めて通常攻略で採用しやすい。'},
  fukurogumo:{normal:'S',zombie:'A',dojo:'S',beginner:'S',roles:['シールド','スタン','前衛'],comment:'シールドとスタンで前線を支えられる。耐久寄りの編成で役割を持ちやすい。'},
  gaoden:{normal:'S',zombie:'A',dojo:'S',beginner:'S',roles:['ノックバック','被ダメ増加'],comment:'ノックバックと被ダメージ増加で敵の処理を補助する。押し返しが欲しい場面で候補になる。'},
  riifuro:{normal:'S',zombie:'A',dojo:'S',beginner:'S',roles:['減速','攻撃速度低下','スタン'],comment:'減速、攻撃速度低下、スタンで敵の動きを抑える。妨害役を厚くしたい編成で使いやすい。'},
  denrou:{normal:'S',zombie:'S',dojo:'S',beginner:'S',roles:['麻痺','無敵','近距離火力'],comment:'麻痺と無敵を持つ近距離火力。前線で止めながら殴る役として使える。'},
  shiiparusu:{normal:'S',zombie:'S',dojo:'S',beginner:'S',roles:['範囲持続火力','麻痺'],comment:'範囲への持続火力と麻痺を持つ。敵集団を削りながら足止めできる。'},
  himori:{normal:'S',zombie:'A',dojo:'S',beginner:'SSS',roles:['燃焼','序盤火力'],comment:'第3進化を早く狙える序盤向け火力。燃焼を中心にダメージを出す。'},
  furuggu:{normal:'S',zombie:'A',dojo:'S',beginner:'SSS',roles:['範囲火力','減速','序盤育成'],comment:'第3進化を早く狙える序盤向け。進化すると爆発頻度が上がり、減速も獲得する。'}
};

const modeLabels={overall:'総合',beginner:'初心者',normal:'通常',zombie:'ゾンビラッシュ',dojo:'道場'};
const attrFilters=['すべて','草','水','火','雷','土'];
const attrIcon={草:'🌿',水:'💧',火:'🔥',雷:'⚡',土:'🪨'};
const rankOrder={SSS:0,SS:1,S:2,A:3,'－':4};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;

let allFamilies=[];
let rankedItems=[];
let holdFamilies=[];
let activeMode='overall';
let activeAttr='すべて';

async function bootTataTier(){
  renderFilters();
  const res=await fetch('/data/tatari.json',{cache:'no-store'});
  if(!res.ok) throw new Error(`data load ${res.status}`);
  const data=await res.json();
  allFamilies=data.families||[];
  const byId=new Map(allFamilies.map(f=>[f.id,f]));
  const seen=new Set();
  rankedItems=overallTierGroups.flatMap((group,groupIndex)=>
    group.ids.map((id,order)=>{
      const family=byId.get(id);
      if(!family) return {missing:true,id,group,groupIndex,order};
      if(seen.has(id)) return {duplicate:true,id,group,groupIndex,order,family};
      seen.add(id);
      return {id,family,group,groupIndex,order,assessment:assessments[id]};
    })
  );
  holdFamilies=allFamilies.filter(f=>!seen.has(f.id)).sort((a,b)=>a.familyName.localeCompare(b.familyName,'ja'));
  render();
  window.__tataTierState={families:allFamilies,rankedItems,holdFamilies,overallTierGroups,assessments};
}

function renderFilters(){
  $('#modeFilters').innerHTML=Object.entries(modeLabels).map(([mode,label])=>buttonHtml('mode',mode,label,mode===activeMode)).join('');
  $('#attributeTierFilters').innerHTML=attrFilters.map(attr=>buttonHtml('attr',attr,`${attrIcon[attr]||''}${attr}`,attr===activeAttr)).join('');
  document.querySelectorAll('[data-mode]').forEach(btn=>btn.addEventListener('click',()=>{activeMode=btn.dataset.mode;renderFilters();render();}));
  document.querySelectorAll('[data-attr]').forEach(btn=>btn.addEventListener('click',()=>{activeAttr=btn.dataset.attr;renderFilters();render();}));
}

function buttonHtml(type,value,label,active){
  return `<button class="filter ${active?'is-active':''}" type="button" data-${type}="${esc(value)}">${esc(label)}</button>`;
}

function render(){
  const attrMatches=item=>activeAttr==='すべて'||item.family?.attribute===activeAttr;
  const visibleRanked=rankedItems.filter(item=>!item.missing&&!item.duplicate&&attrMatches(item));
  const visibleHold=holdFamilies.filter(f=>activeAttr==='すべて'||f.attribute===activeAttr);
  $('#tierCount').textContent=`Tier ${visibleRanked.length}系統 / 評価保留 ${visibleHold.length}系統`;

  if(activeMode==='overall'){
    $('#overallTierRoot').innerHTML=overallTierGroups.map(group=>{
      const cards=visibleRanked.filter(item=>item.group.rank===group.rank).map(renderCard).join('');
      return `<section class="tier-section rank-${group.rank.toLowerCase()} overall-section" data-tier="${esc(group.rank)}">
        <div class="tier-head"><span>${esc(group.rank)}</span><h3>${esc(group.label)}</h3></div>
        <div class="overall-cards">${cards||'<div class="empty">該当するタタがありません。</div>'}</div>
      </section>`;
    }).join('');
  }else{
    const sorted=[...visibleRanked].sort((a,b)=>{
      const ra=rankOrder[a.assessment?.[activeMode]||'－']??9;
      const rb=rankOrder[b.assessment?.[activeMode]||'－']??9;
      return ra-rb||a.groupIndex-b.groupIndex||a.order-b.order;
    });
    $('#overallTierRoot').innerHTML=`<section class="tier-section overall-section">
      <div class="tier-head"><span>${esc(modeLabels[activeMode])}</span><h3>${esc(modeLabels[activeMode])} 評価順</h3></div>
      <div class="overall-cards">${sorted.map(renderCard).join('')||'<div class="empty">該当するタタがありません。</div>'}</div>
    </section>`;
  }
  $('#holdList').innerHTML=visibleHold.map(f=>`<a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a>`).join('')||'<span class="empty-inline">該当するタタがありません。</span>';
}

function renderCard(item){
  if(item.missing) return `<div class="empty">未登録: ${esc(item.id)}</div>`;
  const {family:f,group,assessment:a}=item;
  const first=f.evolutions[0]||{};
  const chain=f.evolutions.map(e=>esc(e.name)).join(' → ');
  return `<article class="overall-card" data-id="${esc(f.id)}" data-attribute="${esc(f.attribute)}" data-overall="${esc(group.rank)}">
    <a class="overall-image" href="/tata/${encodeURIComponent(f.id)}/"><img loading="lazy" src="${esc(thumb(first.image))}" alt="${esc(first.name||f.familyName)}"></a>
    <div class="overall-body">
      <div class="overall-top">
        <span class="tier-badge rank-${esc(group.rank.toLowerCase())}">${esc(group.rank)}</span>
        <span class="attribute">${attrIcon[f.attribute]||''} ${esc(f.attribute)}属性</span>
      </div>
      <h3><a href="/tata/${encodeURIComponent(f.id)}/">${esc(f.familyName)}系</a></h3>
      <p class="tier-chain">${chain}</p>
      <div class="mode-ranks" aria-label="モード別評価">
        ${modeRank('通常',a.normal)}${modeRank('ゾンビ',a.zombie)}${modeRank('道場',a.dojo)}${modeRank('初心者',a.beginner)}
      </div>
      <div class="role-tags">${a.roles.map(role=>`<span>${esc(role)}</span>`).join('')}</div>
      <p class="overall-comment">${esc(a.comment)}</p>
      <a class="detail-link" href="/tata/${encodeURIComponent(f.id)}/">詳しく見る</a>
    </div>
  </article>`;
}

function modeRank(label,rank){
  return `<span><b>${esc(label)}</b><em class="rank-chip rank-${esc(String(rank).toLowerCase())}">${esc(rank||'－')}</em></span>`;
}

bootTataTier().catch(err=>{
  console.error(err);
  $('#overallTierRoot').innerHTML='<div class="empty">data/tatari.json の読み込みに失敗しました。</div>';
});
