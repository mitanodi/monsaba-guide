import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const inject=(file,html)=>{let s=read(file),a='<!-- SEP11:start -->',b='<!-- SEP11:end -->',block=a+html+b;s=s.includes(a)?s.replace(new RegExp(`${a}[\\s\\S]*?${b}`),block):s.replace('</main>',block+'</main>');write(file,s)};

const gift={
 'gift-codes/index.html':[['2026年8月','2026年9月'],['2026年8月30日','2026年9月11日'],['8コード','9コード'],['確認中を含む8コード','公開情報上9コード'],['最新追加 3コード','最新追加 ttukkapet26'],['undefined ×','クッキー ×']],
 'en/gift-codes/index.html':[['August 2026','September 2026'],['August 30, 2026','September 11, 2026'],['Eight Clash','Nine Clash'],['eight codes','nine codes'],['8 codes','9 codes'],['3 newly added codes','Newest: ttukkapet26'],['undefined ×','Cookie ×']],
 'zh-cn/gift-codes/index.html':[['2026年8月','2026年9月'],['2026年8月30日','2026年9月11日'],['8个Clash','9个Clash'],['以下8个','以下9个'],['共8个','共9个'],['最新增加3个代码','最新增加 ttukkapet26'],['undefined ×','曲奇 ×']]
};
for(const [file,reps] of Object.entries(gift)){let s=read(file);for(const [a,b] of reps)s=s.replaceAll(a,b);write(file,s)}

