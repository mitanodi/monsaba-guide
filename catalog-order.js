// Shared by the static catalog generator and the browser's classic app script.
(() => {
  const byIds = (families, ids) => {
    const rank = new Map();
    for (const id of ids)
      if (!rank.has(id)) rank.set(id, rank.size);
    return families.map((family, index) => ({ family, index }))
      .sort((a, b) => (rank.get(a.family.id) ?? rank.size + a.index) - (rank.get(b.family.id) ?? rank.size + b.index))
      .map(item => item.family);
  };
  // The editorial overall board is the source; never average the mode ratings.
  const overall = (families, ratings) => byIds(families, (ratings?.overall?.groups || []).flatMap(group => group.ids));
  globalThis.MONSABA_CATALOG_ORDER = Object.freeze({ byIds, overall });
})();
