// Build suggested clusters from an O*NET task catalog, applying the user's filter settings.
// Tasks are grouped by work-activity domain; within each domain the top-N by score
// (importance × frequency) are kept. Out-of-scope tasks (non-core when "core only", or
// below the per-domain cap) are simply hidden — they return if the user widens the filter.

export const WA_DOMAINS = [
  { id: 'wa-info',     label: 'Gathering & Evaluating Information' },
  { id: 'wa-analyze',  label: 'Analyzing & Decision-Making' },
  { id: 'wa-produce',  label: 'Performing & Producing Work' },
  { id: 'wa-interact', label: 'Communicating & Coordinating' },
  { id: 'wa-other',    label: 'Other Tasks' },
];

export const DETAIL_LEVELS = ['few', 'standard', 'all'];
export const DETAIL_N = { few: 3, standard: 6, all: Infinity };
export const DEFAULT_CLUSTER_SETTINGS = { coreOnly: true, detail: 'standard' };

export function suggestClusters(catalog, settings, removedIds = []) {
  const removed = new Set(removedIds);
  const n = DETAIL_N[settings?.detail] ?? DETAIL_N.standard;
  const avail = (catalog || []).filter((t) => !removed.has(t.id));
  const inScope = settings?.coreOnly ? avail.filter((t) => t.core) : avail;

  const byDom = new Map();
  for (const t of inScope) {
    const d = t.domain || 'wa-other';
    if (!byDom.has(d)) byDom.set(d, []);
    byDom.get(d).push(t);
  }

  const clusters = [];
  for (const dom of WA_DOMAINS) {
    const arr = byDom.get(dom.id);
    if (!arr || arr.length === 0) continue;
    arr.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const kept = arr.slice(0, n).map((t) => ({ id: t.id, text: t.text }));
    clusters.push({ id: dom.id, label: dom.label, description: '', tasks: kept });
  }
  return { clusters, poolTasks: [] };
}

// How many catalog tasks are currently shown vs available (for the "showing X of Y" hint).
export function taskCounts(catalog, settings, removedIds = []) {
  const { clusters } = suggestClusters(catalog, settings, removedIds);
  const shown = clusters.reduce((s, c) => s + c.tasks.length, 0);
  const available = (catalog || []).filter((t) => !removedIds.includes(t.id)).length;
  return { shown, available };
}
