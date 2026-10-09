import fs from 'node:fs';
import path from 'node:path';
import { ATTRIBUTE_META, BASE_URL, LAST_MODIFIED } from './site-config.mjs';
import { renderHeader, renderFooter } from './shared-layout.mjs';
import '../family-display.js';

const { getFamilyDisplayName, getFamilyDisplayLabel } = globalThis.MONSABA_FAMILY;

const root = path.resolve(import.meta.dirname, '..');
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const tatari = readJson('data/tatari.json');
const skills = readJson('data/tata-skills.json');
const ratings = readJson('data/tier-ratings.json');
const editorial = readJson('data/editorial-content.json').families;
const evolutionPriority = readJson('data/evolution-priority.json');
const acquisition = readJson('data/tata-acquisition.json');
const freshness = readJson('data/page-freshness.json');
const tataImages = readJson('data/tata-images.json');
const tataNameSources = readJson('data/tata-name-i18n-sources.json');
const officialSkillIcons = readJson('data/official-assets/skill-icons.json');
const evolutionTrials = readJson('data/evolution-trials.json');
const zombieSkills = readJson('data/zombie-rush/skills.json');
const families = tatari.families || [];
const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const jsonLd = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');
const originalName = (evolution, tag = 'p') => `<${tag} class="localized-original-name" translate="no"><span data-name-locale="en">Japanese: ${esc(evolution.name)}</span><span data-name-locale="zh-CN">日文名：${esc(evolution.name)}</span></${tag}>`;
const imageByFamily = new Map(tataImages.families.map((family) => [family.familyId, family]));
const skillIconByFamilyStage = new Map(officialSkillIcons.icons.map((icon) => [`${icon.familyId}:${icon.stage}`, icon]));
const stage1Image = (familyId) => imageByFamily.get(familyId)?.stage1;
const formImage = (familyId, stage) => imageByFamily.get(familyId)?.forms.find((form) => form.stage === stage && form.status === 'verified');
const responsiveAttrs = (image) => image.srcset ? ` srcset="${esc(image.srcset)}" sizes="${esc(image.sizes || '(max-width: 600px) 44vw, 256px')}"` : '';
const matchesRoute = (pattern, route) => pattern.endsWith('*') ? route.startsWith(pattern.slice(0, -1)) : route === pattern;
function modifiedFor(route) {
  const exact = freshness.routes?.[route];
  const wildcard = Object.entries(freshness.routes || {}).find(([pattern]) => pattern.endsWith('*') && matchesRoute(pattern, route))?.[1];
  return { ...freshness.default, ...(wildcard || {}), ...(exact || {}) }.updated || LAST_MODIFIED;
}

function evaluationRows(id) {
  const overall = ratings.overall?.byFamily?.[id];
  const zombie = ratings.zombieRush?.byFamily?.[id];
  if (!overall && !zombie)
    return [];
  return [
    ['総合', overall?.tier],
    ['通常', overall?.normal],
    ['ゾンビラッシュ', zombie?.tier || overall?.zombie],
    ['道場', overall?.dojo],
    ['初心者', overall?.beginner]
  ].filter(([, value]) => value && value !== '－');
}

function priorityEntries(id) {
  const roadmap = [
    ...(evolutionPriority.t3Roadmap?.firstPriority || []),
    ...(evolutionPriority.t3Roadmap?.secondPriority || [])
  ].filter((item) => item.familyId === id);
  const transitions = (evolutionPriority.highImpactTransitions || []).filter((item) => item.familyId === id);
  return { roadmap, transitions };
}

function verifiedChanges(stages) {
  const changes = [];
  for (let index = 1; index < stages.length; index += 1) {
    const before = stages[index - 1];
    const after = stages[index];
    const items = [];
    if (before.skillName !== after.skillName)
      items.push(`スキル名：${before.skillName} → ${after.skillName}`);
    if (!(after.values || []).length) {
      changes.push({ before, after, items });
      continue;
    }
    const beforeValues = new Map((before.values || []).map((value) => [value.label, value.value]));
    for (const value of after.values || []) {
      const oldValue = beforeValues.get(value.label);
      if (oldValue === undefined)
        items.push(`${value.label}：${value.value}（追加）`);
      else if (oldValue !== value.value)
        items.push(`${value.label}：${oldValue} → ${value.value}`);
    }
    changes.push({ before, after, items });
  }
  return changes;
}

