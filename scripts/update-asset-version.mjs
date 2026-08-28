import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const root=path.resolve(import.meta.dirname,'..');
const ignored=new Set(['.git','.vercel','node_modules','promo']);
const htmlFiles=[],assetFiles=[];
const retrySignal=new Int32Array(new SharedArrayBuffer(4));
function read(file){for(let attempt=0;attempt<12;attempt++){try{return fs.readFileSync(file,'utf8')}catch(error){if(!['EBUSY','EPERM'].includes(error.code)||attempt===11)throw error;Atomics.wait(retrySignal,0,0,40*(attempt+1))}}}
function write(file,value){for(let attempt=0;attempt<12;attempt++){try{return fs.writeFileSync(file,value)}catch(error){if(!['EBUSY','EPERM'].includes(error.code)||attempt===11)throw error;Atomics.wait(retrySignal,0,0,40*(attempt+1))}}}
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(ignored.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.name.endsWith('.html'))htmlFiles.push(full);else if(/\.(?:css|js)$/.test(entry.name))assetFiles.push(full)}}
walk(root);
const hash=createHash('sha256');
for(const file of assetFiles.sort()){
  hash.update(path.relative(root,file).replaceAll('\\','/'));
  hash.update(read(file).replace(/\r\n/g,'\n'));
}
const version=hash.digest('hex').slice(0,12);
let changed=0;
for(const file of htmlFiles){const source=read(file);const next=source.replace(/((?:href|src)="(?:\.\/|\.\.\/|\/)[^"?]+\.(?:css|js))(?:\?v=[^"#]*)?("(?:\s|>))/g,`$1?v=${version}$2`);if(next!==source){write(file,next);changed++}}
write(path.join(root,'data','asset-build.json'),`${JSON.stringify({version,generatedAt:'2026-08-28'},null,2)}\n`);
console.log(`asset version ${version}: ${changed} HTML`);
