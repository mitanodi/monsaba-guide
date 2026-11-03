import { cloneTeam, emptyTeam, DOJO_OPTIONS } from './team-core.js';

const positive = value => /^\d{1,4}$/.test(String(value || '')) && Number(value) > 0 ? Number(value) : null;

export function chapterContext(value) {
  const match = String(value || '').trim().match(/^(\d{1,4})(?:\s*[-－]\s*(\d{1,4}))?/);
  return { chapter: positive(match?.[1]), stage: positive(match?.[2]) };
}

// Opening a chapter link is read-only until the player edits the board.
// Keep other mode drafts intact and give a shared formation priority over queries.
export function openChapterDraft(query, current, drafts, families, shared = false) {
  if (shared || query.get('mode') !== 'normal') return null;
  const chapter = positive(query.get('chapter'));
  if (!chapter) return null;
  const stage = positive(query.get('stage'));
  const previous = cloneTeam(current, families);
  const next = current.mode === 'normal' ? cloneTeam(current, families)
    : drafts.normal ? cloneTeam(drafts.normal, families) : { ...emptyTeam(), mode: 'normal' };
  next.context = { ...next.context, normalStage: `${chapter}${stage ? `-${stage}` : ''}` };
  return { team: next, drafts: { ...drafts, [previous.mode]: previous } };
}

export function openDojoDraft(query, current, drafts, families, shared = false) {
  if (shared || query.get('mode') !== 'dojo' || !DOJO_OPTIONS.includes(query.get('attribute'))) return null;
  const previous = cloneTeam(current, families);
  const next = current.mode === 'dojo' ? cloneTeam(current, families)
    : drafts.dojo ? cloneTeam(drafts.dojo, families) : { ...emptyTeam(), mode: 'dojo' };
  next.context = { ...next.context, dojoAttribute: query.get('attribute'), dojoFloor: positive(query.get('floor')) || 1 };
  delete next.context.dojoStage;
  const stage = positive(query.get('stage'));
  if (stage) next.context.dojoStage = stage;
  return { team: next, drafts: { ...drafts, [previous.mode]: previous } };
}
