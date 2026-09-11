import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const tatari=JSON.parse(fs.readFileSync(path.join(root,'data/tatari.json'),'utf8'));
const canonicalFamilies=new Map(tatari.families.map(family=>[family.id,family]));
const variants={
  ja:{source:'search/index.html',output:'tatari-names/index.html',title:'タタ名称一覧｜モンサバ攻略DB',description:'タタの日本語・英語・簡体中国語名236件を検索できる名称資料です。',home:'/',breadcrumb:'トップ',heading:'タタ名称一覧',intro:'提供された名称表の全236件を、日本語・英語・簡体中国語で掲載しています。',summary:'既存DB対応 230件／名称資料のみ 6件',caveat:'名称以外の属性・性能・進化関係は、この表だけから推測していません。',search:'名前を検索',display:'表示',all:'すべて',existing:'既存DB対応',newOnly:'名称資料のみ',siteMatch:'サイト内対応',sourceNote:'出典：Tatari_Name (1).xlsx「塔塔名字 Tatari Names」／取込日 2026-09-09。名称資料として掲載し、公式性や能力情報を追加で断定するものではありません。'},
  en:{source:'en/search/index.html',output:'en/tatari-names/index.html',title:'Tatari name catalog | Clash of Critters Guide DB',description:'Search 236 Tatari names in Japanese, English, and Simplified Chinese.',home:'/en/',breadcrumb:'Home',heading:'Tatari name catalog',intro:'All 236 entries from the provided name list, shown in Japanese, English, and Simplified Chinese.',summary:'230 matched to the existing database / 6 names-only entries',caveat:'Attributes, stats, and evolution relationships are not inferred from a names-only list.',search:'Search names',display:'Display',all:'All',existing:'Matched in database',newOnly:'Names only',siteMatch:'Site match',sourceNote:'Source: Tatari_Name (1).xlsx, worksheet “Tatari Names”; imported 2026-09-09. This is a names-only reference and does not independently establish official status or gameplay data.'},
  'zh-cn':{source:'zh-cn/search/index.html',output:'zh-cn/tatari-names/index.html',title:'Tatari 名称一览｜Clash of Critters 攻略数据库',description:'检索236个Tatari的日语、英语和简体中文名称。',home:'/zh-cn/',breadcrumb:'首页',heading:'Tatari 名称一览',intro:'完整收录所提供名称表中的236项日语、英语和简体中文名称。',summary:'已匹配现有数据库230项／仅名称资料6项',caveat:'不会仅根据名称表推测属性、数值或进化关系。',search:'搜索名称',display:'显示',all:'全部',existing:'已匹配数据库',newOnly:'仅名称资料',siteMatch:'站内对应',sourceNote:'来源：Tatari_Name (1).xlsx“塔塔名字 Tatari Names”，导入日期2026-09-09。本页仅作为名称资料，不据此断言官方性质或游戏能力数据。'}
};
const main=v=>`<main id="main-content" class="wrap name-catalog"><nav class="breadcrumbs" aria-label="breadcrumb"><a href="${v.home}">${v.breadcrumb}</a><span>›</span><span>${v.heading}</span></nav><h1>${v.heading}</h1><p>${v.intro}</p><p class="name-catalog-summary"><strong>${v.summary}</strong><br>${v.caveat}</p><div class="name-catalog-tools"><label>${v.search}<input id="name-query" type="search" placeholder="日本語・English・简体中文"></label><label>${v.display}<select id="name-filter"><option value="all">${v.all}</option><option value="existing">${v.existing}</option><option value="new">${v.newOnly}</option></select></label></div><p id="name-count" aria-live="polite"></p><div class="name-catalog-table-wrap"><table class="name-catalog-table"><thead><tr><th>日本語</th><th>English</th><th>简体中文</th><th>${v.siteMatch}</th></tr></thead><tbody id="name-rows"></tbody></table></div><p class="name-catalog-note">${v.sourceNote}</p></main>`;
for(const [locale,v] of Object.entries(variants)){
  let html=fs.readFileSync(path.join(root,v.source),'utf8');
  html=html.replace(/\s*<script src="\/search\/search\.js[^<]*<\/script>/,'');
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${v.title}</title>`).replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${v.description}">`);
  const headEnd=html.indexOf('</head>');let head=html.slice(0,headEnd).replaceAll('/search/','/tatari-names/');head+=`<link rel="stylesheet" href="/tatari-names/catalog.css"><script type="module" src="/tatari-names/catalog.js"></script>`;html=head+html.slice(headEnd);
  html=html.replace(/<main id="main-content"[\s\S]*?<\/main>/,main(v));
  fs.mkdirSync(path.dirname(path.join(root,v.output)),{recursive:true});fs.writeFileSync(path.join(root,v.output),html);
}

