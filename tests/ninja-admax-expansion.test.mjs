import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {load} from 'cheerio';

const root=path.resolve(import.meta.dirname,'..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const ignored=new Set(['.git','.github','.vercel','node_modules','en','zh-cn','promo','assets','data','scripts','docs']);
const walk=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(entry=>ignored.has(entry.name)?[]:entry.isDirectory()?walk(path.join(dir,entry.name)):entry.name.endsWith('.html')?[path.posix.join(dir,entry.name)]:[]);
const route=file=>`/${file.split(path.sep).join('/').replace(/index\.html$/,'')}`;
const tags=['35f048413141014f4de639f6587f7d7e','16ba3b25ba46308a360f7d2e14b3721c','1be47573fb894fc05b65e54855cd8d50','1b95e5798b6c1c59a1959f7fa068c676','a29aa98a252af3196ac97a024e430430','0dfce2d7520a570ab34d238ddf655603'];

test('Japanese indexable content has a reversible AdMax plan capped at three slots',()=>{
  const files=walk('.').filter(file=>{const html=read(file);return !/noindex/i.test((html.match(/<meta name="robots"[^>]*>/i)||[''])[0])&&!file.endsWith('404.html');});
  assert.ok(files.length>100,'日本語公開ページの走査件数');
  for(const file of files){
    const html=read(file),$=load(html),slots=$('.ninja-admax-slot'),page=route(file),ids=slots.toArray().map(el=>$(el).attr('data-admax-slot'));
    assert.ok(slots.length<=3,`${file}: AdMaxは最大3枠`);
    assert.equal(new Set(ids).size,ids.length,`${file}: slot ID重複`);
    for(const position of ['TOP','MID','BOTTOM'])assert.ok(slots.filter(`[data-admax-position="${position}"]`).length<=1,`${file}: ${position}位置の重複`);
    assert.ok(slots.length>=1,`${file}: 日本語公開コンテンツに枠がない`);
    slots.each((_,el)=>{assert.equal($(el).find('.ninja-admax-label').text(),'広告',file);assert.ok($(el).attr('data-admax-slot'),file);});
  }
});

test('new TOP/MID/BOTTOM tags are used only by Japanese expansion slots',()=>{
  const japanese=walk('.').map(read).join('\n');for(const tag of tags)assert.match(japanese,new RegExp(tag));
  for(const locale of ['en','zh-cn']){
    const files=[];const collect=dir=>fs.readdirSync(path.join(root,dir),{withFileTypes:true}).forEach(e=>e.isDirectory()?collect(path.posix.join(dir,e.name)):e.name.endsWith('.html')&&files.push(path.posix.join(dir,e.name)));collect(locale);
    for(const file of files){const html=read(file);assert.doesNotMatch(html,/ninja-admax-slot/);for(const tag of tags)assert.doesNotMatch(html,new RegExp(tag),file);}
  }
});

test('interactive tools keep AdMax outside their operating surfaces',()=>{
  const feeding=load(read('feeding/index.html'));assert.equal(feeding('main .ninja-admax-slot').length,0);
  const builder=load(read('team-builder/index.html'));assert.equal(builder('#team-settings .ninja-admax-slot,[data-team-builder] .ninja-admax-slot').length,0);
});