function renderPage(family, index) {
  const displayName = getFamilyDisplayName(family);
  const displayLabel = getFamilyDisplayLabel(family);
  const stageData = skills.byFamily?.[family.id]?.stages || [];
  const pendingSkillEvidence = stageData.some((stage) => stage.verificationStatus === 'pending-user-skill-evidence');
  const firstEnglishEvidence = tataNameSources.forms.find(form => form.familyId === family.id && form.stage === 1)?.localizedEvidence?.en;
  const pendingSourceNote = firstEnglishEvidence?.status === 'confirmed' && firstEnglishEvidence?.sourceType === 'official-store'
    ? '日本語名と進化画像は提供資料、T1英語名は公式ストアで確認しました。スキル・進化条件・評価・一部の外国語名は確認待ちです。'
    : '日本語名と進化画像は提供資料で確認しました。スキル・進化条件・評価・外国語名は確認待ちです。';
  const overall = ratings.overall?.byFamily?.[family.id];
  const zombie = ratings.zombieRush?.byFamily?.[family.id];
  const evaluations = evaluationRows(family.id);
  const roles = overall?.roles || [];
  const attr = ATTRIBUTE_META[family.attribute];
  if (!attr)
    throw new Error(`${family.id}: 属性設定がありません`);
  const route = `/tata/${family.id}/`;
  const dateModified = modifiedFor(route);
  const url = `${BASE_URL}${route}`;
  const chain = family.evolutions.map((item) => item.name).join(' → ');
  const { roadmap, transitions } = priorityEntries(family.id);
  const hasExternalSkills = stageData.some(s => s.evidence?.sourceType === 'public_wiki');
  const changes = hasExternalSkills ? [] : verifiedChanges(stageData);
  const evolvedNames = family.evolutions.slice(1).map((item) => item.name);
  const titleNames = [...new Set([evolvedNames[0], evolvedNames.at(-1)].filter(Boolean))];
  const title = `モンサバ ${displayLabel}${titleNames.length ? `（${titleNames.join('・')}）` : ''}は強い？進化・スキル・用途`;
  const roleText = roles.length ? ` 主な役割は${roles.join('・')}。` : '';
  const description = pendingSkillEvidence ? `${displayLabel}の進化先と提供画像を掲載。スキル名・効果・数値・進化条件はゲーム内資料の確認待ちです。` : editorial[family.id]?.description || `モンサバの${displayLabel}（${chain}）の進化先、スキル、確認済み数値${evaluations.length ? '、Tierと用途評価' : ''}を掲載。${roleText}`.trim();
  const image = `${BASE_URL}${stage1Image(family.id).src}`;
  const previous = families[index - 1];
  const next = families[index + 1];
  const structured = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': url,
        url,
        name: title,
        description,
        image,
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        dateModified,
        inLanguage: 'ja',
        about: {
          '@type': 'Thing',
          name: displayLabel,
          alternateName: [...new Set([family.familyName, ...family.evolutions.flatMap((item) => [item.name, item.nameEn, item.nameZhHans])].filter(Boolean))],
          description
        }
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'モンサバ攻略DB', item: `${BASE_URL}/` },
          { '@type': 'ListItem', position: 2, name: 'タタ図鑑', item: `${BASE_URL}/#tatari` },
          { '@type': 'ListItem', position: 3, name: displayLabel }
        ]
      }
    ]
  };
  const evolutionCards = family.evolutions.map((evolution) => {
    const form = formImage(family.id, evolution.stage);
    const visual = form
      ? `<img class="tata-form-image" src="${esc(form.src)}"${responsiveAttrs(form)} width="${form.width}" height="${form.height}" alt="${esc(evolution.name)}" loading="lazy" decoding="async">`
      : `<div class="tata-image-pending" role="img" aria-label="${esc(evolution.name)}"><span>画像確認中</span></div>`;
    const localizedNames = `<div class="tata-i18n-names" translate="no"><span lang="en"><b>English:</b> ${evolution.nameEn ? esc(evolution.nameEn) : '<span data-name-status="pending">Awaiting confirmation</span>'}</span><span lang="zh-Hans"><b>简体中文:</b> ${evolution.nameZhHans ? esc(evolution.nameZhHans) : '<span data-name-status="pending">待确认</span>'}</span></div>`;
    const nameSource = evolution.nameVerification?.en === 'externally_confirmed' ? '<small>英語名：外部攻略資料で確認</small>' : '';
    return `<article class="evo-card static-evo">${visual}<div><small>T${evolution.stage}</small><strong>${esc(evolution.name)}</strong>${originalName(evolution, 'small')}${localizedNames}${nameSource}</div></article>`;
  }).join('');
  const nameNotice = family.evolutions.some((evolution) => Object.values(evolution.nameVerification || {}).includes('pending')) ? '<section class="wrap static-section"><p>一部の外国語名は確認待ちのため、日本語名を表示しています。</p></section>' : '';
  const evolutionIndex = nameNotice + `<section class="wrap tata-stage-index" aria-labelledby="stage-index-title"><h2 id="stage-index-title">このページで扱う進化</h2><ol>${family.evolutions.map((evolution) => `<li><a href="#stage-${evolution.stage}"><b>T${evolution.stage}</b> ${esc(evolution.name)}</a></li>`).join('')}</ol><p>${esc(displayLabel)}のT1〜T${family.evolutions.length}について、進化先・スキル・確認済み数値をまとめています。</p></section>`;
  const skillBlocks = stageData.map((stage) => {

    const skillIcon = skillIconByFamilyStage.get(`${family.id}:${stage.stage}`);

    const review = stage.externalReview;
    const supplemental = review ? `<details class="source-details"><summary>外部攻略資料の効果数値</summary><div lang="ja" translate="no"><p>資料のスキル名：${esc(review.sourceSkillName)}${review.nameComparison === 'matched' ? '' : '（既存ゲーム内資料と表記相違・名称は据え置き）'}</p>${review.effects.map(effect=>`<h3>${esc(effect.name)}</h3>${effect.values.length ? `<dl>${effect.values.map(v=>`<dt>${esc(v.label)}</dt><dd>${esc(v.value)}</dd>`).join('')}</dl>` : '<p>効果数値は資料に未掲載。</p>'}${effect.basis ? `<p>${esc(effect.basis)}</p>` : ''}`).join('')}${review.effects.length ? '' : '<p>数値付き効果ポップアップは資料に未掲載。</p>'}<p>${esc(review.verifiedAt)}・外部資料での確認です。ゲーム内最新値との実物照合は未完了。</p></div><a href="${esc(review.sourceUrl)}">外部攻略資料で確認</a></details>` : '';
    const external = stage.evidence?.sourceType === 'public_wiki' ? `<p class="section-note"><a href="${esc(stage.evidence.sourceUrl)}">外部攻略資料で確認</a>（${esc(stage.evidence.verifiedAt)}）</p>${stage.unknownFields?.length ? `<p class="section-note">確認待ち：${stage.unknownFields.map(esc).join('、')}</p>` : ''}` : '';
    return `<section class="skill-block" id="stage-${stage.stage}" data-skill-stage="${stage.stage}"><div class="skill-head"><div class="skill-title-with-icon">${skillIcon ? `<img src="${esc(skillIcon.optimizedPath)}" width="64" height="64" alt="${esc(`${displayLabel} ${stage.skillName} スキルアイコン`)}" loading="lazy" decoding="async">` : ''}<div><small>第${stage.stage}進化：${esc(stage.tataName)}</small><h2${stage.evidence ? ' lang="ja" translate="no"' : ''}>${esc(stage.skillName)}</h2></div></div><p class="skill-summary"${stage.evidence ? ' lang="ja" translate="no"' : ''}>${esc(stage.description || '説明データは収録されていません。')}</p></div>${stage.values?.length ? `<div class="stats-grid"${stage.evidence ? ' lang="ja" translate="no"' : ''}>${stage.values.map((value) => `<div class="stat-cell"><span>${esc(value.label)}</span><b>${esc(value.value)}</b></div>`).join('')}</div>` : '<p class="section-note">確認済み数値は収録されていません。</p>'}${external}${supplemental}${stage.sources?.length ? `<details class="source-details"><summary>参照スクショ</summary><div class="sources">${stage.sources.map(esc).join(' / ')}</div></details>` : ''}</section>`;

  }).join('');
  const ratingAnswer = overall?.comment || zombie?.comment || (evaluations.length ? `${evaluations.map(([label, value]) => `${label} ${value}`).join('、')}として評価しています。` : '現在評価情報を収集中です。');
  const purposeAnswer = evaluations.length
    ? `<div class="mode-rating-grid">${evaluations.map(([label, value]) => `<div><span>${esc(label)}</span><b>${esc(value)}</b></div>`).join('')}</div>`
    : '<p class="section-note">現在評価情報を収集中です。</p>';
  const priorityAnswer = [...roadmap, ...transitions].length
    ? `<ul class="plain-list">${roadmap.map((item) => `<li><b>${esc(item.priority)}</b>：T3まで${item.requiredStars}星。${esc(item.reason)}</li>`).join('')}${transitions.map((item) => `<li><b>T${item.fromStage}→T${item.toStage} ${esc(item.priority)}</b>：${esc(item.headline)}。${esc(item.reason)}</li>`).join('')}</ul>`
    : '<p class="section-note">現在評価情報を収集中です。根拠のない進化推奨は掲載していません。</p>';
  const changeAnswer = pendingSkillEvidence
    ? '<p class="section-note">スキル資料が未確認のため、進化による性能の変化は判断できません。</p>'
    : changes.length
    ? `<div class="evolution-change-list">${changes.map(({ before, after, items }) => `<article><h3>T${before.stage} ${esc(before.tataName)} → T${after.stage} ${esc(after.tataName)}</h3>${items.length ? `<ul class="plain-list">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p>確認済み数値・スキル名の差分はありません。説明全文はスキル一覧で確認できます。</p>'}</article>`).join('')}</div>`
    : '<p class="section-note">現在評価情報を収集中です。</p>';
  const quickAnswers = `<section class="wrap static-section tata-quick-answers" aria-labelledby="quick-answer-title"><p class="section-kicker visible-kicker">クイック回答</p><p class="trust-label-row"><span class="trust-label is-independent">独自評価</span>${pendingSkillEvidence ? '<span class="trust-label is-pending">画像・名称確認／スキル確認待ち</span>' : hasExternalSkills ? '<span class="trust-label is-external">外部攻略資料で補完・未掲載数値は確認待ち</span>' : '<span class="trust-label is-verified">ゲーム内データ確認済み</span>'}</p><h2 id="quick-answer-title" class="page-h2">${esc(displayName)}は強い？</h2><p>${esc(ratingAnswer)}</p><p class="quick-purpose-label">このタタは何向け？</p><h2 class="page-h2">${esc(displayLabel)}のおすすめ用途</h2>${purposeAnswer}${roles.length ? `<h3>主な役割</h3><div class="role-tags tata-role-tags">${roles.map((role) => `<span>${esc(role)}</span>`).join('')}</div>` : '<p class="section-note"><span class="trust-label is-pending">確認中</span> 役割情報は現在収集中です。</p>'}<p class="rating-hold-note">評価保留は弱いという意味ではなく、順位を付ける根拠が不足している状態です。</p><h2 class="page-h2">${esc(displayName)}は進化するべき？</h2>${priorityAnswer}</section>`;
  const evolutionLinks = family.evolutions.slice(0, -1).map((stage) => `<a class="ghost-button" href="/consult/?flow=evolution&amp;family=${encodeURIComponent(family.id)}&amp;stage=${stage.stage}">T${stage.stage} ${esc(stage.name)}から次の進化を相談</a>`).join('');
  const conditions = evolutionTrials.families.find((row) => row.familyId === family.id)?.conditions || [];
  const trialSection = `<section class="wrap static-section"><h2 class="page-h2">進化条件</h2><p>外部攻略資料で確認した条件と、確認待ちの項目を分けて掲載しています。共有進行の合算・換算式は未確認です。</p><ol>${conditions.map((c) => `<li><b><span>T${c.stage}</span> <span>${esc(c.tataName)}</span></b><p lang="ja" translate="no">${esc(c.condition)}</p>${c.sourceType === 'public_wiki' ? `<a href="${esc(c.individualEvidence?.sourceUrl || c.sourceUrl)}">外部攻略資料で確認</a>` : ''}${c.pendingFields?.length ? '<span class="trust-label is-pending">一部確認待ち</span>' : ''}</li>`).join('')}</ol><a href="/evolution/trials/">進化の試練データベース</a></section>`;
  const zr = zombieSkills.byFamily[family.id] || { skills: [] };
  const numericLabels = {damagePercent:['ダメージ倍率','%'],attackPercent:['攻撃力増加','%'],defensePercent:['防御力増加','%'],activationIntervalSeconds:['発動間隔','秒'],damageIntervalSeconds:['ダメージ間隔','秒'],projectileCount:['発射数',''],sleepPercent:['睡眠発動率','%'],healingPercent:['回復倍率','%'],shieldPercent:['シールド倍率','%'],activationPercent:['発動率','%']};
  const renderZombieValues = values => values?.length ? `<dl lang="ja" translate="no">${values.map(v=>{const [label,unit]=numericLabels[v.metric];return `<dt>${esc(label)}</dt><dd>${esc(Array.isArray(v.value)?v.value.join('〜'):v.value)}${unit} <a href="${esc(v.sourceUrl)}">外部攻略資料</a></dd>`;}).join('')}</dl>` : '';
  const zombieSection = `<section class="wrap static-section" id="zombie-rush-skills"><h2 class="page-h2">ゾンビラッシュ専用スキル</h2><p>進化段階Tとラッシュ中のLvは別です。T4属性オーラはゾンビラッシュでは適用されません。</p><p>外部攻略資料の日本語名・本文を掲載しています。外国語名と未掲載の倍率・クールダウンは確認待ちです。</p><div class="skills static-skills">${!zr.skills.length ? '<p>専用スキルはゲーム内資料の確認待ちです。</p>' : ''}${zr.skills.map(s=>`<section class="skill-block" data-zombie-skill-level="${s.level}"><h3 lang="ja" translate="no">Lv.${s.level} ${esc(s.name)}</h3><p lang="ja" translate="no">${esc(s.description)}</p>${renderZombieValues(s.values)}<a href="${esc(s.sourceUrl)}">外部攻略資料で確認</a><small> ${esc(s.verifiedAt)}</small></section>`).join('')}</div></section>`;
  const modeLinks = editorial[family.id]?.modeLinks || [
    [`/${`attribute/${attr.slug}`}/`, `${family.attribute}属性のタタを見る`],
    ['/tata-tier/', '総合タタTier'],
    ['/evolution-priority/', '進化優先度'],
    ['/boss-rally/', 'ボスラリー攻略'],
    ...(overall?.normal ? [['/normal-guide/', '通常攻略']] : []),
    ...(zombie?.tier || overall?.zombie ? [['/zombie-rush/', 'ゾンビラッシュ攻略']] : []),
    ...(overall?.dojo ? [['/badge-dojo/', 'バッジ道場攻略']] : [])
  ];
  const relatedFamilies = editorial[family.id]?.related.map(({ familyId, reasons }) => ({ item: families.find(f => f.id === familyId), reasons })) || families.filter((item) => item.id !== family.id).map((item) => {
    const itemRating = ratings.overall?.byFamily?.[item.id];
    const sharedRoles = roles.filter((role) => itemRating?.roles?.includes(role));
    const reasons = [];
    let score = 0;
    if (item.attribute === family.attribute) {

      score += 3;

      reasons.push(`同じ${family.attribute}属性`);

    }
    if (overall?.tier && itemRating?.tier === overall.tier) {

      score += 2;

      reasons.push(`総合${overall.tier}評価`);

    }
    if (sharedRoles.length) {

      score += sharedRoles.length * 2;

      reasons.push(`共通役割：${sharedRoles.join('・')}`);

    }
    return { item, score, reasons };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || getFamilyDisplayName(a.item).localeCompare(getFamilyDisplayName(b.item), 'ja')).slice(0, 3);
  const relatedHtml = relatedFamilies.length ? `<div class="related-content related-tata-grid">${relatedFamilies.map(({ item, reasons }) => `<article><h3><a href="/tata/${encodeURIComponent(item.id)}/">${esc(getFamilyDisplayLabel(item))}</a></h3><p>関連理由：${esc(reasons.join(' / '))}</p><a class="ghost-button" href="/compare/?a=${encodeURIComponent(family.id)}&amp;b=${encodeURIComponent(item.id)}">この2体を比較</a></article>`).join('')}</div>` : '<p>関連度を確認できるタタは現在ありません。</p>';
  return `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <meta name="theme-color" content="#2f6fb2" />
  <meta name="robots" content="index,follow,max-image-preview:large" />
  <link rel="canonical" href="${url}" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="モンサバ攻略DB" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${image}" />
  <meta property="og:image:alt" content="${esc(displayLabel)}の代表画像" />
  <meta property="og:locale" content="ja_JP" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="${image}" />
  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon-32x32.png" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/my-tools.css" />
  <script type="application/ld+json">${jsonLd(structured)}</script>
