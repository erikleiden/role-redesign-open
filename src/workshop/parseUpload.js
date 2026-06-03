import Papa from 'papaparse';

// Custom (employer) uploads do NOT use skill categories — they add friction and error with
// no payoff, since fate is driven by placement, not category. Skills are just names here.

function splitLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// Parse two pasted text blocks into the internal role model.
export function parsePasted(roleName, tasksText, skillsText) {
  const tasks = splitLines(tasksText).map((text, i) => ({ id: 'ct_' + i, text }));
  const seen = new Set();
  const skills = [];
  for (const line of splitLines(skillsText)) {
    // Be forgiving: if someone still types "Skill, Category", keep only the skill name.
    const name = line.split(',')[0].trim();
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    skills.push({ name, def: '' });
  }
  return assembleCustomRole(roleName, tasks, skills);
}

// Parse an uploaded CSV (flexible columns: Task / Tasks → tasks; Skill / Skills → skills).
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
    if (tk && row[tk] && row[tk].trim()) tasks.push({ id: 'ct_' + ti++, text: row[tk].trim() });
    if (sk && row[sk] && row[sk].trim()) {
      const name = row[sk].trim();
      if (!seen.has(name.toLowerCase())) {
        seen.add(name.toLowerCase());
        skills.push({ name, def: '' });
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
    'Task,Skill',
    '"Review and approve expense reports","Financial Analysis"',
    '"Respond to customer inquiries by email","Written Communication"',
    '"Reconcile monthly invoices in the accounting system","Microsoft Excel"',
  ].join('\n');
}
