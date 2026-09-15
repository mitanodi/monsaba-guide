import fs from 'node:fs';
import path from 'node:path';
import postcss from 'postcss';
import {transform} from 'lightningcss';
const root=path.resolve(import.meta.dirname,'..');
const source=fs.readFileSync(path.join(root,'styles/astra.pcss'),'utf8').replace(/\r\n/g,'\n');
const ast=postcss.parse(source),original=Buffer.byteLength(source);
const context=node=>{const parts=[];for(let p=node.parent;p&&p.type!=='root';p=p.parent)parts.unshift(`${p.name} ${p.params}`);return parts.join('|');};
// Remove only declarations guaranteed to be superseded under exactly the same
// selector and conditional context. Preserve shorthand fallbacks and cascade order.
const latest=new Map();let overwritten=0;
const rules=[];ast.walkRules(rule=>rules.push(rule));
for(const rule of rules.reverse())for(const decl of [...rule.nodes].reverse()){
  if(decl.type!=='decl')continue;
  const scoped=rule.selector.startsWith('body[data-astra] ');
  const key=`${context(rule)}|${rule.selector.replace(/^body\[data-astra\] /,'')}|${decl.prop}`;
  const next=latest.get(key);
  if(next&&(next.important||!decl.important)&&(!scoped||next.scoped||next.important&&!decl.important)){decl.remove();overwritten++;}
  else latest.set(key,{important:decl.important,scoped});
}
ast.walkComments(c=>c.remove());ast.walkRules(r=>{if(!r.nodes.length)r.remove();});
const group=selector=>{
  if(/formation-|team-|astra-(mode|settings|chip|player)-/.test(selector))return 'team';
  if(/calendar-/.test(selector)||selector.includes('/events/calendar/'))return 'calendar';
  if(/community-|astra-read-only/.test(selector))return 'community';
  if(/astra-(home|catalog|compact|today|schedule|steps|step-number|journey)|catalog-card/.test(selector))return 'home';
  if(/tata-character|tata-quick|tata-stage|tata-hero|tata-evolution|mode-rating|evo-card/.test(selector))return 'detail';
  if(/tata-tier|astra-tier/.test(selector))return 'tier';
  return 'common';
};
const outputs=new Map(['common','home','team','calendar','community','detail','tier'].map(g=>[g,postcss.root()]));
function distribute(nodes,parents=[]){for(const node of nodes){
  if(node.type==='atrule'&&node.nodes){distribute(node.nodes,[...parents,node]);continue;}
  const buckets=new Map();
  if(node.type==='rule')for(const selector of node.selectors){const g=group(selector);if(!buckets.has(g))buckets.set(g,[]);buckets.get(g).push(selector);}
  else buckets.set('common',null);
  for(const [g,selectors] of buckets){let out=outputs.get(g);for(const parent of parents){let wrap=out.last;if(wrap?.type!=='atrule'||wrap.name!==parent.name||wrap.params!==parent.params){wrap=parent.clone({nodes:[]});out.append(wrap);}out=wrap;}
    out.append(selectors?node.clone({selector:selectors.join(',')}):node.clone());
  }
}}
distribute(ast.nodes);
const report={sourceBytes:original,overwrittenDeclarationsRemoved:overwritten,files:{}};
for(const [g,tree]of outputs){const file=g==='common'?'astra.css':`astra-${g}.css`;const code=transform({filename:file,code:Buffer.from(tree.toString()),minify:true,targets:{chrome:111<<16,safari:16<<16}}).code;fs.writeFileSync(path.join(root,file),code);report.files[file]=code.length;}
report.totalBytes=Object.values(report.files).reduce((a,b)=>a+b,0);
fs.writeFileSync(path.join(root,'docs/astra-redesign/css-finalization.json'),JSON.stringify(report,null,2)+'\n');
console.log(report);
