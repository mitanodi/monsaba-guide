import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const ignored=new Set(['.git','.vercel','node_modules','promo']);
const htmlFiles=[],assetFiles=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.html'))htmlFiles.push(full);else if(/\.(?:css|js)$/.test(entry.name))assetFiles.push(full)}}
walk(root);
const hash=createHash('sha256');
for(const file of assetFiles.sort()){
  hash.update(path.relative(root,file).replaceAll('\\','/'));
  hash.update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'));
}
const version=hash.digest('hex').slice(0,12);
let changed=0;
for(const file of htmlFiles){const source=fs.readFileSync(file,'utf8');const next=source.replace(/((?:href|src)="(?:\.\/|\.\.\/|\/)[^"?]+\.(?:css|js))(?:\?v=[^"#]*)?("(?:\s|>))/g,`$1?v=${version}$2`);if(next!==source){fs.writeFileSync(file,next);changed++}}
fs.writeFileSync(path.join(root,'data','asset-build.json'),`${JSON.stringify({version,generatedAt:'2026-08-28'},null,2)}\n`);
console.log(`asset version ${version}: ${changed} HTML`);
