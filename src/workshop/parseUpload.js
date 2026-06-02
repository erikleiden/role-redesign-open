import Papa from 'papaparse';
import { CAT_ORDER } from './config.js';

const [CAT_FOUNDATIONAL, CAT_CORE, CAT_BASELINE] = CAT_ORDER;

export function normalizeCategory(raw) {
  if (!raw) return CAT_CORE;
  const s = String(raw).trim().toLowerCase();
  if (!s) return CAT_CORE;
  if (s.startsWith('found') || s.includes('leader')) return CAT_FOUNDATIONAL;
  if (s.startsWith('base') || s.includes('applied') || s.includes('tech') || s.includes('software')) return CAT_BASELINE;
  if (s.startsWith('core') || s.includes('role')) return CAT_CORE;
  return CAT_CORE;
}

function splitLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// Parse two pasted text blocks into the internal role model.
// Skills lines may be "Skill" or "Skill, Category".
export function parsePasted(roleName, tasksText, skillsText) {
  const taskLines = splitLines(tasksText);
  const skillLines = splitLines(skillsText);
  const tasks = taskLines.map((text, i) => ({ id: 'ct_' + i, text }));
  const seen = new Set();
  const skills = [];
  for (const line of skillLines) {
    const parts = line.split(',');
    const name = parts[0].trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    skills.push({ name, cat: normalizeCategory(parts[1]), def: '' });
  }
  return assembleCustomRole(roleName, tasks, skills);
}

// Parse an uploaded CSV (papaparse objects). Flexible columns:
//   Task / Tasks  → task list
//   Skill / Skills (+ optional Category) → skill list
export function parseCsvText(roleName, csvText) {
  const { data } = Papa.parse(csvText, { header: true, skipEmptyLines: true });
  const tasks = [];
  const skills = [];
  const seen = new Set();
  const keyOf = (row, names) => {
    for (const k of Object.keys(row)) if (names.includes(k.trim().toLowerCase())) return k;
    return null;
  };
  let ti = 0;
  for (const row of data) {
    const tk = keyOf(row, ['task', 'tasks']);
    const sk = keyOf(row, ['skill', 'skills']);
    const ck = keyOf(row, ['category', 'cat', 'skill category']);
    if (tk && row[tk] && row[tk].trim()) tasks.push({ id: 'ct_' + ti++, text: row[tk].trim() });
    if (sk && row[sk] && row[sk].trim()) {
      const name = row[sk].trim();
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        skills.push({ name, cat: normalizeCategory(ck ? row[ck] : ''), def: '' });
      }
    }
  }
  return assembleCustomRole(roleName, tasks, skills);
}

function assembleCustomRole(roleName, tasks, skills) {
  return {
    role: { name: (roleName || 'Custom Role').trim(), source: 'custom' },
    clusters: [],        // custom roles start unclustered → user builds clusters
    poolTasks: tasks,
    skills,
  };
}

export function templateCsv() {
  return [
    'Task,Skill,Category',
    '"Review and approve expense reports","Financial Analysis","Core Role-Specific"',
    '"Respond to customer inquiries by email","Written Communication","Foundational & Leadership"',
    '"Reconcile monthly invoices in the accounting system","Microsoft Excel","Baseline Applied"',
  ].join('\n');
}