const content={
 ja:{
  'index.html':['2026年9月11日 最新情報','v0.47.1でヌスケ系、エーテリファル、ジャンガルパカを追加し、65系統・236体へ更新しました。ラフトレースは9月12日予定のユーザー報告として掲載し、詳細ルールは確認中です。<br><a href="/tata/nusuke/">ヌスケ系を見る</a> · <a href="/events/running-party/">ランニングパーティー攻略</a> · <a href="/gift-codes/">最新ギフトコード</a>'],
  'updates/index.html':['v0.47.1・9月11日反映','新タタと2体のT4、カーニバルフェス、ラフティング大会、釣り大会・アイランドトレジャー・ボスラリーの変更を反映しました。Season 2は次回アップデート予告として現行仕様と分離しています。<br><a href="/tata/nusuke/">ヌスケ系</a> · <a href="/events/carnival-fest/">カーニバルフェス</a> · <a href="/zombie-rush/">ゾンビラッシュ</a>'],
  'events/running-party/index.html':['次回テーマ：ラフトレース','ユーザー報告の開催予定日は2026年9月12日（Asia/Tokyo）です。告知上のテーマ名は「ラフティング大会」。従来と完全に同じルールか、時刻・終了日・対象サーバーは確認中です。'],
  'events/fishing-tournament/index.html':['v0.47.1の追加','シルバーサカナコイン2,000万獲得後に繰り返し報酬を追加。報酬内容と次の到達間隔は未確認です。'],
  'events/island-treasure/index.html':['v0.47.1の報酬・建物変更','MVP報酬へフェスボックス、初回獲得時にパーティホールを追加。バンケットハウスでは5日間有効なギフトボックスを共有でき、訪問者はランダムなビー玉を獲得します。期限切れ時は金レンガへ自動変換。実績展示を追加し、チームキルランキングのエアドロップ報酬は削除されました。変換レート・抽選範囲・訪問回数は未確認です。'],
  'boss-rally/index.html':['クッキーランキング報酬の変更','各ボスの全難易度クリアごとに、ランキングのクッキー報酬へ基本値の10%を加算（上限は基本値の50%）。複利ではありません。再クリア・リセット・過去クリア分は確認中です。'],
  'zombie-rush/index.html':['現行修正とSeason 2予告','現行更新はパクマ系専用スキルのエフェクト最適化と、一部特殊チップの繰り返し選択不具合修正です。性能変更とは扱いません。Season 2のスキル・チップ調整、ステータス確認、ランキングリセット、難易度調整、Season 1最高到達難易度の1つ前への引き継ぎは次回アップデート予告であり、現行仕様へ適用していません。']},
 en:{
  'en/index.html':['Latest information — September 11, 2026','Updated to 65 families and 236 forms with the Ringtail family, Morphanessa, and Blechlama. The September 12 Raft Race date is labeled as a user report; detailed rules remain pending.<br><a href="/en/tata/nusuke/">Ringtail family</a> · <a href="/en/events/running-party/">Marathon Party guide</a> · <a href="/en/gift-codes/">Gift codes</a>'],
  'en/updates/index.html':['v0.47.1 update reflected','Added the new family and two T4 forms plus official broad changes for Carnival Rush, Raft Race, Fishing Contest, Island Goldrush, and Boss Challenge. Season 2 remains clearly separated as a next-update preview.<br><a href="/en/tata/nusuke/">Ringtail family</a> · <a href="/en/events/carnival-fest/">Carnival Rush</a> · <a href="/en/zombie-rush/">Zombie Rush</a>'],
  'en/events/running-party/index.html':['Next theme: Raft Race','A user report schedules it for September 12, 2026 (Asia/Tokyo). The notice calls the theme Raft Race. Identical rules, times, servers, and rewards remain unverified.'],
  'en/events/fishing-tournament/index.html':['v0.47.1 addition','Recurring rewards were added after 20,000,000 Silver Fish Coins. Contents and the next interval remain unverified.'],
  'en/events/island-treasure/index.html':['v0.47.1 reward changes','MVP rewards add Festival Box and its first acquisition adds Party Hall. Banquet House shares five-day Gift Boxes; visitors receive random pinballs and expired boxes convert to Gold Bricks. Rates and limits remain unverified.'],
  'en/boss-rally/index.html':['Cookie ranking rewards','Clearing every difficulty for a boss adds 10% of the base ranking cookie reward, capped at 50%. This is additive, not compound; repeat and reset behavior remain unverified.'],
  'en/zombie-rush/index.html':['Current fixes and Season 2 preview','Pakuma-family effects were optimized and a repeated-selection bug affecting some special chips was fixed; these are not treated as balance changes. Season 2 details remain a next-update preview, not current implementation.']},
 zh:{
  'zh-cn/index.html':['2026年9月11日最新信息','新增干脆面系列、潋滟水蝶与一塌糊驼，现为65个系列、236个形态。9月12日Raft Race日期标注为用户报告，详细规则仍待确认。<br><a href="/zh-cn/tata/nusuke/">干脆面系列</a> · <a href="/zh-cn/events/running-party/">跑步派对攻略</a> · <a href="/zh-cn/gift-codes/">兑换码</a>'],
  'zh-cn/updates/index.html':['已反映v0.47.1更新','已加入新系列与两个T4，并同步嘉年华、Raft Race、钓鱼大赛、岛屿宝藏和首领挑战的已确认大项。Season 2仍作为下次更新预告，与当前规则分开。<br><a href="/zh-cn/tata/nusuke/">干脆面系列</a> · <a href="/zh-cn/events/carnival-fest/">嘉年华</a> · <a href="/zh-cn/zombie-rush/">僵尸突围</a>'],
  'zh-cn/events/running-party/index.html':['下次主题：Raft Race','用户报告计划于2026年9月12日（Asia/Tokyo）开始。规则是否完全相同、时间、服务器与奖励仍待确认。'],
  'zh-cn/events/fishing-tournament/index.html':['v0.47.1新增','取得2,000万银鱼币后新增重复奖励，内容与下一档间隔仍待确认。'],
  'zh-cn/events/island-treasure/index.html':['v0.47.1奖励变更','MVP奖励新增庆典箱，首次取得时另获派对大厅。宴会屋可分享有效5天的礼物箱，访客获得随机弹珠，过期后转为金砖。比例与次数仍待确认。'],
  'zh-cn/boss-rally/index.html':['曲奇排名奖励','每完成一个首领的全部难度，排名曲奇按基础值增加10%，上限50%，不是复利。重复通关与重置规则仍待确认。'],
  'zh-cn/zombie-rush/index.html':['当前修复与Season 2预告','当前更新仅优化贪吃熊系列特效并修复部分特殊芯片重复选择问题，不视为数值调整。Season 2仍属下次更新预告。']}
};
for(const locale of Object.values(content))for(const [file,[title,text]] of Object.entries(locale))inject(file,`<section class="wrap static-section"><h2 class="page-h2">${title}</h2><p>${text}</p></section>`);
console.log('2026-09-11 page notices generated.');
