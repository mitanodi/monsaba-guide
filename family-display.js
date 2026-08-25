((root) => {
  const getFamilyDisplayName = (family) => {
    const name = family?.evolutions?.[0]?.name;
    if (typeof name !== 'string' || !name.trim()) {
      throw new TypeError('family.evolutions[0].name is required for display');
    }
    return name.trim();
  };

  const getFamilyDisplayLabel = (family) => `${getFamilyDisplayName(family)}系`;

  const getFamilySearchAliases = (family) => {
    const names = [
      family?.id,
      family?.familyName,
      family?.familyName ? `${family.familyName}系` : '',
      getFamilyDisplayName(family),
      getFamilyDisplayLabel(family),
      ...(family?.searchAliases || []),
      ...(family?.evolutions || []).flatMap((evolution) => [evolution?.name, evolution?.name ? `${evolution.name}系` : ''])
    ];
    return [...new Set(names.filter((name) => typeof name === 'string' && name.trim()).map((name) => name.trim()))];
  };

  root.MONSABA_FAMILY = Object.freeze({
    getFamilyDisplayName,
    getFamilyDisplayLabel,
    getFamilySearchAliases
  });
})(globalThis);
