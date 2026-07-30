// Loader for the 30 curated Skills-First profiles (the third onboarding source).
// Profiles arrive pre-clustered; we map them into the same shape the pipeline uses
// for O*NET / custom roles, and attach authoritative definitions to each skill.
import { ROLE_CATEGORIES, WORKSHOP_ROLES, SKILL_DEFS } from './skillsFirstProfiles.js';

let _seq = 0;
const tid = () => 'sf_t_' + (_seq++);

// Categorized list for the picker: [{ key, label, roles:[{ name, icon, workers }] }]
export function skillsFirstCategories() {
  return Object.entries(ROLE_CATEGORIES).map(([key, c]) => ({
    key,
    label: c.label,
    roles: (c.roles || [])
      .filter((n) => WORKSHOP_ROLES[n])
      .map((n) => ({ name: n, icon: WORKSHOP_ROLES[n].icon || '', workers: WORKSHOP_ROLES[n].workers || '' })),
  }));
}

// Flat name list (for search / validation).
export function skillsFirstRoleNames() {
  return Object.keys(WORKSHOP_ROLES);
}

// Build a SET_ROLE payload for a chosen Skills-First profile: pre-made clusters,
// task strings converted to { id, text }, skills carrying their definition.
export function loadSkillsFirstRole(name) {
  const p = WORKSHOP_ROLES[name];
  if (!p) throw new Error('Unknown Skills-First profile: ' + name);
  const clusters = (p.clusters || []).map((c) => ({
    id: c.id,
    label: c.label,
    description: c.description || '',
    tasks: (c.tasks || []).map((text) => ({ id: tid(), text })),
  }));
  const skills = (p.skills || []).map((s) => ({
    name: s.name,
    cat: s.cat || '',
    def: SKILL_DEFS[s.name] || '',
  }));
  return { role: { name, source: 'skillsfirst' }, clusters, poolTasks: [], skills };
}
