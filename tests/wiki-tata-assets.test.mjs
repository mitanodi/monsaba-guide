import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { pickerOrder } from '../team-builder/team-core.js';
import {emptyTeam,encodeTeam,decodeTeam,stageImageFor} from '../team-builder/team-core.js';
import {expandMakerStages} from '../tier-maker/catalog.js';
import {createState,parseState,updateState} from '../tier-maker/core.js';
import {validateTataNameSources} from '../scripts/lib/validate-tata-name-sources.mjs';
import '../family-display.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const db=read('data/tatari.json'),images=read('data/tata-images.json');
const evidence=read('data/wiki-tata-evidence-2026-11-07.json');
test('new catalog pages show every stage while Wiki provenance stays in internal data',()=>{
  for(const prefix of ['', 'en/', 'zh-cn/'])for(const id of ['bibabo','shaipu']){
    const html=fs.readFileSync(new URL(`../${prefix}tata/${id}/index.html`,import.meta.url),'utf8');
    for(const row of evidence.records.filter(r=>r.familyId===id)){
      assert.ok(html.includes(row.name));
      assert.ok(html.includes(`/assets/tata-wiki/${id}/t${row.stage}-512.webp`));
      assert.ok(!html.includes(`href="${row.sourceUrl}"`));
    }
    assert.ok(html.includes('2026-11-07'));
  }
});
test('requested Wiki artwork has exact names, original hashes and all eight stage mappings',async()=>{
  assert.equal(evidence.records.length,8);
  for(const row of evidence.records){
    const original=fs.readFileSync(new URL('../'+row.originalPath,import.meta.url));
    assert.equal(crypto.createHash('sha256').update(original).digest('hex'),row.sourceSha256);
    const form=images.families.find(f=>f.familyId===row.familyId).forms.find(f=>f.stage===row.stage);
    assert.equal(form.name,row.name);assert.equal(form.sourceSha256,row.sourceSha256);
    assert.equal(form.sourceType,'public_wiki_game_asset');assert.equal(form.sourceUrl,row.sourceUrl);
    for(const size of [256,512]){const m=await sharp(new URL(`../assets/tata-wiki/${row.familyId}/t${row.stage}-${size}.webp`,import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')).metadata();assert.equal(m.width,size);assert.equal(m.height,size);}
  }
  assert.equal(db.families.find(f=>f.id==='shaipu').evolutions[1].name,'プランキー');
});
test('new families stay selectable without inventing Tier rankings or translated names',()=>{
  const tierData=read('data/tata-tier.json'),positionData=read('data/zombie-rush/position-tiers.json');
  for(const mode of ['normal','dojo','free','zombie']){
    const picked=pickerOrder(db.families,{tierData,positionData},mode);
    for(const id of ['bibabo','shaipu'])assert.ok(picked.some(f=>f.id===id));
  }
  for(const id of ['bibabo','shaipu']){
    const family=db.families.find(f=>f.id===id);
    assert.equal(family.evolutions.length,4);
    for(const e of family.evolutions){assert.equal(e.nameEn,null);assert.equal(e.nameZhHans,null);}
    assert.ok(!read('data/tier-ratings.json').overall.byFamily[id]);
    assert.ok(globalThis.MONSABA_FAMILY.getFamilySearchAliases(family).includes(id==='shaipu'?'プランキー':'ビバボ'));
  }
});

const hikokoNames=['ヒココ','ヒコケコ','ヒコケコッコ','フェニコケコッコ'];
test('Hikoko has four stage-correct, attributed game images and no inferred names or rankings',async()=>{
  const manifest=read('data/wiki-tata-evidence-2026-11-20.json');
  const family=db.families.find(f=>f.id==='hikoko');
  assert.equal(family.attribute,'火');assert.deepEqual(family.evolutions.map(e=>e.name),hikokoNames);
  for(const prefix of ['', 'en/', 'zh-cn/']){
    const html=fs.readFileSync(new URL(`../${prefix}tata/hikoko/index.html`,import.meta.url),'utf8');
    for(const [index,name]of hikokoNames.entries()){assert(html.includes(name));assert(html.includes(`/assets/tata-wiki/hikoko/t${index+1}-512.webp`));}
    assert(!html.includes('href="https://w.atwiki.jp/monstersurvival/pages/189.html"'));
    assert(html.includes('data-name-status="pending"'));
  }
  assert.equal(manifest.records.length,4);assert.match(manifest.rightsNote,/not evidence of a general redistribution license/);
  for(const row of manifest.records){
    assert.equal(row.sourceUrl,'https://w.atwiki.jp/monstersurvival/pages/189.html');
    assert.equal(row.name,hikokoNames[row.stage-1]);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL('../'+row.originalPath,import.meta.url))).digest('hex'),row.sourceSha256);
    const form=stageImageFor(family,row.stage,new Map(images.families.map(f=>[f.familyId,f])));
    assert.equal(form.src,`/assets/tata-wiki/hikoko/t${row.stage}-512.webp`);assert.equal(form.sourceSha256,row.sourceSha256);
    const meta=await sharp(new URL('../'+form.src.slice(1),import.meta.url).pathname.replace(/^\/([A-Z]:)/,'$1')).metadata();
    assert.equal(meta.width,512);assert.equal(meta.height,512);assert.equal(meta.hasAlpha,true);
  }
  for(const form of family.evolutions){assert.equal(form.nameEn,null);assert.equal(form.nameZhHans,null);}
  assert(!read('data/tata-tier.json').families.some(f=>f.familyId==='hikoko'));
  assert(!read('data/zombie-rush/position-tiers.json').entries.some(e=>e.familyId==='hikoko'));
  const sources=read('data/tata-name-i18n-sources.json'),skills=read('data/tata-skills.json');
  assert.deepEqual(validateTataNameSources({source:sources,tatari:db,skills}).errors,[]);
  const bad=structuredClone(sources);bad.forms.find(f=>f.familyId==='hikoko').japaneseEvidence.sourceUrl='https://w.atwiki.jp/monstersurvival/pages/171.html';
  assert(validateTataNameSources({source:bad,tatari:db,skills}).errors.some(e=>e.includes('Invalid supplemental Tata evidence')));
});
test('all four Hikoko forms survive Team Builder sharing while legacy encodings stay identical',()=>{
  const chips=read('data/zombie-rush/chips.json').chips;
  for(const stage of [1,2,3,4]){
    const team=emptyTeam();team.mode='free';team.slots[0]={familyId:'hikoko',stage,playerId:1,level:3};
    assert.deepEqual(decodeTeam(encodeTeam(team,db.families,chips),db.families,chips).slots[0],team.slots[0]);
  }
  const old=emptyTeam();old.slots[0]={familyId:'takepanda',stage:4,playerId:1,level:3};
  assert.equal(encodeTeam(old,db.families,chips),encodeTeam(old,db.families.filter(f=>f.id!=='hikoko'),chips));
});
test('Tier Maker expands only opted-in stages and keeps every legacy card and draft ID',()=>{
  const original=db.families.filter(f=>f.id!=='hikoko');
  const roster=expandMakerStages(db.families),newCards=roster.filter(f=>f.makerFamilyId==='hikoko');
  assert.deepEqual(roster.filter(f=>!f.makerFamilyId).map(f=>f.id),original.map(f=>f.id));
  assert.deepEqual(newCards.map(f=>f.id),['hikoko','hikoko-t2','hikoko-t3','hikoko-t4']);
  assert.deepEqual(newCards.map(f=>globalThis.MONSABA_FAMILY.getFamilyDisplayName(f,'en')),hikokoNames);
  const ids=roster.map(f=>f.id);let state=createState();
  for(const card of newCards)state=updateState(state,{type:'move',categoryId:state.categories[0].id,tierId:state.categories[0].tiers[0].id,cardId:card.id},ids);
  state=updateState(state,{type:'move',categoryId:state.categories[0].id,tierId:state.categories[0].tiers[0].id,cardId:'takepanda'},ids);
  assert.deepEqual(parseState(JSON.stringify(state)),state);
  assert.deepEqual(state.categories[0].tiers[0].cards,['hikoko','hikoko-t2','hikoko-t3','hikoko-t4','takepanda']);
  assert.throws(()=>expandMakerStages([{...db.families.at(-1),tierMakerStages:[1,9]}]),/Unknown maker evolution/);
});
