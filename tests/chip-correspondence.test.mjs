import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import test from 'node:test';
import sharp from 'sharp';
import {emptyTeam,encodeTeam,decodeTeam,saveDraft,loadDraft,saveTeamList,loadTeams} from '../team-builder/team-core.js';
const root=path.resolve(import.meta.dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p));
const chips=JSON.parse(read('data/zombie-rush/chips.json')).chips;
const audit=JSON.parse(read('docs/evidence/chip-correspondence-2026-10-06.json'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const correctedIds=['maverick','back-shooter','rear-support','upgrade','shuffle','adverse-attribute','and-one','undeployed-tatari'];
test('all 49 chips retain baseline gameplay and saved-team identifiers',()=>{
 assert.equal(chips.length,49);assert.equal(new Set(chips.map(c=>c.id)).size,49);
 assert.equal(hash(JSON.stringify(chips.map(({icon,iconStatus,...chip})=>chip))),'52fb9307979527c701bb92983e044ad31aebd1f6bc1d8512a01a7869c849427e');
});
test('all 49 visually reviewed Wiki cards retain original download hashes and native proportions',async()=>{
 const hashes=new Set();
 for(const chip of chips){
  const row=audit.rows.find(r=>r.id===chip.id),source=row.imageSource;
  assert.equal(source.sourceType,'public_wiki');assert.equal(source.httpStatus,200);
  assert.equal(source.imageUrl,row.wikiImageUrl);assert.equal(source.thirdPartyLicenseStatus,'unconfirmed');
  assert.equal(source.transformation,'none; original WebP bytes');
  const bytes=read(chip.icon.slice(1)),sha=hash(bytes);
  assert.equal(sha,source.sha256,chip.id);assert.equal(sha,row.afterSha256,chip.id);
  assert.equal(path.basename(chip.icon),`${chip.id}-wiki-${sha.slice(0,12)}.webp`);
  const meta=await sharp(bytes).metadata();assert(meta.width>96,chip.id);assert(meta.height>meta.width,chip.id);
  assert.equal(chip.iconStatus,'verified');assert.equal(row.nameComparison,'matched');
  hashes.add(sha);
 }
 assert.equal(hashes.size,49,'no duplicate artwork assigned to separate chip IDs');
});
test('eight original errors are corrected, 41 prior matches maintained, no pending placeholder remains',()=>{
 assert.deepEqual(audit.rows.filter(r=>r.artworkComparison==='corrected-public-wiki-asset').map(r=>r.id),correctedIds);
 assert.equal(audit.rows.filter(r=>r.artworkComparison==='matched-public-wiki-asset').length,41);
 assert.equal(chips.filter(c=>c.iconStatus==='pending'||c.icon.includes('pending')).length,0);
 assert.deepEqual(audit.rows.map(r=>r.id),chips.map(c=>c.id));
 assert.equal(audit.rows.filter(r=>r.effectComparison.startsWith('numeric')).length,7);
});
test('card display contains original artwork without stretching or editing the downloaded asset',()=>{
 assert.match(read('assets/aug30-update.css').toString(),/\.chip-card img\{[^}]*object-fit:contain/);
 assert.match(read('my-tools.css').toString(),/\.formation-chip-option img\s*\{[^}]*object-fit: contain/);
});
test('every chip ID survives shared URL, draft and saved-team round trips after image replacement',()=>{
 const families=JSON.parse(read('data/tatari.json')).families;
 for(let start=0;start<chips.length;start+=3){
  const team=emptyTeam();team.chips[1]=chips.slice(start,start+3).map(c=>c.id);
  const values=new Map(),storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,v)};
  saveDraft(storage,team,families);saveTeamList(storage,[team],families);
  for(const restored of [decodeTeam(encodeTeam(team,families,chips),families,chips),loadDraft(storage,families),loadTeams(storage,families)[0]])assert.deepEqual(restored.chips[1],team.chips[1]);
 }
});
