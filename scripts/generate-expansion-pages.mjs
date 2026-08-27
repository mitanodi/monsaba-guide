import fs from 'node:fs';
import path from 'node:path';
import '../family-display.js';
import { renderHeader, renderFooter, renderBreadcrumb } from './shared-layout.mjs';
import { renderSeoHead, safeJsonLd, breadcrumbSchema, absoluteUrl } from './seo-helpers.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=name=>JSON.parse(fs.readFileSync(path.join(root,'data',name),'utf8'));
const tatari=read('tatari.json');
const ratings=read('tier-ratings.json');
const evolution=read('evolution-priority.json');
const stages=read('stages.json');
const items=read('items.json');
const systems=read('systems.json');
const events=read('events.json');
const byId=new Map(tatari.families.map(f=>[f.id,f]));
const {getFamilyDisplayLabel}=globalThis.MONSABA_FAMILY;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const write=(route,html)=>{const dir=path.join(root,route.slice(1));fs.mkdirSync(dir,{recursive:true});const output=html.replace('<link rel="icon" href="/favicon.ico">','<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32"><link rel="apple-touch-icon" href="/apple-touch-icon.png">');fs.writeFileSync(path.join(dir,'index.html'),output)};
const shell=({route,title,description,body,robots='index,follow,max-image-preview:large',type='CollectionPage'})=>{
  const crumbs=[{label:'トップ',href:'/'},{label:title.split('｜')[0]}];
  const graph=[{'@type':type,'@id':absoluteUrl(route),url:absoluteUrl(route),name:title,description,dateModified:'2026-08-28',inLanguage:'ja'},breadcrumbSchema(crumbs)];
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${renderSeoHead({title,description,route,robots})}<link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${safeJsonLd({'@context':'https://schema.org','@graph':graph})}</script></head><body data-page-type="expansion"><a class="skip-link" href="#main-content">本文へスキップ</a>${renderHeader(route)}<main id="main-content"><section class="page-hero"><div class="wrap">${renderBreadcrumb(crumbs)}<div class="family-page-head"><div><span class="visible-kicker">確認済みデータを優先</span><h1>${esc(title.split('｜')[0])}</h1><p>${esc(description)}</p></div></div></div></section>${body}<section class="wrap source-note page-freshness"><strong>情報の状態</strong><p><span class="trust-label is-verified">更新済み</span> 最終更新 <time datetime="2026-08-28">2026/8/28</time></p><a href="/about-data/">データ方針を見る</a></section></main>${renderFooter('63系統 / 224体')}<script src="/family-display.js"></script><script src="/site.js"></script><script src="/growth.js" defer></script></body></html>`;
};
const card=(title,text,href,label='詳しく見る')=>`<article class="guide-hub-card"><h3>${esc(title)}</h3><p>${esc(text)}</p>${href?`<a class="ghost-button" href="${href}">${esc(label)}</a>`:''}</article>`;

write('/stages/',shell({route:'/stages/',title:'モンサバ ステージ別攻略｜Chapter・Stage番号から探す',description:'Chapter・Stage番号から攻略を探すための基盤です。確実な攻略情報があるステージだけを公開し、架空の個別攻略は生成しません。',body:`<section class="wrap static-section"><h2 class="page-h2">ステージ番号から探す</h2><form class="compare-controls" action="/search/"><label>Chapter / Stage<input name="q" inputmode="numeric" placeholder="例：2-50、7-70"></label><button class="button">サイト内検索</button></form><div class="summary-box"><strong>公開中の確認済み個別攻略：${stages.guides.length}件</strong><p>個別ページは、失敗原因・時間切れ対策・全滅対策・配置・推奨役割・関連タタ・参考情報・確認状況が揃った場合だけ公開します。</p></div><div class="attribute-guide-nav"><a href="/normal-guide/">通常ステージ共通攻略</a><a href="/consult/?flow=content&mode=normal">症状から攻略相談</a><a href="/roles/">役割からタタを探す</a></div></section>`}));

const roadmap=[...evolution.t3Roadmap.firstPriority,...evolution.t3Roadmap.secondPriority];
const evoCards=roadmap.map(item=>{const f=byId.get(item.familyId);return f?card(getFamilyDisplayLabel(f),`${item.priority}・T3まで${item.requiredStars}星。${item.reason}`,`/tata/${f.id}/#stage-3`,'T3差分を見る'):''}).join('');
const t4Transitions=(evolution.highImpactTransitions||[]).filter(x=>x.toStage===4);
write('/evolution/',shell({route:'/evolution/',title:'モンサバ 進化条件・進化試練DB',description:'T1→T2、T2→T3、T3→T4の進化差分・必要星数・進化優先度を確認済みデータから探します。未確認の試練条件は推測しません。',body:`<section class="wrap static-section"><div class="guide-hub-grid">${card('T3おすすめ','必要星数と戦力化の早さから、既存の進化優先度を整理。','/evolution/t3/','T3おすすめを見る')}${card('T4おすすめ','確認済みの高インパクト進化だけを一覧化。','/evolution/t4/','T4おすすめを見る')}${card('進化優先度','全体の育成順と判断基準。','/evolution-priority/','既存ページを見る')}</div><h2 class="page-h2">進化条件の扱い</h2><p>必要星数・進化条件・進化試練は確認済みの項目だけ表示します。空欄を推測で埋めません。</p></section>`}));
write('/evolution/t3/',shell({route:'/evolution/t3/',title:'モンサバ T3おすすめ｜最初の第3進化と必要星数',description:'モンサバで最初にT3へ進化させる候補を、確認済み必要星数・進化差分・既存進化優先度から比較します。',body:`<section class="wrap static-section"><h2 class="page-h2">T3最優先・優先候補</h2><div class="guide-hub-grid">${evoCards}</div><p class="section-note">全員共通の正解ではありません。手持ちと攻略目的は<a href="/consult/?flow=evolution">攻略相談所</a>で確認できます。</p></section>`}));
write('/evolution/t4/',shell({route:'/evolution/t4/',title:'モンサバ T4おすすめ｜第4進化の大きな変化',description:'確認済みの進化差分と既存進化優先度から、T4で変化が大きい系統を整理します。未確認の新T4詳細は掲載しません。',body:`<section class="wrap static-section"><h2 class="page-h2">確認済みの高インパクトT4</h2><div class="guide-hub-grid">${t4Transitions.map(item=>{const f=byId.get(item.familyId);return f?card(getFamilyDisplayLabel(f),`${item.headline}。${item.reason}`,`/tata/${f.id}/#stage-4`,'T4差分を見る'):''}).join('')||card('確認中','既存DBで根拠が揃った候補から追加します。')}</div><div class="alert-box"><strong>新T4の詳細は確認待ち</strong><p>ロードパスとナムアミダイジャは公式告知で名称を確認済みですが、スキル・必要星数はゲーム内スクリーンショット確認まで追加しません。</p></div></section>`}));

write('/items/',shell({route:'/items/',title:'モンサバ アイテム・素材DB',description:'モンサバのアイテム名・用途・入手方法・関連コンテンツを確認済み情報だけで整理する基盤です。',robots:'noindex,follow',body:`<section class="wrap static-section"><div class="summary-box"><strong>確認済みアイテム：${items.items.length}件</strong><p>現在はデータ構造のみ準備済みです。名称・用途・入手方法をゲーム内で確認できた項目から公開し、架空情報で埋めません。</p></div></section>`}));
write('/systems/',shell({route:'/systems/',title:'モンサバ キャンプ・施設攻略',description:'施設・強化・解放・食材加工など、ゲーム内システムを公式確認済み情報から整理するハブです。',robots:'noindex,follow',body:`<section class="wrap static-section"><div class="guide-hub-grid">${systems.systems.map(x=>card(x.name,x.summary)).join('')}</div><p class="section-note">強化条件・解放条件はゲーム内確認ができるまで公開しません。</p></section>`}));

const eventCards=events.events.map(x=>card(x.name,x.summary||'独自ツールを利用できます。',x.href,x.href?'開く':'詳細確認中')).join('');
write('/events/',shell({route:'/events/',title:'モンサバ イベント攻略｜開催中・周期イベント',description:'オタカラ探し、魔法の農場、サプライズルーレットなど、確認済みイベント情報と独自攻略ツールをまとめます。',body:`<section class="wrap static-section"><h2 class="page-h2">常設・周期イベント</h2><div class="guide-hub-grid">${eventCards}</div><p class="section-note">開催中・開催予定の断定には公式の期間表示が必要です。期間未確認のイベントは「周期イベント」として整理しています。</p></section>`}));

const roleDefs=[
  ['paralysis','麻痺',['麻痺']],['stun','スタン',['スタン']],['bind','束縛',['束縛']],['sleep','睡眠',['睡眠']],['slow','減速',['減速']],['pierce','貫通',['貫通']],['heal','回復',['回復']],['tank','タンク',['タンク','前衛']],['shield','シールド',['シールド']],['buff','バフ',['バフ','支援']],['debuff','デバフ',['デバフ','被ダメ増加','攻撃速度低下']],['area-damage','範囲火力',['範囲','広範囲','持続火力']]
];
const roleFamilies=(terms)=>tatari.families.filter(f=>{const roles=ratings.overall.byFamily?.[f.id]?.roles||[];return roles.some(role=>terms.some(term=>role.includes(term)))});
const activeRoles=roleDefs.map(([slug,label,terms])=>({slug,label,families:roleFamilies(terms)})).filter(x=>x.families.length>=2);
write('/roles/',shell({route:'/roles/',title:'モンサバ 状態異常・役割別タタ',description:'麻痺・スタン・束縛・睡眠・減速・貫通・回復・タンク・シールド・バフなど、既存DBの役割からタタを探せます。',body:`<section class="wrap static-section"><div class="guide-hub-grid">${activeRoles.map(x=>card(`${x.label}（${x.families.length}系統）`,'既存Tier DBの役割ラベルから自動抽出。',`/roles/${x.slug}/`,'一覧を見る')).join('')}</div></section>`}));
for(const role of activeRoles){
  write(`/roles/${role.slug}/`,shell({route:`/roles/${role.slug}/`,title:`モンサバ ${role.label}持ち・役割別タタ一覧`,description:`モンサバの${role.label}役を、既存DBの確認済み役割ラベルから一覧表示します。`,body:`<section class="wrap static-section"><h2 class="page-h2">${esc(role.label)}候補 ${role.families.length}系統</h2><div class="guide-hub-grid">${role.families.map(f=>card(getFamilyDisplayLabel(f),(ratings.overall.byFamily[f.id]?.roles||[]).join('・'),`/tata/${f.id}/`,'個別ページを見る')).join('')}</div><p class="section-note">役割ラベルは当サイトの整理です。スキル本文と用途別Tierも個別ページで確認してください。</p></section>`}));
}

const purabi=byId.get('purabi'),denjika=byId.get('denjika');
const compareBody=[purabi,denjika].map(f=>{const r=ratings.overall.byFamily[f.id];return `<article class="guide-hub-card"><h2>${esc(getFamilyDisplayLabel(f))}</h2><dl><div><dt>総合</dt><dd>${esc(r.tier)}</dd></div><div><dt>通常</dt><dd>${esc(r.normal)}</dd></div><div><dt>ZR</dt><dd>${esc(r.zombie)}</dd></div><div><dt>道場</dt><dd>${esc(r.dojo)}</dd></div><div><dt>初心者</dt><dd>${esc(r.beginner)}</dd></div><div><dt>役割</dt><dd>${esc(r.roles.join('・'))}</dd></div></dl><p>${esc(r.comment)}</p><a href="/tata/${f.id}/">個別データを見る</a></article>`}).join('');
write('/compare-guides/purabi-vs-denjika/',shell({route:'/compare-guides/purabi-vs-denjika/',title:'プラビ系とビリジカ系はどっち？｜モンサバ比較',description:'プラビ系とビリジカ系を総合・通常・Zombie Rush・道場・初心者・役割・進化で比較します。',type:'Article',body:`<section class="wrap static-section"><div class="guide-hub-grid">${compareBody}</div><div class="summary-box"><strong>結論</strong><p>安定性・回復・バフを優先するならプラビ系、貫通・麻痺・CCを優先するならビリジカ系が候補です。どちらが上かは不足役割と攻略モードで変わります。</p></div><div class="attribute-guide-nav"><a href="/compare/?a=purabi&b=denjika">比較ツールで見る</a><a href="/evolution-priority/">進化優先度を見る</a></div></section>`}));

console.log(`Expansion pages generated: stages ${stages.guides.length}, roles ${activeRoles.length}, events ${events.events.length}`);
