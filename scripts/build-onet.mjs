/**
 * build-onet.mjs
 * Transforms the public-domain O*NET database (tab-delimited text release) into:
 *   public/onet/index.json        — searchable occupation list (title, alt titles, family)
 *   public/onet/{soc}.json        — one file per occupation: tasks, suggested clusters, skills
 *   public/onet/meta.json         — dataset version + generation date
 *
 * Usage:  node scripts/build-onet.mjs [path-to-onet-text-dir]
 * Default ONET dir: ../_onet_build/db_30_3_text  (sibling of repo)
 *
 * Design notes:
 *  - Suggested clusters: tasks grouped by their O*NET Generalized Work Activity (GWA),
 *    derived via Tasks→DWA→GWA rollup. ~4–8 clusters per role, capped at MAX_CLUSTERS.
 *  - Skills (capped < 30): Essential + Transferable worker skills (importance-ranked) +
 *    a few Software Skills, mapped onto BGI's Foundational / Core / Baseline categories,
 *    with O*NET Content Model descriptions as tooltips.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, '..');
const ONET_DIR = process.argv[2] || path.resolve(REPO, '..', '_onet_build', 'db_30_3_text');
const OUT_DIR = path.resolve(REPO, 'public', 'onet');
const VERSION = '30.3';

const MAX_WORKER_SKILLS = 20;  // top worker skills by importance
const MAX_SOFTWARE_SKILLS = 6; // top software-skill categories
const SKILL_IM_MIN = 2.6;      // importance floor for worker skills (1–5 scale)

// Suggested clusters group a role's tasks by O*NET work-activity DOMAIN — the four broad
// branches of the work-activity taxonomy. This yields a tight 3–4 cluster default that the
// user can split, merge, rename, or delete. (Tasks with no activity mapping → "Other Tasks".)
const WA_DOMAINS = {
  '4.A.1': { id: 'wa-info',     order: 1, label: 'Gathering & Evaluating Information' },
  '4.A.2': { id: 'wa-analyze',  order: 2, label: 'Analyzing & Decision-Making' },
  '4.A.3': { id: 'wa-produce',  order: 3, label: 'Performing & Producing Work' },
  '4.A.4': { id: 'wa-interact', order: 4, label: 'Communicating & Coordinating' },
  _other:  { id: 'wa-other',    order: 5, label: 'Other Tasks' },
};

const CAT_FOUNDATIONAL = 'Foundational & Leadership Skills';
const CAT_CORE = 'Core Role-Specific Skills';
const CAT_BASELINE = 'Baseline Applied Skills';

// SOC major group (first 2 digits) → family label (for browse-by-family UI)
const SOC_FAMILY = {
  '11': 'Management',
  '13': 'Business & Financial Operations',
  '15': 'Computer & Mathematical',
  '17': 'Architecture & Engineering',
  '19': 'Life, Physical & Social Science',
  '21': 'Community & Social Service',
  '23': 'Legal',
  '25': 'Educational Instruction & Library',
  '27': 'Arts, Design, Entertainment, Sports & Media',
  '29': 'Healthcare Practitioners & Technical',
  '31': 'Healthcare Support',
  '33': 'Protective Service',
  '35': 'Food Preparation & Serving',
  '37': 'Building & Grounds Cleaning & Maintenance',
  '39': 'Personal Care & Service',
  '41': 'Sales & Related',
  '43': 'Office & Administrative Support',
  '45': 'Farming, Fishing & Forestry',
  '47': 'Construction & Extraction',
  '49': 'Installation, Maintenance & Repair',
  '51': 'Production',
  '53': 'Transportation & Material Moving',
  '55': 'Military Specific',
};

// ── tab-delimited reader ─────────────────────────────────────────────────────
function readTsv(name) {
  const fp = path.join(ONET_DIR, name);
  if (!fs.existsSync(fp)) throw new Error(`Missing O*NET file: ${name}`);
  const raw = fs.readFileSync(fp, 'utf8');
  const lines = raw.split('\n');
  const header = lines[0].replace(/\r$/, '').split('\t');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].replace(/\r$/, '');
    if (!line) continue;
    const cells = line.split('\t');
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = cells[c];
    rows.push(obj);
  }
  return rows;
}

function num(v) { const n = parseFloat(v); return Number.isFinite(n) ? n : null; }

console.log(`O*NET dir: ${ONET_DIR}`);
console.log('Reading tables…');

// ── load reference tables ────────────────────────────────────────────────────
const occRows = readTsv('Occupation Data.txt');
const taskRows = readTsv('Task Statements.txt');
const taskRatingRows = readTsv('Task Ratings.txt');
const tasksToDwa = readTsv('Tasks to DWAs.txt');
const gwaIwaDwa = readTsv('GWAs to IWAs to DWAs.txt');
const workActivities = readTsv('Work Activities.txt');
const essentialSkills = readTsv('Essential Skills.txt');
const transferableSkills = readTsv('Transferable Skills.txt');
const softwareSkills = readTsv('Software Skills.txt');
const contentModel = readTsv('Content Model Reference.txt');
const reportedTitles = readTsv('Sample of Reported Titles.txt');

// element id → description (for tooltips) and name
const elDesc = new Map();
const elName = new Map();
for (const r of contentModel) {
  elDesc.set(r['Element ID'], (r['Description'] || '').trim());
  elName.set(r['Element ID'], (r['Element Name'] || '').trim());
}

// DWA element id → GWA element id ; GWA id → name
const dwaToGwa = new Map();
for (const r of gwaIwaDwa) dwaToGwa.set(r['DWA Element ID'], r['GWA Element ID']);
const gwaName = new Map();
for (const r of workActivities) {
  if (!gwaName.has(r['Element ID'])) gwaName.set(r['Element ID'], (r['Element Name'] || '').trim());
}

// task importance: (soc|taskId) → IM value
const taskIM = new Map();
for (const r of taskRatingRows) {
  if (r['Scale ID'] !== 'IM') continue;
  taskIM.set(r['O*NET-SOC Code'] + '|' + r['Task ID'], num(r['Data Value']));
}

// (soc|taskId) → primary GWA id  (first DWA mapping wins)
const taskPrimaryGwa = new Map();
for (const r of tasksToDwa) {
  const key = r['O*NET-SOC Code'] + '|' + r['Task ID'];
  if (taskPrimaryGwa.has(key)) continue;
  const gwa = dwaToGwa.get(r['DWA Element ID']);
  if (gwa) taskPrimaryGwa.set(key, gwa);
}

// group tasks by occupation
const tasksByOcc = new Map();
for (const r of taskRows) {
  const soc = r['O*NET-SOC Code'];
  if (!tasksByOcc.has(soc)) tasksByOcc.set(soc, []);
  tasksByOcc.get(soc).push({
    id: r['Task ID'],
    text: (r['Task'] || '').trim(),
    type: r['Task Type'] || '',
    importance: taskIM.get(soc + '|' + r['Task ID']) ?? null,
    gwa: taskPrimaryGwa.get(soc + '|' + r['Task ID']) || null,
  });
}

// skills by occupation (essential + transferable), importance-ranked
function loadSkills(rows) {
  const byOcc = new Map();
  for (const r of rows) {
    if (r['Scale ID'] !== 'IM') continue;
    const soc = r['O*NET-SOC Code'];
    if (!byOcc.has(soc)) byOcc.set(soc, []);
    byOcc.get(soc).push({
      elementId: r['Element ID'],
      name: (r['Element Name'] || '').trim(),
      importance: num(r['Data Value']),
    });
  }
  return byOcc;
}
const essentialByOcc = loadSkills(essentialSkills);
const transferableByOcc = loadSkills(transferableSkills);

// software skills by occupation (category-level, dedup, prefer In Demand / Hot)
const softwareByOcc = new Map();
for (const r of softwareSkills) {
  const soc = r['O*NET-SOC Code'];
  if (!softwareByOcc.has(soc)) softwareByOcc.set(soc, new Map());
  const cats = softwareByOcc.get(soc);
  const catName = (r['Element Name'] || '').trim();
  const elementId = r['Element ID'];
  if (!cats.has(catName)) cats.set(catName, { elementId, name: catName, examples: [], inDemand: 0, hot: 0 });
  const c = cats.get(catName);
  if (r['Workplace Example']) c.examples.push(r['Workplace Example'].trim());
  if (r['In Demand'] === 'Y') c.inDemand++;
  if (r['Hot Technology'] === 'Y') c.hot++;
}

// reported titles by occupation (for search), prefer "Shown in My Next Move"
const titlesByOcc = new Map();
for (const r of reportedTitles) {
  const soc = r['O*NET-SOC Code'];
  if (!titlesByOcc.has(soc)) titlesByOcc.set(soc, []);
  titlesByOcc.get(soc).push({ t: (r['Reported Job Title'] || '').trim(), shown: r['Shown in My Next Move'] === 'Y' });
}

// ── worker-skill category mapping ────────────────────────────────────────────
//  2.A.*            → Foundational & Leadership (basic content/process skills)
//  2.B.1 Social     → Foundational & Leadership (cross-cutting people skills)
//  2.B.2 Cx Problem → Core Role-Specific
//  2.B.3 Technical  → Core Role-Specific
//  2.B.4 Systems    → Core Role-Specific (analysis/decision-making)
//  2.B.5 Resource   → Core Role-Specific (managing people/time/money/materials)
function workerSkillCategory(elementId) {
  if (elementId.startsWith('2.A.')) return CAT_FOUNDATIONAL;
  if (elementId.startsWith('2.B.1')) return CAT_FOUNDATIONAL;
  if (elementId.startsWith('2.B.')) return CAT_CORE;
  return CAT_CORE;
}

// ── build per-occupation files ───────────────────────────────────────────────
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
// clear any stale json
for (const f of fs.readdirSync(OUT_DIR)) if (f.endsWith('.json')) fs.unlinkSync(path.join(OUT_DIR, f));

const index = [];
let built = 0;

for (const occ of occRows) {
  const soc = occ['O*NET-SOC Code'];
  const title = (occ['Title'] || '').trim();
  const description = (occ['Description'] || '').trim();
  const tasks = tasksByOcc.get(soc) || [];
  if (tasks.length === 0) continue; // skip occupations with no task data

  // ── suggested clusters: group tasks by O*NET work-activity domain (≤4 broad groups) ──
  const groups = new Map(); // domainId → { id, label, order, tasks[] }
  for (const t of tasks) {
    const dom = t.gwa ? t.gwa.slice(0, 5) : null; // '4.A.1'..'4.A.4'
    const meta = WA_DOMAINS[dom] || WA_DOMAINS._other;
    if (!groups.has(meta.id)) groups.set(meta.id, { id: meta.id, label: meta.label, order: meta.order, tasks: [] });
    groups.get(meta.id).tasks.push({ id: t.id, text: t.text, importance: t.importance });
  }
  // sort tasks within each cluster by importance desc; order clusters by logical flow
  for (const g of groups.values()) g.tasks.sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  const clusters = [...groups.values()].sort((a, b) => a.order - b.order);
  const outClusters = clusters.map((g) => ({
    id: g.id,
    label: g.label,
    description: '',
    tasks: g.tasks.map((t) => ({ id: t.id, text: t.text })),
  }));

  // ── skills (capped < 30) ──
  const workerRaw = [...(essentialByOcc.get(soc) || []), ...(transferableByOcc.get(soc) || [])]
    .filter((s) => (s.importance ?? 0) >= SKILL_IM_MIN)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0))
    .slice(0, MAX_WORKER_SKILLS);
  const workerSkills = workerRaw.map((s) => ({
    name: s.name,
    cat: workerSkillCategory(s.elementId),
    def: elDesc.get(s.elementId) || '',
  }));

  const swCats = [...(softwareByOcc.get(soc) || new Map()).values()]
    .sort((a, b) => (b.inDemand - a.inDemand) || (b.hot - a.hot) || (b.examples.length - a.examples.length))
    .slice(0, MAX_SOFTWARE_SKILLS);
  const softwareSkillsOut = swCats.map((c) => {
    const ex = [...new Set(c.examples)].slice(0, 4);
    const baseDef = elDesc.get(c.elementId) || `${c.name}.`;
    const def = ex.length ? `${baseDef} Examples: ${ex.join(', ')}.` : baseDef;
    return { name: c.name, cat: CAT_BASELINE, def };
  });

  const skills = [...workerSkills, ...softwareSkillsOut];

  const out = {
    soc, title, description,
    source: 'onet', version: VERSION,
    clusters: outClusters,
    skills,
  };
  fs.writeFileSync(path.join(OUT_DIR, `${soc}.json`), JSON.stringify(out));

  // index entry (search): title + top reported titles + family
  const alts = (titlesByOcc.get(soc) || [])
    .sort((a, b) => (b.shown - a.shown))
    .map((x) => x.t)
    .filter((t, i, arr) => t && arr.indexOf(t) === i)
    .slice(0, 6);
  index.push({
    soc, title,
    family: SOC_FAMILY[soc.slice(0, 2)] || 'Other',
    alt: alts,
  });
  built++;
}

index.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync(path.join(OUT_DIR, 'index.json'), JSON.stringify(index));
fs.writeFileSync(path.join(OUT_DIR, 'meta.json'), JSON.stringify({
  version: VERSION,
  generated: new Date().toISOString().slice(0, 10),
  occupations: built,
}));

console.log(`Built ${built} occupation files + index.json (${index.length} entries) + meta.json`);