</head>
<body data-page-type="tata_detail" data-family-id="${esc(family.id)}" data-family-name="${esc(displayLabel)}"><a class="skip-link" href="#main-content">本文へスキップ</a>
  ${renderHeader(route)}
  <main id="main-content">
    <section class="page-hero tata-character-hero"><div class="wrap"><nav class="breadcrumbs" aria-label="パンくず"><a href="/">トップ</a><span>›</span><a href="/#tatari">タタ図鑑</a><span>›</span><span>${esc(displayLabel)}</span></nav><div class="tata-character-layout"><figure class="tata-character-visual"><img src="${esc(stage1Image(family.id).src)}"${responsiveAttrs(stage1Image(family.id))} width="${stage1Image(family.id).width}" height="${stage1Image(family.id).height}" alt="${esc(family.evolutions[0].name)}" fetchpriority="high" decoding="async"></figure><div class="family-page-head tata-page-head"><div><span class="attribute">${attr.icon} ${family.attribute}属性</span><h1>${esc(displayLabel)}</h1>${originalName(family.evolutions[0])}<p>${esc(chain)}</p><div class="tata-hero-meta"><span><b>${esc(overall?.tier || '保留')}</b> 総合Tier</span><span><b>${family.evolutions.length}</b> 進化段階</span></div>${roles.length ? `<div class="role-tags tata-role-tags">${roles.map((role) => `<span>${esc(role)}</span>`).join('')}</div>` : ''}</div><div class="tata-hero-actions"><button class="ghost-button tata-favorite-button" type="button" aria-pressed="false">☆ お気に入り</button><button class="ghost-button tata-roster-button" type="button">マイモンサバへ登録</button><a class="button" href="/compare/?a=${encodeURIComponent(family.id)}">比較する</a><a class="ghost-button" href="/team-builder/?family=${encodeURIComponent(family.id)}">編成で使う</a></div></div></div></div></section>
