const invisibleCharacters = /[\u200B-\u200D\u2060\uFEFF]/g;

export const translationQuality = Object.freeze({
  en: {
    banned: [
      /MNSB[A-Z0-9_]+/i,
      /\b\d+ bodies\b/i,
      /\bTatari strains?\b/i,
      /\bPicture book order\b/i,
      /\b(?:picture book|illustrated encyclopedia)\b/i,
      /\b(?:organization memo|organization manufacturer|formation maker|frame formation)\b/i,
      /\bHandheld management\b/i,
      /\bRegistration Tatari\b/i,
      /\bStrategy Consultation Center\b/i,
      /\bevaluation by application\b/i,
      /\bStrongest Tier\b/i,
      /\b(?:63|12|13) systems\b/i,
      /\b(?:63|12|13) strains\b/i,
      /\bUnique organization\b/i,
      /\bRegistration role\b/i,
      /Clash of Critters\s*\(Clash of Critters\)/i
    ]
  },
  'zh-CN': {
    banned: [
      /MNSB[A-Z0-9_]+/i,
      /图画书订购|图画书|录音状态|登记菌株|手持式管理|组织备忘录|策略咨询中心|要提出的候选人/,
      /(?:63|12|13)\s*个?\s*(?:Tatari)?\s*(?:株|系统|菌株)/,
      /224\s*个?.{0,4}(?:本体|尸体)/,
      /(?:阵型制作者|框架阵型|组织制造商)/,
      /(?:本网站的独特组织|下一个提出的候选人|750\s*具尸体)/,
      /Clash of Critters\s*[（(]Clash of Critters[）)]/
    ]
  }
});

const replaceAllInsensitive = (value, search, replacement) => value.replace(new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), replacement);

