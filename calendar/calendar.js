import {calendarState,dateKey,islandAt,jstParts,monthDays,teamEventAt} from './calendar-core.js';

const locale=document.body.dataset.locale||'ja';
const localeKey=locale==='zh-CN'?'zh-CN':locale.startsWith('en')?'en':'ja';
const copy={
  ja:{month:'{y}年{m}月',heading:'イベントカレンダー',intro:'チームイベント等は日本時間09:00、ボスラリーは日付（00:00）を境界として、開催中・次回・任意月の予定を確認できます。',prev:'前の月',next:'次の月',today:'今月',team:'チームイベント',island:'アイランドトレジャー／ゴールドラッシュ',boss:'ボスラリー',live:'開催中',nextUp:'次回',day:'{n}日目',final:'最終日',recruit:'チーム募集・編成日',recruitShort:'チーム募集',battle:'本戦 Day{n}',aggregate:'最終日・集計日',switch:'次の切り替え',unknownCycle:'4週サイクルの第1週アンカー確認待ち',unknownBoss:'2日周期の切り替えアンカー確認待ち',observed:'現在確認済み',week:['日','月','火','水','木','金','土'],note:'※チームイベント等は日本時間09:00、ボスラリーは00:00に切り替わります。未確認の周期は推測表示しません。',error:'カレンダーを読み込めませんでした。'},
  en:{month:'{m}/{y}',heading:'Event Calendar',intro:'See what is live, what comes next, and any month at a glance. Team events use 09:00 JST; Boss Rally follows calendar dates from 00:00 JST.',prev:'Previous',next:'Next',today:'This month',team:'Team Event',island:'Island Treasure / Gold Rush',boss:'Boss Rally',live:'Live',nextUp:'Next',day:'Day {n}',final:'Final day',recruit:'Team recruitment & setup',recruitShort:'Team recruitment',battle:'Battle Day {n}',aggregate:'Final day / tally',switch:'Next change',unknownCycle:'Week 1 anchor for the four-week cycle is not confirmed',unknownBoss:'Two-day boss change anchor is not confirmed',observed:'Observed now',week:['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],note:'Team events use 09:00 JST; Boss Rally changes at 00:00 JST. Unconfirmed cycles are never guessed.',error:'Could not load the calendar.'},
  'zh-CN':{month:'{y}年{m}月',heading:'活动日历',intro:'团队活动以日本时间09:00为分界，Boss Rally则按00:00的自然日期轮换，可查看当前、下一项及任意月份的安排。',prev:'上个月',next:'下个月',today:'本月',team:'团队活动',island:'岛屿宝藏／淘金热',boss:'Boss Rally',live:'进行中',nextUp:'下次',day:'第{n}天',final:'最后一天',recruit:'组队及编成日',recruitShort:'团队招募',battle:'正赛第{n}天',aggregate:'最后一天・结算日',switch:'下次切换',unknownCycle:'四周周期的第1周锚点尚待确认',unknownBoss:'两天Boss轮换锚点尚待确认',observed:'当前已确认',week:['日','一','二','三','四','五','六'],note:'团队活动于日本时间09:00切换，Boss Rally于00:00切换。未确认的周期不会推测显示。',error:'无法加载日历。'}
}[localeKey];
const t=(text,values={})=>Object.entries(values).reduce((out,[key,value])=>out.replace(`{${key}}`,value),text);
const name=item=>item?.name?.[localeKey]||item?.name?.ja||item?.id||'';
const localHref=href=>localeKey==='ja'?href:`/${localeKey==='zh-CN'?'zh-cn':'en'}${href}`;
const formatDate=value=>new Intl.DateTimeFormat(localeKey==='zh-CN'?'zh-CN':localeKey==='en'?'en-US':'ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));
let shown;
let config;

function mount(){
  const section=document.createElement('section');section.className='wrap static-section event-calendar';section.id='event-calendar';section.innerHTML=`<div class="calendar-heading"><h2>${copy.heading}</h2><p>${copy.intro}</p></div><div id="calendar-current" class="calendar-now-grid" aria-live="polite"></div><div class="calendar-toolbar"><div class="calendar-controls"><button id="calendar-prev" type="button" aria-label="${copy.prev}">‹</button><h3 id="calendar-month-title"></h3><button id="calendar-next" type="button" aria-label="${copy.next}">›</button></div><button id="calendar-today" class="calendar-today-button" type="button">${copy.today}</button></div><div class="calendar-scroll"><div id="calendar-weekdays" class="calendar-grid calendar-weekdays"></div><div id="calendar-days" class="calendar-grid calendar-days"></div></div><p class="calendar-note">${copy.note}</p>`;
  const hero=document.querySelector('.page-hero');if(hero)hero.insertAdjacentElement('afterend',section);else document.querySelector('main')?.prepend(section);
  const legacyHeadings=['コミュニティ確認の基本ローテーション','Community-confirmed baseline rotation','社区确认的基本轮换'];document.querySelectorAll('.static-section h2').forEach(heading=>{if(legacyHeadings.includes(heading.textContent.trim()))heading.closest('.static-section')?.remove();});
}

function currentCards(now){
  const state=calendarState(now,config);const observation=config.bossRotationConfig.currentObservation;const boss=state.boss.scheduled?state.boss.boss:config.bossRotationConfig.sequence.find(item=>item.id===observation?.currentBoss);const nextBoss=state.boss.scheduled?state.boss.nextBoss:config.bossRotationConfig.sequence.find(item=>item.id===observation?.nextBoss);
  const teamDay=state.team.isFinalDay?copy.final:t(copy.day,{n:state.team.day});
  const islandLabel=state.island.phase==='recruitment'?copy.recruit:(state.island.isFinalDay?copy.aggregate:t(copy.battle,{n:state.island.day}));
  document.querySelector('#calendar-current').innerHTML=`
    <article class="calendar-now-card"><h3>${copy.team}</h3><span class="calendar-live">${copy.live}</span><p><strong>${name(state.team.event)}</strong> · ${teamDay}</p><p class="calendar-next-switch">${copy.switch}: ${formatDate(state.team.end)}</p>${state.showNextTeam?`<p>${copy.nextUp}: <strong>${name(state.team.nextEvent)}</strong></p>`:''}</article>
    <article class="calendar-now-card"><h3>${copy.island}</h3><span class="calendar-live">${copy.live}</span><p><strong>${islandLabel}</strong></p><p class="calendar-next-switch">${copy.switch}: ${formatDate(state.island.end)}</p><span class="calendar-pending">${copy.unknownCycle}</span></article>
    <article class="calendar-now-card"><h3>${copy.boss}</h3><span class="calendar-live">${state.boss.scheduled?copy.live:copy.observed}</span><p><strong>${name(boss)}</strong>${state.boss.scheduled?` · ${t(copy.day,{n:state.boss.day})}`:''}</p><p>${copy.nextUp}: <strong>${name(nextBoss)}</strong></p>${state.boss.scheduled?`<p class="calendar-next-switch">${copy.switch}: ${formatDate(state.boss.end)}</p>`:`<span class="calendar-pending">${copy.unknownBoss}</span>`}</article>`;
}
function renderMonth(now=new Date()){
  const [year,month]=shown;document.querySelector('#calendar-month-title').textContent=t(copy.month,{y:year,m:month});
  document.querySelector('#calendar-weekdays').innerHTML=copy.week.map(day=>`<div class="calendar-weekday">${day}</div>`).join('');
  const todayKey=dateKey(now);const liveKey=dateKey(calendarState(now,config).gameDayStart);
  document.querySelector('#calendar-days').innerHTML=monthDays(year,month).map(day=>{
    const key=`${day.year}-${String(day.month).padStart(2,'0')}-${String(day.day).padStart(2,'0')}`;const team=teamEventAt(day.start+1,config);const island=islandAt(day.start+1,config);const teamDay=team.isFinalDay?copy.final:t(copy.day,{n:team.day});const islandLabel=island.phase==='recruitment'?copy.recruitShort:(island.isFinalDay?copy.aggregate:t(copy.battle,{n:island.day}));
    const bossState=calendarState(day.start+1,config).boss;const boss=bossState.scheduled?bossState.boss:(key===liveKey&&config.bossRotationConfig.currentObservation?config.bossRotationConfig.sequence.find(item=>item.id===config.bossRotationConfig.currentObservation.currentBoss):null);
    return `<article class="calendar-day${day.inMonth?'':' is-outside'}${key===todayKey?' is-today':''}" data-date="${key}"><div class="calendar-date"><span>${day.day}</span>${key===liveKey?`<span class="calendar-live">${copy.live}</span>`:''}</div><a class="calendar-entry team" href="${localHref(team.event.href)}"><strong>${name(team.event)}</strong><span class="${team.isFinalDay?'is-final':''}">${teamDay}</span></a><span class="calendar-entry island"><strong>${copy.island}</strong><span class="${island.isFinalDay?'is-final':''}">${islandLabel}</span></span>${boss?`<span class="calendar-entry boss"><strong>${copy.boss}</strong><span>${name(boss)}${bossState.scheduled?` · ${t(copy.day,{n:bossState.day})}`:''}</span></span>`:''}</article>`;
  }).join('');
}
function changeMonth(delta){shown=[shown[0],shown[1]+delta];if(shown[1]<1)shown=[shown[0]-1,12];if(shown[1]>12)shown=[shown[0]+1,1];renderMonth();}
async function init(){
  mount();
  try{const response=await fetch('/data/calendar-config.json',{cache:'no-cache'});if(!response.ok)throw Error('CONFIG');config=await response.json();const now=new Date();const p=jstParts(now);shown=[p.year,p.month];currentCards(now);renderMonth(now);document.querySelector('#calendar-prev').addEventListener('click',()=>changeMonth(-1));document.querySelector('#calendar-next').addEventListener('click',()=>changeMonth(1));document.querySelector('#calendar-today').addEventListener('click',()=>{const current=jstParts(new Date());shown=[current.year,current.month];renderMonth();});setInterval(()=>{const current=new Date();currentCards(current);renderMonth(current);},60000);}catch{document.querySelector('#calendar-current').innerHTML=`<p class="calendar-error">${copy.error}</p>`;}
}
init();
