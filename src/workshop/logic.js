import { LEVEL, ROUTING_QUESTIONS, BUCKETS } from './config.js';

// A skill's placement can be a set of groups. Normalize any stored value
// (legacy scalar 'pool'|'transversal'|clusterId, or an array) to a clean array.
export function normalizePlacement(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.filter((x) => x && x !== 'pool');
  if (v === 'pool') return [];
  return [v];
}

// Net routing bucket for a skill across the groups it touches.
// Highest floor wins — the framework's one-way ratchet: a skill is as
// human-protected as the most people-dependent group it supports.
export function netBucket(placed, results = {}) {
  let topLv = -1, bucket = 'auto', sourceId = null;
  for (const cid of placed) {
    if (cid === 'transversal') continue;
    const b = results[cid] || 'auto';
    const lv = LEVEL[b] || 0;
    if (lv > topLv) { topLv = lv; bucket = b; sourceId = cid; }
  }
  return { bucket, sourceId };
}

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
  const placed = normalizePlacement(placements[skillName]);
  if (placed.length === 0) return { label: 'Unassigned', cls: 'fate-unassigned' };
  if (placed.includes('transversal')) return { label: 'Foundational', cls: 'fate-foundational' };
  const { bucket } = netBucket(placed, results);
  if (bucket === 'hl')   return { label: 'Deepens',  cls: 'fate-deepens' };
  if (bucket === 'hitl') return { label: 'Persists', cls: 'fate-persists' };
  return { label: 'Potential Drop', cls: 'fate-drop' };
}

// The suggested (non-override) outcome label for a placed skill.
export function autoFateLabel(skillName, state) {
  const { placements = {}, results = {} } = state;
  const placed = normalizePlacement(placements[skillName]);
  if (placed.includes('transversal')) return 'Foundational';
  if (placed.length === 0) return 'Unassigned';
  const { bucket } = netBucket(placed, results);
  if (bucket === 'hl') return 'Deepens';
  if (bucket === 'hitl') return 'Persists';
  return 'Potential Drop';
}

// Plain-language "why this outcome" for the transparency view.
export function fateExplanation(skillName, isGap, state, meta = {}) {
  const { drops = {}, fateOverrides = {}, placements = {}, results = {} } = state;
  const { clusters = [], constraints = {} } = meta;
  const nameOf = (id) => (clusters.find((c) => c.id === id)?.label || 'a group');
  if (drops[skillName]) return 'You marked this skill as no longer needed, so it is dropped.';
  if (isGap) return 'You added this as a missing skill, so it is a new skill to hire or build for.';
  if (fateOverrides[skillName]) return 'You set this outcome by hand, overriding the suggestion.';
  const placed = normalizePlacement(placements[skillName]);
  if (placed.length === 0) return 'Not placed in any group yet — drop it into the work where it matters.';
  if (placed.includes('transversal')) return 'Placed in “used across all groups,” so it is foundational — worth investing in no matter how the work is split.';
  const { bucket, sourceId } = netBucket(placed, results);
  const bl = BUCKETS[bucket]?.label || 'Full Auto';
  const reason = constraints[sourceId]?.label;
  const base = placed.length === 1
    ? `In “${nameOf(placed[0])},” which you set to ${bl}.`
    : `In ${placed.length} groups (${placed.map(nameOf).join(', ')}). The one that most needs people is “${nameOf(sourceId)}” (${bl}), so that sets the outcome.`;
  const why = reason ? ` That level is driven by: ${reason}.` : '';
  const rule = bucket === 'hl'
    ? ' Skills in human-led work deepen.'
    : bucket === 'hitl'
    ? ' Where a person reviews every result, the skill persists.'
    : ' Where AI does most of the work, the skill may fade.';
  return base + why + rule;
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
