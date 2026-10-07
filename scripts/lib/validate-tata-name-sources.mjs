const localeRules = [
  { locale: 'en', nameField: 'englishName', dbField: 'nameEn', pageField: 'englishSourcePage', sourceKey: 'english' },
  { locale: 'zh-CN', nameField: 'simplifiedChineseName', dbField: 'nameZhHans', pageField: 'chineseSourcePage', sourceKey: 'simplifiedChinese' }
];

const formKey = (familyId, stage) => `${familyId}:T${stage}`;
const mappingKey = (familyId, stage, locale) => `${formKey(familyId, stage)}:${locale}`;
const exactString = (value) => typeof value === 'string' && value.length > 0 && value.trim() === value;
const isSupplemental = (row) => row?.sourceType === 'supplemental-evidence';
const hasOfficialStoreEvidence = (evidence) => {
  try {
    const url = new URL(evidence?.url);
    return evidence?.status === 'confirmed' && evidence?.sourceType === 'official-store'
      && url.protocol === 'https:' && url.hostname === 'play.google.com'
      && url.pathname === '/store/apps/details'
      && url.searchParams.get('id') === 'com.farlightgames.pgame.gp'
      && /^\d{4}-\d{2}-\d{2}$/.test(evidence?.checkedAt || '');
  } catch { return false; }
};
const hasExternalNameEvidence = (evidence) => {
  try {
    const url = new URL(evidence?.url);
    return evidence?.status === 'externally_confirmed' && evidence?.sourceType === 'public_wiki'
      && url.protocol === 'https:' && url.hostname === 'w.atwiki.jp'
      && url.pathname === '/monstersurvival/pages/17.html'
      && /^\d{4}-\d{2}-\d{2}$/.test(evidence?.checkedAt || '');
  } catch { return false; }
};

function describe(label, values) {
  return `[${label}]\n${Object.entries(values)
    .map(([key, value]) => `${key}=${typeof value === 'string' ? JSON.stringify(value) : String(value)}`)
    .join('\n')}`;
}

