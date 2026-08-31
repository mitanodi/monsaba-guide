((root) => {
  const normalizeLocale = (locale) => {
    const value = String(locale || root.document?.documentElement?.lang || 'ja').toLowerCase();
    if (value === 'en' || value.startsWith('en-')) return 'en';
    if (value === 'zh' || value.startsWith('zh-')) return 'zh-CN';
    return 'ja';
  };

  const getTataDisplayName = (evolution, locale) => {
    const normalized = normalizeLocale(locale);
    const localized = normalized === 'en'
      ? evolution?.nameEn
      : normalized === 'zh-CN'
        ? evolution?.nameZhHans
        : evolution?.name;
    const name = localized || evolution?.name;
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('evolution.name is required for display');
    }
    return name.trim();
  };

  const getFamilyDisplayName = (family, locale) => {
    const evolution = family?.evolutions?.[0];
    const name = getTataDisplayName(evolution, locale);
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('family.evolutions[0].name is required for display');
    }
    return name.trim();
  };

  const getFamilyDisplayLabel = (family, locale) => {
    const normalized = normalizeLocale(locale);
    const name = getFamilyDisplayName(family, normalized);
    if (normalized === 'en') return `${name} Family`;
    if (normalized === 'zh-CN') return `${name}系列`;
    return `${name}系`;
  };

  const getEvolutionChain = (family, locale, separator = ' → ') => (family?.evolutions || [])
    .map((evolution) => getTataDisplayName(evolution, locale))
    .join(separator);

  const getJapaneseName = (evolution) => getTataDisplayName(evolution, 'ja');

  const getJapaneseSecondaryLabel = (evolution, locale) => {
    const normalized = normalizeLocale(locale);
    if (normalized === 'en') return `Japanese: ${getJapaneseName(evolution)}`;
    if (normalized === 'zh-CN') return `日文名：${getJapaneseName(evolution)}`;
    return '';
  };

  const getFamilySearchAliases = (family) => {
    const names = [
      family?.id,
      family?.familyName,
      family?.familyName ? `${family.familyName}系` : '',
      getFamilyDisplayName(family),
      getFamilyDisplayLabel(family),
      ...(family?.searchAliases || []),
      ...(family?.evolutions || []).flatMap((evolution) => [
        evolution?.name,
        evolution?.name ? `${evolution.name}系` : '',
        evolution?.nameEn,
        evolution?.nameZhHans
      ])
    ];
    return [...new Set(names.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))];
  };

  root.MONSABA_FAMILY = Object.freeze({
    normalizeLocale,
    getTataDisplayName,
    getFamilyDisplayName,
    getFamilyDisplayLabel,
    getEvolutionChain,
    getJapaneseName,
    getJapaneseSecondaryLabel,
    getFamilySearchAliases
  });
})(globalThis);
