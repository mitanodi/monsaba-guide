const ATTRIBUTE_GUIDES={
  grass:{
    key:'grass',attr:'草',icon:'🌿',path:'grass',count:13,bodyCount:46,
    title:'草属性おすすめ・育成優先度',
    lead:'モンサバ 草属性の13系統を収録。回復・妨害・前衛役を中心に、育成目安をまとめています。',
    summary:'草属性はヒマワリン系を軸に、コパンダ系・マルッシュ系・コマキリ系など役割の違う候補を組み合わせる属性です。現時点の当サイト評価に基づく育成目安で、絶対的な順位ではありません。',
    recommendations:[
      {title:'総合的に優先',type:'ordered',ids:['himawarin','marushu','takepanda','komakiri','furuggu']},
      {title:'ゾンビラッシュ',type:'ordered',ids:['himawarin','takepanda','marushu']},
      {title:'通常攻略',type:'ordered',ids:['marushu','himawarin','takepanda','komakiri']},
      {title:'初心者向け',type:'ordered',ids:['furuggu','himawarin','takepanda']},
      {title:'道場',type:'ordered',ids:['himawarin','komakiri','marushu']}
    ],
    priorityIds:['himawarin','marushu','takepanda','komakiri'],
    faq:{title:'フクロクモ系は育てる価値ある？',id:'fukurogumo',body:'シールドとスタンを持つ前衛寄りの候補です。総合TierではSなので、耐久や足止めを増やしたい時は選択肢になりますが、回復役のヒマワリン系や支援力の高いマルッシュ系を先に育てる判断も自然です。'},
    compare:{a:'himawarin',b:'takepanda',title:'ヒマワリン vs タケパンダ',aLabel:'回復・攻防バフ',bLabel:'継続ダメージ・減速',conclusion:'編成全体の安定性不足ならヒマワリン。敵集団の足止めやゾンビラッシュ寄りの抑え役が欲しいならタケパンダ。'},
    evoPoints:[
      {id:'himawarin',text:'進化後も回復と攻防バフを担当し、道場・ゾンビラッシュでも使いやすい。'},
      {id:'takepanda',text:'進化でタケノコの成長段階が増え、継続ダメージと減速の圧が上がる。'},
      {id:'komakiri',text:'進化で前衛性能と被ダメージ増加役としての価値が上がる。'},
      {id:'furuggu',text:'第3進化を早く狙いやすく、爆発頻度上昇と減速で序盤攻略に向く。'}
    ],
    roleNotes:{takepanda:'継続ダメージ / 減速',marushu:'攻撃速度バフ / 被ダメージ増加 / 防御補助',fukurogumo:'シールド / スタン / 前衛',himawarin:'回復 / 攻防バフ',furuggu:'範囲火力 / 減速 / 序盤育成',komakiri:'前衛 / 連撃 / 被ダメージ増加',riifuro:'減速 / 攻撃速度低下 / スタン',tsubaruka:'近距離火力',yotsubird:'回復 / 支援',hanarenaishi:'束縛 / 妨害',greenbee:'火力支援',yaminome:'妨害',sabooru:'前衛 / 火力'}
  },
  water:{
    key:'water',attr:'水',icon:'💧',path:'water',count:12,bodyCount:42,
    title:'水属性おすすめ・育成優先度',
    lead:'モンサバ 水属性の12系統を収録。火力・耐久・サポート性能を比較して育成候補を整理しています。',
    summary:'水属性はネコオリ系の序盤性能、トコペン系の前衛、ウミミ系・シズクジ系のゾンビラッシュ適性が分かりやすい属性です。用途ごとの不足役割を見て選びます。',
    recommendations:[
      {title:'総合的に優先',type:'ordered',ids:['nekoori','tafupen','boruzarashi','potakage','umimi','shizukuchou']},
      {title:'ゾンビラッシュ',type:'ordered',ids:['umimi','shizukuchou','tafupen','boruzarashi']},
      {title:'通常攻略',type:'ordered',ids:['nekoori','tafupen','boruzarashi','potakage']},
      {title:'初心者向け',type:'ordered',ids:['nekoori','tafupen','boruzarashi']},
      {title:'道場',type:'ordered',ids:['nekoori','potakage','shizukuchou','tafupen']}
    ],
    priorityIds:['nekoori','tafupen','boruzarashi','umimi'],
    faq:{title:'シズクジ系は第3進化まで行くべき？',id:'shizukuchou',body:'睡眠と減速によるCCが強く、ゾンビラッシュ・道場の評価が高い候補です。火力役を先に確保した後、足止めを厚くしたいなら優先度が上がります。'},
    compare:{a:'nekoori',b:'tafupen',title:'ネコオリ vs タフペン',aLabel:'遠距離火力・減速・貫通',bLabel:'タンク・シールド・前衛',conclusion:'序盤を早く進めたいならネコオリ。前衛が落ちやすい、耐久を補いたいならタフペン。'},
    evoPoints:[
      {id:'nekoori',text:'低コストで第3進化を狙いやすく、減速・広範囲攻撃・貫通で序盤から扱いやすい。'},
      {id:'tafupen',text:'進化後はシールドを使う前衛として役割が大きくなる。'},
      {id:'umimi',text:'継続範囲ダメージ、減速、被ダメージ増加で敵集団への支援性能が伸びる。'},
      {id:'shizukuchou',text:'睡眠と減速によるCCが特徴で、高難度で刺さる場面がある。'}
    ],
    roleNotes:{potakage:'ステルス / 火力 / 生存',nekoori:'遠距離火力 / 減速 / 貫通',umimi:'減速 / 被ダメージ増加 / 範囲支援',boruzarashi:'広範囲火力 / 妨害',tafupen:'タンク / シールド / 前衛',shizukuchou:'睡眠 / 減速 / CC',togegyo:'範囲火力',daishell:'範囲攻撃',capibarrie:'回復',sukedako:'近距離火力',nemukurage:'回復 / 睡眠',kenkani:'前衛 / 火力'}
  },
  fire:{
    key:'fire',attr:'火',icon:'🔥',path:'fire',count:13,bodyCount:47,
    title:'火属性おすすめ・育成優先度',
    lead:'モンサバ 火属性の13系統を収録。火力・サポート性能を比較して育成候補を整理しています。',
    summary:'火属性はヒノムシ系の汎用性が高く、ヒエビ系・ヒバイヌ系・ヒモリ系など火力候補も多い属性です。ゾンビラッシュだけでなく通常攻略・道場で評価が変わります。',
    recommendations:[
      {title:'総合的に優先',type:'ordered',ids:['fureimuji','fureebi','matchiba','hinyao','himori']},
      {title:'ゾンビラッシュ',type:'ordered',ids:['fureimuji','hinyao','korokon','fureebi','himori']},
      {title:'通常攻略',type:'ordered',ids:['fureimuji','fureebi','matchiba','hinyao']},
      {title:'初心者向け',type:'ordered',ids:['himori','fureimuji','matchiba']},
      {title:'道場',type:'ordered',ids:['fureebi','fureimuji','matchiba']}
    ],
    priorityIds:['fureimuji','fureebi','matchiba','himori'],
    faq:{title:'クンブー系は育てる価値ある？',id:'kunbuu',body:'ゾンビラッシュTierではAの候補で、公開攻略ではワンブー種表記の系統です。火属性の上位候補を先に育てつつ、手持ちや役割が合うなら検討する位置づけです。'},
    compare:{a:'fureimuji',b:'fureebi',title:'フレイムシ vs フレービ',aLabel:'範囲火力・回復・攻撃バフ',bLabel:'近距離火力・燃焼',conclusion:'複数コンテンツで使い回したいならフレイムシ。道場寄りの近距離火力を伸ばしたいならフレービ。'},
    evoPoints:[
      {id:'fureimuji',text:'範囲攻撃、回復、攻撃力強化をまとめて担当し、複数コンテンツで採用しやすい。'},
      {id:'fureebi',text:'進化で攻撃回数が増え、単体への火力を伸ばしやすい。'},
      {id:'matchiba',text:'広範囲火力とデバフで通常攻略に向く。'},
      {id:'himori',text:'第3進化を早く狙える序盤向け火力で、燃焼を中心にダメージを出す。'}
    ],
    roleNotes:{hinyao:'範囲火力 / ニャンコシナジー',himori:'燃焼 / 序盤火力',fureimuji:'範囲火力 / 回復 / 攻撃バフ',matchiba:'広範囲火力 / デバフ',fureebi:'近距離火力 / 燃焼',kunbuu:'ゾンビラッシュ候補',korokon:'ゾンビラッシュ主力級',kaenjack:'連射火力',batarisu:'設置火力',fugumaru:'範囲火力',pupunku:'範囲火力',atatama:'範囲火力',haamitora:'近距離火力'}
  },
  thunder:{
    key:'thunder',attr:'雷',icon:'⚡',path:'thunder',count:13,bodyCount:47,
    title:'雷属性おすすめ・育成優先度',
    lead:'モンサバ 雷属性の13系統 / 47体を収録。おすすめタタと育成目安をまとめています。',
    summary:'雷属性はプラビ系・ビリジカ系・ビリモ系・ビリピヨ系の役割がはっきりしています。回復、麻痺、被ダメージ増加、バフのどれが足りないかで育成先を選びます。',
    recommendations:[
      {title:'総合的に優先',type:'ordered',ids:['purabi','denjika','birimori','biripiyo']},
      {title:'ゾンビラッシュ優先',type:'ordered',ids:['purabi','denjika','birimori','biripiyo']},
      {title:'火力・妨害を増やしたい',type:'list',ids:['denjika','denrou','shiiparusu','gaoden']},
      {title:'サポートを増やしたい',type:'list',ids:['purabi','biripiyo','birimori']}
    ],
    priorityIds:['purabi','denjika','birimori','biripiyo'],
    faq:{title:'ガオデン系は育てる価値ある？',id:'gaoden',body:'弱くはない。ノックバックによる押し返しと、第3進化以降の被ダメージ増加が強み。ただし現状の総合・ゾンビラッシュ評価では、プラビ・デンジカ・ビリモリなどを先に育てる価値が高い。'},
    compare:{a:'purabi',b:'denjika',title:'プラビ vs デンジカ',aLabel:'回復 / バフ / 生存',bLabel:'火力 / 貫通 / 麻痺 / CC',conclusion:'回復・安定性不足ならプラビ。敵処理・足止め不足ならデンジカ。'},
    evoPoints:[
      {id:'purabi',text:'第2進化でピンチ時無敵、第3進化で高速回復を追加。'},
      {id:'denjika',text:'第3進化で4回攻撃ごとに無限貫通が追加。'},
      {id:'biripiyo',text:'第3進化で強化充電・攻撃力増加50%が追加。'},
      {id:'gaoden',text:'第3進化で被ダメージ増加20%が追加。'},
      {id:'denrou',text:'第3進化で攻撃中の無敵が追加。'}
    ],
    roleNotes:{purabi:'回復 / バフ',denjika:'火力 / CC',birimori:'デバフ',biripiyo:'バフ / 耐久補助',gaoden:'ノックバック / デバフ',denrou:'近接 / 麻痺',shiiparusu:'範囲 / 麻痺',hikaru:'シールド / 麻痺',hikikomoru:'束縛 / 減速',erekoon:'範囲火力',hihidog:'連鎖火力',birinamazu:'単体火力 / 束縛',erekineko:'近距離範囲 / 防御補助'}
  },
  rock:{
    key:'rock',attr:'岩',icon:'🪨',path:'rock',count:12,bodyCount:42,
    title:'岩属性おすすめ・育成優先度',
    lead:'モンサバ 岩属性の12系統を収録。前衛・火力・サポート性能を比較して育成候補を整理しています。',
    summary:'岩属性は現時点で総合Tier対象が少ないため、評価済み候補と評価保留の特徴的な候補を分けて見ます。無理に低Tierを付けず、判明している役割を中心に整理します。',
    recommendations:[
      {title:'現在評価済みの候補',type:'ordered',ids:['yanzaru']},
      {title:'ゾンビラッシュ',type:'ordered',ids:['yanzaru']},
      {title:'通常攻略',type:'ordered',ids:['yanzaru']},
      {title:'評価保留だが特徴的な候補',type:'list',ids:['gantoru','doriruu','mogurin','kowagaru']}
    ],
    priorityIds:['yanzaru'],
    faq:{title:'岩属性はヤンザル以外も育てる？',id:'yanzaru',body:'ヤンザル系は総合SSSかつゾンビラッシュSSSの評価済み候補です。ほかの岩属性は評価保留が多いため、まずヤンザル系を軸にし、手持ちの役割不足に応じて追加候補を検討するのが無難です。'},
    compare:{a:'yanzaru',b:'gantoru',title:'ヤンザル vs 評価保留の前衛候補',aLabel:'火力 / 分身 / 前線補助',bLabel:'前衛 / 耐久候補',conclusion:'長く使う火力枠ならヤンザル。前衛不足を補いたい場合は評価保留候補も個別スキルを見て検討。'},
    evoPoints:[
      {id:'yanzaru',text:'進化で分身数が増える火力枠。第3進化以降の戦力上昇が大きい。'},
      {id:'kowagaru',text:'評価保留だが、進化段階が多く前線寄りの候補として確認対象。'},
      {id:'gantoru',text:'評価保留の岩属性前衛候補。個別ページでスキルを確認して採用を判断。'}
    ],
    roleNotes:{yanzaru:'火力 / 分身 / 前線補助',guuhog:'火力',rokubuhi:'前衛候補',kowagaru:'前衛候補',tsubutsumuri:'耐久候補',mumukaba:'妨害候補',mogurin:'前衛候補',korotama:'範囲火力',rokuju:'範囲火力',gantoru:'前衛 / 耐久候補',nenbutsuhebi:'妨害候補',doriruu:'前衛 / 火力候補'}
  }
};
const {getFamilyDisplayLabel}=MONSABA_FAMILY;

