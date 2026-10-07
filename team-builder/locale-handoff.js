import { saveDraft, encodeTeam } from './team-core.js';

// A shared URL may describe the formation before the latest edits.
// Prefer the local draft so the private team name is also retained.
export function languageSwitchHash(storage, team, families, chips) {
  try {
    if (!storage?.setItem) throw new Error('Draft storage unavailable');
    saveDraft(storage, team, families);
    return '';
  } catch {
    return `#build=${encodeTeam(team, families, chips)}`;
  }
}
