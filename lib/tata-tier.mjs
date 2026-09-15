/** @typedef {'SSS'|'SS'|'S'|'A'|'B'|'C'|'D'|'HOLD'} Tier */
/** @typedef {{tier: Tier, order?: number, status: 'confirmed'|'provisional'|'hold', rawEvaluation?: string}} Ranking */
export const MODES = ['overall', 'normal', 'zombie', 'dojo', 'beginner'];
export const TIERS = ['SSS', 'SS', 'S', 'A', 'B', 'C', 'D', 'HOLD'];

// Overall is an editorial value, never calculated from mode ratings.
export function groupRankings(data, mode) {
  if (!MODES.includes(mode)) throw new Error(`Unknown ranking mode: ${mode}`);
  return TIERS.map(tier => ({tier, entries: data.families.filter(f => f.rankings[mode].tier === tier)
    .sort((a,b) => (a.rankings[mode].order ?? a.rankings.overall.order) - (b.rankings[mode].order ?? b.rankings.overall.order) || a.rankings.overall.order - b.rankings.overall.order)}));
}

export function legacyRatings(data) {
  const section = mode => ({
    groups: groupRankings(data, mode).filter(g => g.entries.length).map(g => ({rank:g.tier, label:g.tier === 'HOLD' ? '保留' : g.tier, ids:g.entries.map(f => f.familyId)})),
    byFamily: Object.fromEntries(data.families.map(f => [f.familyId, mode === 'overall' ? {
      tier:f.rankings.overall.tier,
      ...Object.fromEntries(MODES.slice(1).map(m => [m,f.rankings[m].tier])),
      rankings:f.rankings, roles:f.roles || [], comment:''
    } : {tier:f.rankings.zombie.tier, status:f.rankings.zombie.status, comment:''}]))
  });
  return {version:2, generatedFrom:'data/tata-tier.json', updated:data.updated, overall:section('overall'), zombieRush:section('zombie')};
}
