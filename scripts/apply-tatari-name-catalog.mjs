import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'));
const write=(file,data)=>fs.writeFileSync(path.join(root,file),`${JSON.stringify(data,null,2)}\n`);
const catalog=read('data/tatari-name-catalog.json');
const currentJapaneseNames=read('data/tata-japanese-name-corrections-2026-09-10.json');
const tatari=read('data/tatari.json');
const skills=read('data/tata-skills.json');
const source=read('data/tata-name-i18n-sources.json');
const season=read('data/zombie-rush/seasons/season-1.json');
const images=read('data/tata-images.json');
const assetMap=read('data/official-assets/tata-source-map.json');
const dictionaries={en:read('data/i18n/en.json'),'zh-CN':read('data/i18n/zh-CN.json')};
const families=new Map(tatari.families.map(f=>[f.id,f]));
const sourceRows=new Map(source.forms.map(row=>[`${row.familyId}:${row.stage}`,row]));

const catalogRows=new Map(catalog.names.filter(item=>item.existingFamilyId).map(item=>[`${item.existingFamilyId}:${item.existingStage}`,item]));
for(const correction of currentJapaneseNames.corrections){
  const key=`${correction.familyId}:${correction.stage}`;
  const item=catalogRows.get(key);
  if(!item) throw new Error(`Unresolved current Japanese name correction ${key}`);
  if(item.japaneseName!==correction.name){
    item.previousJapaneseName=item.japaneseName;
    item.japaneseName=correction.name;
  }
  if(correction.englishName) item.englishName=correction.englishName;
}

for(const item of catalog.names.filter(item=>item.existingFamilyId)){
  const family=families.get(item.existingFamilyId);
  const evolution=family?.evolutions.find(row=>row.stage===item.existingStage);
  const skill=skills.byFamily?.[item.existingFamilyId]?.stages?.find(row=>row.stage===item.existingStage);
  const nameSource=sourceRows.get(`${item.existingFamilyId}:${item.existingStage}`);
  if(!family||!evolution||!skill||!nameSource) throw new Error(`Unresolved catalog row ${item.sourceRow}`);
  const previous=evolution.name;
  evolution.name=item.japaneseName;
  evolution.nameEn=item.englishName;
  evolution.nameZhHans=item.simplifiedChineseName;
  skill.tataName=item.japaneseName;
  skill.nameEn=item.englishName;
  skill.nameZhHans=item.simplifiedChineseName;
  nameSource.japaneseName=item.japaneseName;
  nameSource.englishName=item.englishName;
  nameSource.simplifiedChineseName=item.simplifiedChineseName;
  nameSource.nameListSource={file:catalog.source.fileName,sheet:catalog.source.sheet,sourceRow:item.sourceRow};
  family.searchAliases=[...new Set([...(family.searchAliases||[]),family.familyName,previous,item.japaneseName])];
}

const supplemental={164:['shizukuchou',4],190:['tsubaruka',4],226:['nusuke',1],227:['nusuke',2],228:['nusuke',3],229:['nusuke',4]};
for(const item of catalog.names){
  const mapping=item.existingFamilyId?[item.existingFamilyId,item.existingStage]:supplemental[item.sourceRow];
  item.mappedFamilyId=mapping[0];
  item.mappedStage=mapping[1];
  item.sitePath=`/tata/${mapping[0]}/`;
  item.status=item.existingFamilyId?'applied-to-site':'supplemental-name-only';
}
catalog.summary={rowCount:236,appliedToExistingForms:230,supplementalForms:6,mappedTotal:236};

const renames=catalog.names.filter(item=>item.previousJapaneseName&&item.previousJapaneseName!==item.japaneseName).map(item=>[item.previousJapaneseName,item.japaneseName]);
const renameText=value=>{
  let result=String(value);const tokens=[];
  renames.forEach(([before,after],index)=>{const token=`__TATARI_RENAME_${index}__`;if(result.includes(before)){result=result.replaceAll(before,token);tokens.push([token,after]);}});
  for(const [token,after] of tokens) result=result.replaceAll(token,after);
  return result;
};
for(const dictionary of Object.values(dictionaries)){
  for(const [key,value] of Object.entries({...dictionary})){
    const renamedKey=renameText(key);
    if(renamedKey!==key&&!dictionary[renamedKey]) dictionary[renamedKey]=renameText(value);
  }
}
for(const imageFamily of images.families||[]){
  const family=families.get(imageFamily.familyId);
  if(!family) continue;
  imageFamily.familyDisplay=family.evolutions[0].name;
  for(const form of imageFamily.forms||[]){
    const evolution=family.evolutions.find(row=>row.stage===form.stage);
    if(evolution) form.name=evolution.name;
  }
  if(imageFamily.stage1) imageFamily.stage1.name=family.evolutions[0].name;
}
for(const asset of assetMap.assets||[]){
  const family=families.get(asset.familyId);const evolution=family?.evolutions.find(row=>row.stage===asset.stage);
  if(evolution){asset.name=evolution.name;asset.nameEn=evolution.nameEn;}
}

for(const item of season.tataSkillBalance||[]){
  const mapped=catalog.names.find(row=>row.existingFamilyId===item.familyId&&row.existingStage===item.stage);
  if(mapped){
    item.databaseTataName=mapped.japaneseName;
    if(item.officialTataName!==mapped.japaneseName) item.mappingStatus='official-name-review';
  }
}

write('data/tatari.json',tatari);
write('data/tata-skills.json',skills);
write('data/tata-name-i18n-sources.json',source);
write('data/tatari-name-catalog.json',catalog);
write('data/zombie-rush/seasons/season-1.json',season);
write('data/i18n/en.json',dictionaries.en);
write('data/i18n/zh-CN.json',dictionaries['zh-CN']);
write('data/tata-images.json',images);
write('data/official-assets/tata-source-map.json',assetMap);
console.log('Applied 230 workbook names to canonical forms and mapped all 236 catalog rows.');
