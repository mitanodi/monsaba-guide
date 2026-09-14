import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';import {createHash}from'node:crypto';
const root=path.resolve(import.meta.dirname,'..');const dir=path.join(root,'assets/astra');fs.mkdirSync(dir,{recursive:true});const rows=[];
async function variant(source,dest,width){const buffer=await sharp(path.join(root,source)).resize({width,withoutEnlargement:true}).webp({quality:78,effort:6}).toBuffer();fs.writeFileSync(path.join(dir,dest),buffer);rows.push({file:`assets/astra/${dest}`,width,bytes:buffer.length,source,sourceSha256:createHash('sha256').update(fs.readFileSync(path.join(root,source))).digest('hex')});}
for(const width of [120,240,360,600])await variant('assets/heroes/top-main.webp',`hero-${width}.webp`,width);
const data=JSON.parse(fs.readFileSync(path.join(root,'data/tata-images.json')));
for(const family of data.families)if(family.stage1?.status==='verified')await variant(family.stage1.src.slice(1),`${family.familyId}-128.webp`,128);
fs.writeFileSync(path.join(root,'docs/astra-redesign/image-derivatives.json'),JSON.stringify(rows,null,2)+'\n');console.log('Astra lossily resized official derivatives:',rows.length,'original assets unchanged');
