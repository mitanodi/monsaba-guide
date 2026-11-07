import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
const read = name => JSON.parse(fs.readFileSync(`data/${name}.json`, 'utf8'));
const save = (name, data) => fs.writeFileSync(`data/${name}.json`, JSON.stringify(data, null, 2) + '\n');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const date = '2026-11-07', manifest = 'data/wiki-tata-evidence-2026-11-07.json';
const specs = [
  {id:'bibabo', names:['ビバボ','デンキゲシ','ボルティース','ビバントクロー'], attribute:'雷', page:171, files:[2722,2723,2724,2725]},
  {id:'shaipu', names:['シャイプ','プランキー','バナコング','バナナリアン'], attribute:'草', page:155, files:[2399,2701,2702,2703]}
];
const db=read('tatari'), skills=read('tata-skills'), images=read('tata-images'), names=read('tata-name-i18n-sources');
const records=[];
for(const spec of specs){
  const url=`https://w.atwiki.jp/monstersurvival/pages/${spec.page}.html`;
  const evolutions=[], forms=[], stages=[];
  for(const [i,name] of spec.names.entries()){
    const stage=i+1, recordId=`${spec.id}:T${stage}`, base=`assets/tata-wiki/${spec.id}/t${stage}`;
    const original=base+'-source.webp', sourceSha256=hash(original), metadata=await sharp(original).metadata();
    for(const size of [256,512]) await sharp(original).resize(size,size,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}}).webp({lossless:true}).toFile(`${base}-${size}.webp`);
    const evidence={sourceType:'public_wiki_game_asset',manifest,recordId,sourceUrl:url,sourceSha256,checkedAt:date};
    records.push({recordId,familyId:spec.id,stage,name,sourceUrl:url,imageUrl:`https://img.atwiki.jp/monstersurvival/attach/83/${spec.files[i]}/${encodeURIComponent(name)}.webp`,originalPath:original,sourceSha256,originalWidth:metadata.width,originalHeight:metadata.height,checkedAt:date});
    evolutions.push({stage,name,nameEn:null,nameZhHans:null,image:base+'-512.webp',source:manifest,nameVerification:{en:'pending','zh-CN':'pending'},imageEvidence:evidence});
    forms.push({stage,name,src:`/${base}-512.webp`,srcset:`/${base}-256.webp 256w, /${base}-512.webp 512w`,sizes:'(max-width: 600px) 44vw, 256px',width:512,height:512,status:'verified',sha256:hash(base+'-512.webp'),sourceType:'public_wiki_game_asset',sourceSha256,sourceUrl:url,evidenceManifest:manifest,evidenceRecord:recordId,optimizedPath:`/${base}-512.webp`,verifiedAt:date});
    stages.push({stage,tataName:name,skillName:'確認待ち',description:'Wikiの名称と画像を確認済み。スキル名・効果・数値はゲーム内資料の確認待ちです。',values:[],sources:[],verificationStatus:'pending-wiki-skill-evidence',nameEn:null,nameZhHans:null,evidence:{sourceType:'public_wiki',sourceUrl:url,manifest,skillEvidenceProvided:false,verifiedAt:date}});
    names.forms=names.forms.filter(row=>!(row.familyId===spec.id&&row.stage===stage));
    names.forms.push({familyId:spec.id,stage,japaneseName:name,englishName:null,simplifiedChineseName:null,confidence:'pending-official',sourceType:'supplemental-evidence',japaneseEvidence:evidence,localizedEvidence:{en:{status:'pending',reason:'official-localized-name-not-obtained'},'zh-CN':{status:'pending',reason:'official-localized-name-not-obtained'}},checkedAt:date});
  }
  db.families=db.families.filter(f=>f.id!==spec.id);
  db.families.push({id:spec.id,familyName:spec.names[0],attribute:spec.attribute,attributeEvidence:{sourceType:'public_wiki',sourceUrl:url,checkedAt:date},verification:{namesAndImages:'public-wiki-confirmed',implementation:'general-release-not-independently-verified',checkedAt:date},evolutions,skills:stages.map(s=>({stage:s.stage,name:s.skillName,summary:s.description,stats:[],source:manifest})),searchAliases:spec.names});
  skills.byFamily[spec.id]={familyId:spec.id,familyName:spec.names[0],attribute:spec.attribute,stages};
  images.families=images.families.filter(f=>f.familyId!==spec.id);
  images.families.push({order:db.families.length,familyId:spec.id,familyDisplay:spec.names[0],attribute:spec.attribute,forms,stage1:forms[0]});
}
db.meta.familyCount=db.families.length;db.meta.monsterCount=db.families.reduce((n,f)=>n+f.evolutions.length,0);
for (const id of specs.map(s => s.id)) images.families.find(f => f.familyId === id).order = db.families.findIndex(f => f.id === id) + 1;
db.meta.latestWikiSupplement={checkedAt:date,evidence:manifest,scope:specs.map(s=>s.id)};
skills.totals.families=db.meta.familyCount;skills.totals.stages=skills.totals.skills=db.meta.monsterCount;skills.totals.pendingSkillEvidence=Object.values(skills.byFamily).flatMap(f=>f.stages).filter(s=>/^pending-.*skill-evidence$/.test(s.verificationStatus||'')).length;
images.counts.families=db.meta.familyCount;images.counts.forms=db.meta.monsterCount;images.counts.verifiedForms=images.families.flatMap(f=>f.forms).filter(f=>f.status==='verified').length;images.counts.publicWikiGameAssetForms=8;
images.sourcePolicy.userRequestedWikiGameAssets=true;
images.sourcePolicy.wikiAssetScope='Game character artwork from the explicitly requested Wiki; no Wiki screenshots, branding or derivative illustrations.';
names.summary.canonicalForms=db.meta.monsterCount;names.summary.needsReview=names.forms.filter(f=>f.confidence!=='confirmed').length;
save('wiki-tata-evidence-2026-11-07',{version:1,checkedAt:date,sourceType:'public_wiki_game_asset',scope:'User-requested game character artwork and Japanese evolution names only; no inferred localized names, skills or rankings.',rightsNote:'Wiki hosting is not evidence of a general redistribution license. Game artwork rights remain with their respective owners; these files are not official creator asset-pack records.',records});
save('tatari',db);save('tata-skills',skills);save('tata-images',images);save('tata-name-i18n-sources',names);