${evolutionIndex}
${quickAnswers}
    <section class="wrap static-section"><h2 class="page-h2">${esc(displayName)}の進化先</h2><div class="evolution-row static-row tata-evolution-timeline" role="region" aria-label="${esc(displayLabel)}の全進化ルート">${evolutionCards}</div></section>
    <section class="wrap static-section"><h2 class="page-h2">進化すると何が変わる？</h2>${changeAnswer}</section>
${acquisition.byFamily?.[family.id]?.verificationStatus === 'verified' ? `<section class="wrap static-section"><h2 class="page-h2">入手方法</h2><p>${esc(acquisition.byFamily[family.id].method)}</p></section>` : ''}
${trialSection}
    <div class="monetization-slot" data-monetization-slot="tata_mid" hidden></div>
    <section class="wrap static-section"><h2 class="page-h2">${esc(displayLabel)}のスキル一覧</h2><div class="skills static-skills">${skillBlocks}</div></section>
${zombieSection}
${evolutionLinks ? `<section class="wrap static-section tata-consult-cta"><h2 class="page-h2">次の進化を相談する</h2><p class="section-note">現在の進化段階を選んだ状態で攻略相談所を開きます。</p><div class="tata-consult-links">${evolutionLinks}</div></section>` : ''}
    <section class="wrap static-section"><h2 class="page-h2">関連するタタ</h2><p class="section-note">属性・Tier・役割の一致度から、確認済みデータだけで関連候補を表示しています。</p>${relatedHtml}</section>
    <section class="wrap static-section"><h2 class="page-h2">次にできること</h2><p class="section-note">確認済みDBから、このタタを比較・育成・編成へ引き継げます。</p><div class="attribute-guide-nav tata-related-links"><a href="/evolution-priority/">育成優先度を見る</a><a href="/compare/?a=${encodeURIComponent(family.id)}">他のタタと比較</a><a href="/team-builder/?family=${encodeURIComponent(family.id)}">編成で使う</a><a href="/#family-${encodeURIComponent(family.id)}">図鑑で進化・スキルを比較</a><a href="/consult/?flow=detail&amp;family=${encodeURIComponent(family.id)}">攻略相談所で相談</a>${modeLinks.map(([href, label]) => `<a href="${href}">${esc(label)}</a>`).join('')}</div></section>
    <nav class="tata-sticky-actions" aria-label="タタの操作"><a href="/compare/?a=${encodeURIComponent(family.id)}">比較</a><button class="tata-roster-button" type="button">My Monsaba</button><a href="/team-builder/?family=${encodeURIComponent(family.id)}">編成で使う</a></nav>
    <nav class="wrap tata-family-nav" aria-label="前後のタタ系統">${previous ? `<a href="/tata/${previous.id}/"><span>← 前の系統</span><b>${esc(getFamilyDisplayLabel(previous))}</b></a>` : '<span></span>'}${next ? `<a href="/tata/${next.id}/"><span>次の系統 →</span><b>${esc(getFamilyDisplayLabel(next))}</b></a>` : '<span></span>'}</nav>
    <section class="wrap source-note"><strong>掲載データについて</strong><p>${pendingSkillEvidence ? pendingSourceNote : 'ゲーム内資料と外部攻略資料を区別し、各スキル・進化条件に出典と確認待ち項目を表示しています。ゾンビラッシュ専用スキルは通常スキルと別データです。未掲載の数値は推測していません。Tierは当サイト独自の暫定評価です。'}</p>${freshness.routes?.[route] ? `<p>最終更新 <time datetime="${dateModified}">${dateModified}</time></p>` : ''}<p class="article-byline">運営・データ確認：<a href="/about/">おぢ</a></p><a href="/about-data/">データ更新方針を見る</a></section>
  </main>
  ${renderFooter(`${families.length}系統 / ${families.flatMap((family) => family.evolutions).length}体`)}
  <dialog id="tata-roster-dialog" class="tata-roster-dialog" aria-labelledby="tata-roster-title"><form method="dialog"><h2 id="tata-roster-title">マイモンサバへ登録</h2><p>この端末だけに所持状況を保存します。</p><div id="tata-roster-stages" class="stage-picker"></div><p id="tata-roster-message" class="tool-status" role="status" aria-live="polite"></p><button class="ghost-button" value="close">閉じる</button></form></dialog>
  <script src="/family-display.js"></script><script src="/site.js"></script><script src="/monetization.js"></script><script src="/growth.js" defer></script><script type="module" src="/tata-roster.js"></script>
</body>
</html>
`;
}

for (const [index, family] of families.entries()) {
  const directory = path.join(root, 'tata', family.id);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, 'index.html'), renderPage(family, index));
}

console.log(`タタ個別ページを ${families.length} 系統分生成しました。`);