function polishEnglish(value, source) {
  let result = value
    .replace(/MNSB(?:BDBBRANDX|DBBRANDX|BRANDX|DBGAME|GAME)/g, 'Clash of Critters Guide DB')
    .replace(/\b(?:Tatas|Tataris)\b/g, 'Tatari')
    .replace(/\bStrategy Consultation Center\b/gi, 'Guide Assistant')
    .replace(/\bstrategy consultation center\b/gi, 'Guide Assistant')
    .replace(/\bformation maker\b/gi, 'Team Builder')
    .replace(/\bframe formation(?:s)?\b/gi, 'slot team')
    .replace(/\bHandheld Tata Management\b/gi, 'Tatari Roster')
    .replace(/\bHandheld management\b/gi, 'Roster management')
    .replace(/\brecording status\b/gi, 'database coverage')
    .replace(/\bRegistration Tatari\b/gi, 'Tatari in Database')
    .replace(/\bevaluation by application\b/gi, 'ratings by game mode')
    .replace(/\bMy Clash of Critters\b/g, 'My Monsaba')
    .replace(/Clash of Critters's\b/g, 'Clash of Critters')
    .replace(/Clash of Critters\s*\(Clash of Critters\)/g, 'Clash of Critters');

  if (/系(?:統)?/.test(source)) {
    result = result
      .replace(/\bstrain(s)?\b/gi, (_, plural) => plural ? 'families' : 'family')
      .replace(/\bsystem(s)?\b/gi, (_, plural) => plural ? 'families' : 'family')
      .replace(/\blineage(s)?\b/gi, (_, plural) => plural ? 'families' : 'family')
      .replace(/\bseries\b/gi, 'family');
  }
  if (source.includes('図鑑')) {
    result = result
      .replace(/\b(?:illustrated encyclopedia|picture book)\b/gi, 'Tatari Database')
      .replace(/Tatari Database order/gi, 'Database order');
  }
  if (source.includes('攻略相談')) {
    result = result
      .replace(/Consult this Tatari at the Guide Assistant/gi, 'Ask the Guide Assistant about this Tatari')
      .replace(/Consult at the Guide Assistant/gi, 'Open the Guide Assistant')
      .replace(/Consult the Guide Assistant/gi, 'Open the Guide Assistant')
      .replace(/Consultation (?:on|about) the next evolution from/gi, 'Ask about the next evolution from')
      .replace(/Consult about the next evolution/gi, 'Plan the next evolution');
  }
  if (source.includes('編成')) {
    result = result
      .replace(/\borganization memos?\b/gi, 'team builds')
      .replace(/\borganization data\b/gi, 'team data')
      .replace(/\borganization details\b/gi, 'team details')
      .replace(/\borganization manufacturer\b/gi, 'Team Builder')
      .replace(/\bconfiguration manufacturer\b/gi, 'Team Builder')
      .replace(/\bsaved configuration\b/gi, 'saved teams')
      .replace(/\borganization\b/gi, 'team');
  }
  if (source.includes('手持ち')) {
    result = result
      .replace(/\bhandheld\b/gi, 'roster')
      .replace(/\binventory\b/gi, 'roster')
      .replace(/\bthe existing\b/gi, 'your roster');
  }
  if (source.includes('端末')) result = result.replace(/\bterminal\b/gi, 'device');
  if (source.includes('収録')) result = result.replace(/\brecording\b/gi, 'database coverage');
  if ((source.includes('タタ') || source.includes('体')) && !/ラウンド|敵/.test(source)) {
    result = result
      .replace(/\b(\d+) bodies\b/gi, '$1 Tatari')
      .replace(/\btwo bodies\b/gi, 'two Tatari')
      .replace(/\b(first|second) bod(?:y|ies)\b/gi, '$1 Tatari')
      .replace(/\bthese two bodies\b/gi, 'these two Tatari');
  }
  if (/ラウンド|敵/.test(source)) result = result.replace(/\b(\d+) bodies\b/gi, '$1 enemies');

  const preferred = new Map([
    ['63 strains / 224 bodies', '63 families / 224 Tatari'],
    ['63 families / 224 bodies', '63 families / 224 Tatari'],
    ['View evaluation by application', 'View ratings by game mode'],
    ['Search for the next candidate to raise', 'Find your next Tatari to build'],
    ['View list of 63 families', 'Browse all 63 families'],
    ['If you are lost, please contact the Guide Assistant', 'Not sure what to do? Try the Guide Assistant'],
    ['Friend recruitment bulletin board', 'Friend Recruitment Board'],
    ['Order of most evolutionary stages', 'Most evolution stages'],
    ['Strongest Tier', 'Tier List'],
    ['Picture Book Order', 'Database order'],
    ['Picture book order', 'Database order'],
    ['Registration strain', 'Families in Database'],
    ['Registration strains', 'Families in Database']
  ]);
  for (const [bad, good] of preferred) result = replaceAllInsensitive(result, bad, good);
  const roleTerms = new Map([
    ['範囲持続火力', 'sustained AoE damage'], ['広範囲火力', 'wide-area damage'], ['範囲火力', 'AoE damage'],
    ['遠距離火力', 'ranged damage'], ['近距離火力', 'melee damage'], ['序盤火力', 'early-game damage'],
    ['前線補助', 'front-line support'], ['生存補助', 'survival support'], ['攻防バフ', 'attack and defense buffs'],
    ['攻撃バフ', 'attack buff'], ['被ダメ増加', 'damage taken debuff'], ['無限貫通', 'infinite pierce'],
    ['継続ダメージ', 'damage over time'], ['攻撃速度低下', 'attack speed reduction'], ['ニャンコシナジー', 'Nyanko synergy'],
    ['ステルス', 'stealth'], ['シールド', 'shield'], ['ノックバック', 'knockback'], ['回復', 'healing'],
    ['火力', 'damage'], ['生存', 'survival'], ['燃焼', 'burn'], ['分身', 'clones'], ['麻痺', 'paralysis'],
    ['貫通', 'pierce'], ['減速', 'slow'], ['睡眠', 'sleep'], ['束縛', 'bind'], ['前衛', 'front line'],
    ['妨害', 'crowd control'], ['バフ', 'buff'], ['デバフ', 'debuff'], ['耐久', 'durability']
  ]);
  if (/主な役割|登録役割|役割タグ/.test(source) || /Main roles:/.test(result)) {
    for (const [ja, en] of roleTerms) result = result.replaceAll(ja, en);
    result = result.replace(/(?<=[A-Za-z)])・(?=[A-Za-z])/g, ' / ');
  }
  return result;
}

