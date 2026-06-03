import { LEVEL, ROUTING_QUESTIONS } from './config.js';

// Resolve the binding constraint and routing bucket from a cluster's answers.
export function computeResult(answers) {
  let topLevel = 0, topBucket = 'auto', sourceQId = null, sourceLabel = null;
  for (const q of ROUTING_QUESTIONS) {
    const score = answers?.[q.id];
    if (!score) continue;
    const opt = q.options.find((o) => o.score === score);
    if (!opt || opt.min === 'none') continue;
    const lv = LEVEL[opt.min] || 0;
    if (lv > topLevel) {
      topLevel = lv; topBucket = opt.min;
      sourceQId = q.id; sourceLabel = q.label;
    }
  }
  return { bucket: topBucket, sourceQId, sourceLabel };
}

export function currentFloorLevel(answers) {
  const { bucket, sourceQId } = computeResult(answers);
  if (!sourceQId) return 0; // no real floor until an answer triggers a minimum
  return LEVEL[bucket] || 0;
}

export function answeredCount(answers) {
  return ROUTING_QUESTIONS.filter((q) => answers?.[q.id]).length;
}

// Determine a skill's fate given placement / drops / overrides.
// state = { drops, fateOverrides, placements, results }
export function skillFate(skillName, isGap, state) {
  const { drops = {}, fateOverrides = {}, placements = {}, results = {} } = state;
  if (drops[skillName]) return { label: 'Dropped', cls: 'fate-dropped' };
  if (isGap) return { label: 'New Skill', cls: 'fate-new' };
  const ov = fateOverrides[skillName];
  if (ov === 'deepens')        return { label: 'Deepens',        cls: 'fate-deepens' };
  if (ov === 'persists')       return { label: 'Persists',       cls: 'fate-persists' };
  if (ov === 'potential-drop') return { label: 'Potential Drop', cls: 'fate-drop' };
  const placement = placements[skillName];
  if (!placement || placement === 'pool') return { label: 'Unassigned', cls: 'fate-unassigned' };
  if (placement === 'transversal') return { label: 'Foundational', cls: 'fate-foundational' };
  const bucket = results[placement] || 'auto';
  if (bucket === 'hl')   return { label: 'Deepens',  cls: 'fate-deepens' };
  if (bucket === 'hitl') return { label: 'Persists', cls: 'fate-persists' };
  return { label: 'Potential Drop', cls: 'fate-drop' };
}

// The suggested (non-override) outcome label for a placed skill.
export function autoFateLabel(skillName, state) {
  const { placements = {}, results = {} } = state;
  const p = placements[skillName];
  if (p === 'transversal') return 'Foundational';
  const bkt = results[p] || 'auto';
  if (bkt === 'hl') return 'Deepens';
  if (bkt === 'hitl') return 'Persists';
  return 'Potential Drop';
}

export function skillId(name) {
  return 'skill-' + String(name).replace(/[^a-zA-Z0-9]/g, '_');
}

export function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
