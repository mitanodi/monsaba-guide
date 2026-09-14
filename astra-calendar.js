import {calendarState} from './calendar/calendar-core.js';
const target=document.querySelector('[data-astra-schedule]');
const locale=document.body.dataset.locale||'ja',prefix=locale==='en'?'/en':locale==='zh-CN'?'/zh-cn':'';
const copy=locale==='en'?['Live now','Next event','Next Boss Rally','Not confirmed']:locale==='zh-CN'?['进行中','下一个活动','下一场Boss Rally','待确认']:['開催中','次のイベント','次のボスラリー','確認待ち'];
const format=n=>new Intl.DateTimeFormat(locale==='en'?'en-GB':locale==='zh-CN'?'zh-CN':'ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(n);
if(target)fetch('/data/calendar-config.json').then(r=>{if(!r.ok)throw Error('calendar');return r.json();}).then(config=>{
  const name=e=>e?.name?.[locale]||e?.name?.ja||copy[3];
  function render(){const state=calendarState(new Date(),config);const rows=[{label:copy[0],name:name(state.team.event),when:`→ ${format(state.team.end)} JST`,href:state.team.event.href},{label:copy[1],name:name(state.team.nextEvent),when:`${format(state.team.end)} JST →`,href:state.team.nextEvent.href},{label:copy[2],name:state.boss.scheduled?name(state.boss.nextBoss):copy[3],when:state.boss.scheduled?`${format(state.boss.end)} JST →`:copy[3],href:'/boss-rally/'}];target.replaceChildren(...rows.map(row=>{const a=document.createElement('a');a.href=prefix+row.href;for(const [tag,text] of [['span',row.label],['b',row.name],['small',row.when]]){const element=document.createElement(tag);element.textContent=text;a.append(element);}return a;}));}
  render();setInterval(render,60000);
}).catch(()=>{/* Static calendar link remains usable if the request fails. */});
