import fs from 'node:fs';
import assert from 'node:assert/strict';
const file='data/zombie-rush/chips.json',data=JSON.parse(fs.readFileSync(file,'utf8'));
const chip=data.chips.find(c=>c.id==='little-adult');assert(chip);
if(chip.conditionSource?.sourceType!=='user_confirmation'){
 chip.conditionHistory={previousConditions:chip.conditions,previousVerificationNote:chip.verificationNote};
 chip.conditions={status:'user_confirmed',targetMaxLevel:5,targetMaxLevelInclusive:true};
 chip.conditionSource={sourceType:'user_confirmation',confirmedAt:'2026-11-22',scope:'targetMaxLevel',statement:'小さな大人はレベル５以下対象だよ',officialConfirmation:false};
 chip.effect={ja:'自分のLv.5以下のタタの攻撃力・防御力・最大HPが30%増加する。',en:'Your Tatari at Lv.5 or below gain 30% ATK, DEF and max HP.','zh-CN':'你的Lv.5及以下塔塔攻击力、防御力及最大生命值提高30%。'};
 delete chip.verificationNote;
 fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 const p='data/zombie-rush/chip-supplement-2026-11-22.json',e=JSON.parse(fs.readFileSync(p,'utf8')),row=e.records.find(c=>c.id===chip.id);
 row.previousConditionStatus=row.conditionStatus;row.conditionStatus='user_confirmed';row.conditionSource=chip.conditionSource;
 fs.writeFileSync(p,JSON.stringify(e,null,2)+'\n');
}
console.log('小さな大人: Lv.5 inclusive, confirmed by user; prior evidence retained.');