function polishChinese(value, source) {
  let result = value
    .replace(/MNSB(?:BDBBRANDX|DBBRANDX|BRANDX|DBGAME|GAME)/g, 'Clash of Critters 攻略数据库')
    .replaceAll('塔塔', 'Tatari')
    .replaceAll('候选者', '候选')
    .replaceAll('恒星', '星')
    .replaceAll('策略咨询中心', '攻略助手')
    .replaceAll('战略咨询中心', '攻略助手')
    .replaceAll('手持式管理', '持有角色管理')
    .replaceAll('录音状态', '数据收录情况')
    .replaceAll('组织备忘录', '阵容方案')
    .replaceAll('阵型制作者', '阵容编辑器')
    .replaceAll('组织制造商', '阵容编辑器')
    .replaceAll('框架阵型', '格阵容')
    .replace(/Clash of Critters\s*[（(]Clash of Critters[）)]/g, 'Clash of Critters');

  if (source.includes('進化')) result = result.replaceAll('演变', '进化').replaceAll('演化', '进化');
  if (source.includes('整理') && !source.includes('編成')) result = result.replaceAll('组织', '整理').replaceAll('独特整理', '独立整理');

  if (/系(?:統)?/.test(source)) {
    result = result
      .replace(/菌株|血统|品系|家族/g, '系列')
      .replace(/(?<!操作|生态|游戏|网站|评分)系统/g, '系列')
      .replace(/(?<=\d)\s*株/g, ' 个系列');
  }
  if (source.includes('図鑑')) result = result.replaceAll('图画书', '图鉴').replaceAll('订购', '顺序');
  if (source.includes('編成')) result = result.replaceAll('组织', '阵容').replaceAll('阵型', '阵容').replaceAll('合成', '阵容');
  if (source.includes('手持ち')) result = result.replaceAll('手持式', '持有角色').replaceAll('库存', '持有角色');
  if (source.includes('攻略相談')) result = result.replaceAll('策略咨询中心', '攻略助手').replaceAll('战略咨询中心', '攻略助手');
  if (source.includes('端末')) result = result.replaceAll('终端', '设备');
  if (source.includes('盤面') || source.includes('宝')) result = result.replaceAll('董事会', '棋盘');
  if (source.includes('登録系統')) result = result.replace(/登记(?:菌株|系列)|注册(?:菌株|系列)/g, '已收录系列');
  if (source.includes('登録タタ')) result = result.replace(/登记\s*Tatari|注册\s*Tatari/g, '已收录 Tatari');
  if ((source.includes('タタ') || source.includes('体')) && !/ラウンド|敵/.test(source)) {
    result = result
      .replace(/224\s*个?.{0,3}(?:本体|尸体)/g, '224 个 Tatari')
      .replace(/两个(?:本体|尸体|物体)/g, '两个 Tatari')
      .replace(/第([一二])个(?:本体|尸体|物体)/g, '第$1个 Tatari');
  }
  if (/ラウンド|敵/.test(source)) result = result.replace(/(\d+)\s*(?:个|具)?(?:本体|尸体)/g, '$1 个敌人');
  result = result
    .replaceAll('图画书订购', '图鉴顺序')
    .replaceAll('大多数进化阶段的顺序', '按进化阶段数量排序')
    .replaceAll('查看63个系列的列表', '查看全部 63 个系列')
    .replaceAll('如果您迷路，请联系攻略助手', '不确定怎么选？可使用攻略助手')
    .replaceAll('搜索下一个要提出的候选人', '查看下一步培养推荐')
    .replaceAll('查看录音状态', '查看数据收录情况')
    .replaceAll('登记菌株', '已收录系列')
    .replaceAll('登记 Tatari', '已收录 Tatari')
    .replaceAll('注册 Tatari', '已收录 Tatari')
    .replaceAll('手持式管理和阵容工具', '持有角色与阵容工具')
    .replaceAll('15 个阵容方案', '15 格阵容方案')
    .replaceAll('车道', '路线')
    .replace(/(\d+)个(?=系列|Tatari|位置|项目|推荐)/g, '$1 个')
    .replace(/Tatari(?=[\u3400-\u9fff])/g, 'Tatari ')
    .replace(/([\u3400-\u9fff])Tatari/g, '$1 Tatari');
  const roleTerms = new Map([
    ['範囲持続火力', '范围持续伤害'], ['広範囲火力', '大范围伤害'], ['範囲火力', '范围伤害'],
    ['遠距離火力', '远程伤害'], ['近距離火力', '近战伤害'], ['序盤火力', '前期伤害'],
    ['前線補助', '前排辅助'], ['生存補助', '生存辅助'], ['攻防バフ', '攻防增益'], ['攻撃バフ', '攻击增益'],
    ['被ダメ増加', '易伤'], ['無限貫通', '无限穿透'], ['継続ダメージ', '持续伤害'], ['攻撃速度低下', '降低攻速'],
    ['ニャンコシナジー', '猫系联动'], ['ステルス', '隐身'], ['シールド', '护盾'], ['ノックバック', '击退'],
    ['回復', '治疗'], ['火力', '输出'], ['生存', '生存'], ['燃焼', '燃烧'], ['分身', '分身'],
    ['麻痺', '麻痹'], ['貫通', '穿透'], ['減速', '减速'], ['睡眠', '睡眠'], ['束縛', '束缚'],
    ['前衛', '前排'], ['妨害', '控制'], ['バフ', '增益'], ['デバフ', '减益'], ['耐久', '生存能力']
  ]);
  if (/主な役割|登録役割|役割タグ/.test(source) || /主要(?:定位|作用)：/.test(result)) {
    for (const [ja, zh] of roleTerms) result = result.replaceAll(ja, zh);
    result = result.replaceAll('・', '／');
  }
  return result;
}

export function polishTranslation(value, locale, source = '') {
  let result = String(value ?? '').replace(invisibleCharacters, '').replace(/\u00a0/g, ' ');
  result = locale === 'en' ? polishEnglish(result, source) : polishChinese(result, source);
  if (locale === 'en') result = result.replace(/\s+([,.;:!?])/g, '$1').replace(/([([{])\s+/g, '$1').replace(/\s+([)\]}])/g, '$1');
  return result.trim();
}