export function validateTataNameSources({ source, tatari, skills, generatedHtml = null }) {
  const errors = [];
  const categories = {
    missingSources: 0,
    nameSourceMismatches: 0,
    invalidPages: 0,
    invalidDocuments: 0,
    duplicateMappings: 0,
    orphanMappings: 0,
    pendingOfficial: 0,
    tatariSkillsMismatches: 0,
    generatedNameMismatches: 0
  };
  const fail = (category, label, values) => {
    categories[category] += 1;
    errors.push(describe(label, values));
  };

  const families = tatari?.families || [];
  const familyById = new Map();
  const canonicalByKey = new Map();
  for (const family of families) {
    if (!exactString(family?.id) || familyById.has(family.id)) {
      errors.push(describe('Duplicate or invalid Tata family ID', { family: family?.id ?? 'missing' }));
      continue;
    }
    familyById.set(family.id, family);
    for (const evolution of family.evolutions || []) {
      const key = formKey(family.id, evolution.stage);
      if (!Number.isInteger(evolution.stage) || canonicalByKey.has(key)) {
        errors.push(describe('Duplicate or invalid Tata stage', { family: family.id, stage: evolution.stage }));
        continue;
      }
      canonicalByKey.set(key, { family, evolution });
    }
  }

  const documents = new Map();
  for (const rule of localeRules) {
    const sourceDocument = source?.sources?.[rule.sourceKey]?.observedFileName;
    const pageCount = source?.sources?.[rule.sourceKey]?.pageCount;
    documents.set(rule.locale, { sourceDocument, pageCount });
    if (!exactString(sourceDocument)) {
      fail('invalidDocuments', 'Invalid Tata source document', {
        locale: rule.locale,
        source_document: sourceDocument ?? 'missing'
      });
    }
    if (!Number.isInteger(pageCount) || pageCount < 1) {
      fail('invalidPages', 'Invalid Tata source document page count', {
        locale: rule.locale,
        page_count: pageCount ?? 'missing'
      });
    }
  }

  const rows = source?.forms || [];
  const rowByKey = new Map();
  const mappingKeys = new Set();
  const pagesByLocale = new Map(localeRules.map((rule) => [rule.locale, new Set()]));
  for (const row of rows) {
    const key = formKey(row?.familyId, row?.stage);
    if (!canonicalByKey.has(key)) {
      fail('orphanMappings', 'Orphan Tata name source', {
        family: row?.familyId ?? 'missing',
        stage: row?.stage ?? 'missing',
        japanese_name: row?.japaneseName ?? 'missing'
      });
    }
    if (!rowByKey.has(key)) rowByKey.set(key, row);

    if (isSupplemental(row) && (row.confidence !== 'pending-official'
      || !(hasOfficialStoreEvidence(row.japaneseEvidence)
        || (exactString(row.japaneseEvidence?.manifest)
          && Number.isInteger(row.japaneseEvidence?.sourcePage) && row.japaneseEvidence.sourcePage >= 1)))) {
      fail('invalidDocuments', 'Invalid supplemental Tata evidence', { family: row.familyId, stage: row.stage });
    }

    for (const rule of localeRules) {
      const uniqueKey = mappingKey(row?.familyId, row?.stage, rule.locale);
      if (mappingKeys.has(uniqueKey)) {
        fail('duplicateMappings', 'Duplicate Tata name source mapping', {
          family: row?.familyId ?? 'missing',
          stage: row?.stage ?? 'missing',
          locale: rule.locale
        });
      }
      mappingKeys.add(uniqueKey);

      if (isSupplemental(row)) {
        const evidence = row.localizedEvidence?.[rule.locale];
        const name = row[rule.nameField];
        if (evidence?.status === 'pending') {
          if (name !== null || !exactString(evidence.reason))
            fail('pendingOfficial', 'Pending Tata name must remain empty', { family: row.familyId, stage: row.stage, locale: rule.locale });
        } else if (!(hasOfficialStoreEvidence(evidence) || hasExternalNameEvidence(evidence)) || !exactString(name)) {
          fail('invalidDocuments', 'Invalid supplemental localized source', { family: row.familyId, stage: row.stage, locale: rule.locale });
        }
        continue;
      }

      const officialName = row?.[rule.nameField];
      if (!exactString(officialName)) {
        fail('missingSources', 'Missing Tata name source', {
          family: row?.familyId ?? 'missing',
          stage: row?.stage ?? 'missing',
          locale: rule.locale,
          name: officialName ?? 'missing'
        });
      }
      const { pageCount } = documents.get(rule.locale);
      const sourcePage = row?.[rule.pageField];
      const nameListSource = row?.sourceType === 'official-name-table' && exactString(row?.nameListSource?.file) && Number.isInteger(row?.nameListSource?.sourceRow);
      if (nameListSource) {
        // Publisher-supplied name-table rows cover forms added after the PDF export.
      } else if (!Number.isInteger(sourcePage) || sourcePage < 1 || (Number.isInteger(pageCount) && sourcePage > pageCount)) {
        fail('invalidPages', 'Invalid Tata name source page', {
          family: row?.familyId ?? 'missing',
          stage: row?.stage ?? 'missing',
          locale: rule.locale,
          source_page: sourcePage ?? 'missing',
          page_count: pageCount ?? 'missing'
        });
      } else if (pagesByLocale.get(rule.locale).has(sourcePage)) {
        fail('duplicateMappings', 'Duplicate Tata name source page', {
          family: row?.familyId ?? 'missing',
          stage: row?.stage ?? 'missing',
          locale: rule.locale,
          source_page: sourcePage
        });
      } else {
        pagesByLocale.get(rule.locale).add(sourcePage);
      }
      if (row?.confidence !== 'confirmed') {
        fail('pendingOfficial', 'Unconfirmed Tata source used as official name', {
          family: row?.familyId ?? 'missing',
          stage: row?.stage ?? 'missing',
          locale: rule.locale,
          verification_status: row?.confidence ?? 'missing',
          name: officialName ?? 'missing'
        });
      }
    }
  }

  const coverage = { en: 0, 'zh-CN': 0 };
  const officialNames = { en: 0, 'zh-CN': 0 };
  for (const [key, { family, evolution }] of canonicalByKey) {
    const row = rowByKey.get(key);
    if (!row) {
      for (const rule of localeRules) {
        fail('missingSources', 'Missing Tata name source', {
          family: family.id,
          stage: evolution.stage,
          locale: rule.locale,
          name: evolution?.[rule.dbField] ?? 'missing',
          source_page: 'missing'
        });
      }
      continue;
    }
    if (evolution.name !== row.japaneseName) {
      fail('nameSourceMismatches', 'Tata Japanese name source mismatch', {
        family: family.id,
        stage: evolution.stage,
        DB: evolution.name,
        source: row.japaneseName
      });
    }

    for (const rule of localeRules) {
      const dbName = evolution?.[rule.dbField];
      const sourceName = row?.[rule.nameField];
      if (isSupplemental(row)) {
        const evidence = row.localizedEvidence?.[rule.locale];
        if (evolution.nameVerification?.[rule.locale] !== evidence?.status || dbName !== sourceName)
          fail('nameSourceMismatches', 'Supplemental Tata name source mismatch', { family: family.id, stage: evolution.stage, locale: rule.locale, DB: dbName, source: sourceName });
        if (evidence?.status === 'pending') {
          if (dbName !== null)
            fail('pendingOfficial', 'Pending Tata name published as official', { family: family.id, stage: evolution.stage, locale: rule.locale });
        } else if (hasOfficialStoreEvidence(evidence) && exactString(dbName) && dbName === sourceName) {
          officialNames[rule.locale] += 1;
          coverage[rule.locale] += 1;
        } else if (hasExternalNameEvidence(evidence) && exactString(dbName) && dbName === sourceName) {
          coverage[rule.locale] += 1;
        }
        continue;
      }
      if (exactString(dbName)) officialNames[rule.locale] += 1;
      if (!exactString(dbName)) {
        fail('missingSources', 'Missing official Tata name', {
          family: family.id,
          stage: evolution.stage,
          locale: rule.locale,
          DB: dbName ?? 'missing'
        });
      } else if (dbName !== sourceName) {
        fail('nameSourceMismatches', 'Tata name source mismatch', {
          family: family.id,
          stage: evolution.stage,
          locale: rule.locale,
          DB: dbName,
          source: sourceName ?? 'missing'
        });
      }

      const { sourceDocument, pageCount } = documents.get(rule.locale);
      const sourcePage = row?.[rule.pageField];
      const validSource = exactString(sourceDocument)
        && Number.isInteger(sourcePage)
        && sourcePage >= 1
        && Number.isInteger(pageCount)
        && sourcePage <= pageCount
        && row?.confidence === 'confirmed'
        && exactString(sourceName)
        && dbName === sourceName;
      const validNameListSource = row?.sourceType === 'official-name-table'
        && exactString(row?.nameListSource?.file)
        && Number.isInteger(row?.nameListSource?.sourceRow)
        && row?.confidence === 'confirmed'
        && exactString(sourceName)
        && dbName === sourceName;
      if (validSource || validNameListSource) coverage[rule.locale] += 1;
    }

    const skillStage = skills?.byFamily?.[family.id]?.stages?.find((item) => item.stage === evolution.stage);
    if (skillStage?.tataName !== evolution.name) {
      fail('tatariSkillsMismatches', 'Tata/skill Japanese name mismatch', {
        family: family.id,
        stage: evolution.stage,
        tatari: evolution.name,
        skills: skillStage?.tataName ?? 'missing'
      });
    }
    for (const rule of localeRules) {
      if (skillStage?.[rule.dbField] !== evolution?.[rule.dbField]) {
        fail('tatariSkillsMismatches', 'Tata/skill localized name mismatch', {
          family: family.id,
          stage: evolution.stage,
          locale: rule.locale,
          tatari: evolution?.[rule.dbField] ?? 'missing',
          skills: skillStage?.[rule.dbField] ?? 'missing'
        });
      }
    }
  }

  const totalForms = canonicalByKey.size;
  const confirmedRows = rows.filter((row) => row?.confidence === 'confirmed');
  const bothConfirmed = confirmedRows.filter((row) => exactString(row.englishName) && exactString(row.simplifiedChineseName)).length;
  const expectedSummary = {
    canonicalForms: totalForms,
    englishConfirmed: coverage.en,
    simplifiedChineseConfirmed: coverage['zh-CN'],
    bothConfirmed,
    needsReview: rows.length - confirmedRows.length
  };
  for (const [field, expected] of Object.entries(expectedSummary)) {
    if (source?.summary?.[field] !== expected) {
      errors.push(describe('Tata source summary mismatch', {
        field,
        summary: source?.summary?.[field] ?? 'missing',
        actual: expected
      }));
    }
  }

  for (const rule of localeRules) {
    for (const duplicatePage of source?.sources?.[rule.sourceKey]?.duplicatePages || []) {
      if (pagesByLocale.get(rule.locale).has(duplicatePage)) {
        fail('duplicateMappings', 'Documented duplicate page is assigned as canonical source', {
          locale: rule.locale,
          source_page: duplicatePage
        });
      }
    }
  }

  if (generatedHtml) {
    for (const family of families) {
      for (const locale of ['ja', 'en', 'zh-CN']) {
        const html = generatedHtml.get(`${locale}:${family.id}`);
        if (typeof html !== 'string') {
          fail('generatedNameMismatches', 'Missing generated Tata detail page', { family: family.id, locale });
          continue;
        }
        for (const evolution of family.evolutions || []) {
          if (!html.includes(evolution.nameEn ? `English:</b> ${evolution.nameEn}` : 'English:</b> <span data-name-status="pending">')) {
            fail('generatedNameMismatches', 'Generated Tata name missing', { family: family.id, stage: evolution.stage, locale, name_locale: 'en', name: evolution.nameEn });
          }
          if (!html.includes(evolution.nameZhHans ? `简体中文:</b> ${evolution.nameZhHans}` : '简体中文:</b> <span data-name-status="pending">')) {
            fail('generatedNameMismatches', 'Generated Tata name missing', { family: family.id, stage: evolution.stage, locale, name_locale: 'zh-CN', name: evolution.nameZhHans });
          }
        }
      }
    }
  }

  return {
    errors,
    stats: {
      formsChecked: totalForms,
      enNames: officialNames.en,
      enSourceCoverage: coverage.en,
      zhCnNames: officialNames['zh-CN'],
      zhCnSourceCoverage: coverage['zh-CN'],
      ...categories
    }
  };
}