const catalog=JSON.parse(fs.readFileSync(path.join(root,'data/tatari-name-catalog.json'),'utf8'));
const localeDir=locale=>locale==='ja'?'':`${locale}/`;
const localName=(item,locale)=>locale==='en'?item.englishName:locale==='zh-cn'?item.simplifiedChineseName:item.japaneseName;
for(const [familyId,stage] of [['shizukuchou',4],['tsubaruka',4]]){
  if(canonicalFamilies.get(familyId)?.evolutions?.some(form=>form.stage===stage)) continue;
  const item=catalog.names.find(row=>row.mappedFamilyId===familyId&&row.mappedStage===stage);
  for(const locale of Object.keys(variants)){
    const file=path.join(root,localeDir(locale),`tata/${familyId}/index.html`);
    let html=fs.readFileSync(file,'utf8').replace(/<section class="wrap static-section name-catalog-supplement"[\s\S]*?<\/section>/g,'');
    const heading=locale==='ja'?'名称表で確認した追加形態':locale==='en'?'Additional form in the name list':'名称表中的追加形态';
    const note=locale==='ja'?'名称のみ確認済みです。属性・スキル・数値は確認できるまで追加しません。':locale==='en'?'The name is confirmed from the supplied list. Attribute, skill, and stat data remain unassigned.':'名称已从所提供列表确认；属性、技能和数值尚未确认。';
    const section=`<section class="wrap static-section name-catalog-supplement"><h2>${heading}</h2><p><strong>T${stage} ${localName(item,locale)}</strong></p><p>${note}</p></section>`;
    html=html.replace('</main>',`${section}</main>`);
    fs.writeFileSync(file,html);
  }
}

const nusuke=catalog.names.filter(row=>row.mappedFamilyId==='nusuke').sort((a,b)=>a.mappedStage-b.mappedStage);
if(!canonicalFamilies.has('nusuke')) for(const [locale,v] of Object.entries(variants)){
  const sourceFile=path.join(root,v.output);
  let html=fs.readFileSync(sourceFile,'utf8').replace(/<script type="module" src="\/tatari-names\/catalog\.js"><\/script>/,'');
  const title=locale==='ja'?'ヌスケ系 名称情報｜モンサバ攻略DB':locale==='en'?'Ringtail family names | Clash of Critters Guide DB':'干脆面系列名称｜Clash of Critters 攻略数据库';
  const heading=locale==='ja'?'ヌスケ系の名称情報':locale==='en'?'Ringtail family name information':'干脆面系列名称信息';
  const intro=locale==='ja'?'提供された名称表で4段階の名称を確認しました。':locale==='en'?'Four form names are confirmed in the supplied name list.':'所提供名称表中确认了四个阶段的名称。';
  const note=locale==='ja'?'属性・スキル・数値・画像は名称表に含まれないため、推測せず確認待ちとしています。':locale==='en'?'Attribute, skill, stat, and image data were not included, so they remain unassigned.':'名称表不含属性、技能、数值和图片，因此暂不推测。';
  const rows=nusuke.map(item=>`<tr><th>T${item.mappedStage}</th><td>${localName(item,locale)}</td><td>${item.japaneseName}</td><td>${item.englishName}</td><td>${item.simplifiedChineseName}</td></tr>`).join('');
  const mainHtml=`<main id="main-content" class="wrap name-catalog"><nav class="breadcrumbs"><a href="${v.home}">${v.breadcrumb}</a><span>›</span><a href="/${localeDir(locale)}tatari-names/">${v.heading}</a><span>›</span><span>${heading}</span></nav><h1>${heading}</h1><p>${intro}</p><div class="name-catalog-table-wrap tata-i18n-names"><table class="name-catalog-table"><thead><tr><th>Stage</th><th>${locale==='ja'?'表示名':'Display name'}</th><th>日本語</th><th>English</th><th>简体中文</th></tr></thead><tbody>${rows}</tbody></table></div><p class="name-catalog-note">${note}</p></main>`;
  html=html.replace(/<title>[^<]*<\/title>/,`<title>${title}</title>`).replace(/<main id="main-content"[\s\S]*?<\/main>/,mainHtml);
  for(const prefix of ['','en/','zh-cn/']) html=html.replaceAll(`/${prefix}tatari-names/`,`/${prefix}tata/nusuke/`);
  html=html.replace('/tata/nusuke/catalog.css','/tatari-names/catalog.css').replace(`<a href="/${localeDir(locale)}tata/nusuke/">${v.heading}</a>`,`<a href="/${localeDir(locale)}tatari-names/">${v.heading}</a>`);
  const output=path.join(root,localeDir(locale),'tata/nusuke/index.html');fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,html);
}
console.log('Tatari name catalog generated: 236 names / 3 locales');
