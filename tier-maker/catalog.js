// Families opt in to additional stage cards. Every existing T1 card keeps its ID.
export function expandMakerStages(families) {
  const cards=families.flatMap(family=>{
    if(!family.tierMakerStages)return [family];
    return family.tierMakerStages.map(stage=>{
      const evolution=family.evolutions.find(form=>form.stage===stage);
      if(!evolution)throw new Error('Unknown maker evolution stage');
      return {...family,id:stage===1?family.id:`${family.id}-t${stage}`,makerFamilyId:family.id,makerStage:stage,evolutions:[evolution],searchAliases:[family.id,family.familyName,evolution.name,evolution.nameEn,evolution.nameZhHans].filter(Boolean)};
    });
  });
  if(new Set(cards.map(card=>card.id)).size!==cards.length)throw new Error('Duplicate maker card ID');
  return cards;
}
