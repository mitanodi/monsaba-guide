import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { pickerOrder } from '../team-builder/team-core.js';
import '../family-display.js';
const read=p=>JSON.parse(fs.readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const db=read('data/tatari.json'),images=read('data/tata-images.json');
const evidence=read('data/wiki-tata-evidence-2026-11-07.json');
test('new catalog pages show every stage and Wiki attribution in all site languages',()=>{
  for(const prefix of ['', 'en/', 'zh-cn/'])for(const id of ['bibabo','shaipu']){
    const html=fs.readFileSync(new URL(`../${prefix}tata/${id}/index.html`,import.meta.url),'utf8');
    for(const row of evidence.records.filter(r=>r.familyId===id)){
      assert.ok(html.includes(row.name));
      assert.ok(html.includes(`/assets/tata-wiki/${id}/t${row.stage}-512.webp`));
      assert.ok(html.includes(row.sourceUrl));
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
