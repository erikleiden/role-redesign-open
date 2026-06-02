// Lazy loaders for the bundled O*NET dataset (public/onet/*).

const BASE = import.meta.env.BASE_URL || '/';

let _indexCache = null;

export async function loadOnetIndex() {
  if (_indexCache) return _indexCache;
  const res = await fetch(`${BASE}onet/index.json`);
  if (!res.ok) throw new Error('Could not load O*NET occupation index.');
  _indexCache = await res.json();
  return _indexCache;
}

export async function loadOnetMeta() {
  try {
    const res = await fetch(`${BASE}onet/meta.json`);
    if (res.ok) return await res.json();
  } catch { /* ignore */ }
  return null;
}

// Returns a payload ready for dispatch({type:'SET_ROLE', ...})
export async function loadOnetRole(soc) {
  const res = await fetch(`${BASE}onet/${soc}.json`);
  if (!res.ok) throw new Error(`Could not load occupation ${soc}.`);
  const data = await res.json();
  return {
    role: { name: data.title, soc: data.soc, source: 'onet', description: data.description },
    clusters: data.clusters.map((c) => ({
      id: c.id,
      label: c.label,
      description: c.description || '',
      tasks: c.tasks.map((t) => ({ id: String(t.id), text: t.text })),
    })),
    poolTasks: [], // O*NET roles arrive pre-clustered
    skills: data.skills,
  };
}