const attrNav=Object.entries(ATTRIBUTE_META).map(([attr,meta])=>[meta.slug,meta.icon,attr]);
const rankOrder={SSS:0,SS:1,S:2,A:3,'－':4};
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const thumb=src=>`/${String(src||'').replace('assets/monsters/','assets/thumbs/')}`;
let currentFamilies=[];

async function bootAttributeGuide(){
  const key=document.body.dataset.attributeGuide;
  const guide=ATTRIBUTE_GUIDES[key];
  if(!guide) throw new Error(`unknown attribute guide: ${key}`);
  const [tatari,ratings,skills]=await Promise.all([fetchJson('/data/tatari.json'),fetchJson('/data/tier-ratings.json'),fetchJson('/data/tata-skills.json')]);
  const families=(tatari.families||[]).filter(f=>f.attribute===guide.attr);
  currentFamilies=families;
  window.__attributeGuideState={guide,families,ratings,skills};
  const overall=ratings.overall?.byFamily||{};
  const zombie=ratings.zombieRush?.byFamily||{};
  renderHero(guide,families);
  renderAttributeNav(guide);
  renderRecommendations(guide,families,overall,zombie);
  renderPriority(guide,families,overall,zombie);
  renderFaq(guide,families,overall,zombie);
  renderCompare(guide,families);
  renderEvoPoints(guide,families);
  renderRoleTable(guide,families,overall,zombie);
  renderCards(guide,families,overall,zombie,skills.byFamily||{});
}

async function fetchJson(path){
  const res=await fetch(path,{cache:'no-store'});
  if(!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

function renderHero(guide,families){
  $('#guideLead').textContent=guide.lead;
  $('#summaryText').textContent=guide.summary;
  $('#familyCountText').textContent=`${families.length}系統 / ${guide.bodyCount}体を収録`;
}

function renderAttributeNav(guide){
  $('#attributeGuideNav').innerHTML=attrNav.map(([key,icon,label])=>`<a class="${key===guide.key?'is-active':''}" href="/attribute/${key}/">${icon} ${label}属性</a>`).join('');
}

function renderRecommendations(guide){
  $('#recommendGrid').innerHTML=guide.recommendations.map(block=>{
    const tag=block.type==='ordered'?'ol':'ul';
    return `<article class="guide-panel"><h3>${esc(block.title)}</h3><${tag} class="${block.type==='ordered'?'number-list':'plain-list'}">${block.ids.map(id=>`<li>${familyLink(id)}</li>`).join('')}</${tag}></article>`;
  }).join('');
}

function renderPriority(guide,families,overall,zombie){
  const ids=guide.priorityIds.length?guide.priorityIds:families.filter(f=>overall[f.id]).map(f=>f.id).slice(0,4);
  $('#priorityGrid').innerHTML=ids.map(id=>{
    const f=families.find(x=>x.id===id);
    if(!f) return '';
    const o=overall[id];
    const z=zombie[id];
    const roles=(o?.roles&&o.roles.length?o.roles:(guide.roleNotes[id]||'').split(' / ').filter(Boolean));
    const comment=o?.comment||roleComment(guide,id);
    return `<article class="priority-tata-card">
      <div class="priority-tata-head"><h3>${esc(getFamilyDisplayLabel(f))}</h3><div>${badge('総合',o?.tier)}${z?.tier?badge('ゾンビ',z.tier):''}</div></div>
      <p class="tier-chain">${chain(f)}</p>
      <ul class="role-tags as-list">${roles.map(r=>`<li>${esc(r)}</li>`).join('')}</ul>
      <p>${esc(comment)}</p>
      <a class="detail-link" href="/tata/${encodeURIComponent(id)}/">詳しく見る</a>
    </article>`;
  }).join('');
}

function renderFaq(guide,families,overall,zombie){
  const f=families.find(x=>x.id===guide.faq.id);
  $('#faqTitle').textContent=guide.faq.title;
  $('#faqBody').textContent=guide.faq.body;
  $('#faqChain').textContent=f?chain(f):'';
  $('#faqBadges').innerHTML=f?`${badge('総合',overall[f.id]?.tier)}${zombie[f.id]?.tier?badge('ゾンビ',zombie[f.id].tier):''}`:'';
  $('#faqLink').href=f?`/tata/${encodeURIComponent(f.id)}/`:'#';
}

function renderCompare(guide){
  $('#compareTitle').textContent=guide.compare.title;
  $('#compareCards').innerHTML=[['a',guide.compare.a,guide.compare.aLabel],['b',guide.compare.b,guide.compare.bLabel]].map(([,id,label])=>`<article class="choice-card"><h3>${familyLink(id)}</h3><ul class="plain-list">${label.split(' / ').map(x=>`<li>${esc(x)}</li>`).join('')}</ul></article>`).join('');
  $('#compareConclusion').textContent=guide.compare.conclusion;
}

function renderEvoPoints(guide){
  $('#evoPointGrid').innerHTML=guide.evoPoints.map(p=>`<article><b>${familyLink(p.id)}</b><span>${esc(p.text)}</span></article>`).join('');
}

function renderRoleTable(guide,families,overall,zombie){
  $('#roleTableBody').innerHTML=families.map(f=>{
    const role=guide.roleNotes[f.id]||(overall[f.id]?.roles||[]).join(' / ')||'評価保留';
    const memo=overall[f.id]?.comment||zombie[f.id]?.comment||'評価保留。個別ページで進化・スキルを確認してください。';
    return `<tr><th>${familyLink(f.id)}</th><td>${esc(role)}</td><td>${esc(memo)}</td></tr>`;
  }).join('');
}

function renderCards(guide,families,overall,zombie,skillsByFamily){
  $('#attributeCards').innerHTML=families.map(f=>{
    const first=f.evolutions[0]||{};
    const skill=latestSkillName(skillsByFamily[f.id])||'スキル確認';
    return `<a class="card static-card" href="/tata/${encodeURIComponent(f.id)}/" data-family-id="${esc(f.id)}">
      <div class="card-image"><img src="${esc(thumb(first.image))}" alt="${esc(first.name||getFamilyDisplayLabel(f))}" loading="lazy"></div>
      <div class="card-body"><div class="card-top"><span class="attribute">${guide.icon} ${guide.attr}属性</span><span class="source-state">${f.evolutions.length}段階</span></div>
      <h2>${esc(getFamilyDisplayLabel(f))}</h2><div class="tier-inline">${badge('総合',overall[f.id]?.tier)}${zombie[f.id]?.tier?badge('ゾンビ',zombie[f.id].tier):''}</div>
      <div class="chain">${chain(f)}</div><span class="skill-chip">${esc(skill)}</span></div>
    </a>`;
  }).join('');
}

function badge(label,rank){
  const key=String(rank||'評価保留').toLowerCase();
  const cls=['sss','ss','s','a'].includes(key)?` rank-${key}`:'';
  return `<span class="tier-badge${cls}">${esc(label)} ${esc(rank||'評価保留')}</span>`;
}

function chain(f){return f.evolutions.map(e=>e.name).join(' → ');}
function familyLink(id){return `<a href="/tata/${encodeURIComponent(id)}/">${esc(nameById(id))}系</a>`;}
function nameById(id){
  const f=currentFamilies.find(x=>x.id===id);
  return f ? getFamilyDisplayLabel(f) : id;
}
function roleComment(guide,id){return `${guide.roleNotes[id]||'役割を確認中'}。現時点では評価データと個別スキルを見て育成を判断します。`;}

function latestSkillName(skillFamily){
  const stages=skillFamily?.stages||[];
  return stages.at(-1)?.skillName||stages.find(stage=>stage.skillName)?.skillName||null;
}

bootAttributeGuide().catch(err=>{
  console.error(err);
  const root=$('#attributeCards');
  if(root) root.innerHTML='<div class="empty">データの読み込みに失敗しました。ページを再読み込みしてください。</div>';
});
