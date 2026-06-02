import { CAT_ORDER } from './config.js';
import { skillFate, esc } from './logic.js';

const BL = { hl: 'Human-Led', hitl: 'Human-in-the-Loop (HITL)', hotl: 'Human-on-the-Loop (HOTL)', auto: 'Full Auto' };
const BC = { hl: '#7B2020', hitl: '#B85520', hotl: '#9B7200', auto: '#4a4a4a' };

const FATE_META = {
  'Deepens':        { color: '#1A2A4A', takeaway: 'Human expertise becomes the key differentiator here — this skill is worth investing in as AI takes over routine work.' },
  'Persists':       { color: '#B85520', takeaway: 'Remains essential with AI in the loop — workers still own the output and must review every result.' },
  'Potential Drop': { color: '#9B7200', takeaway: 'At risk of automation — confirm whether meaningful human judgment is still required once AI handles this work.' },
  'Dropped':        { color: '#7B2020', takeaway: 'Confirmed automatable — consider redirecting development investment to skills that deepen or persist.' },
  'New Skill':      { color: '#2C6E8A', takeaway: 'Identified as a gap — this skill needs to be built or acquired to support the team\'s AI-augmented workflow.' },
  'Foundational':   { color: '#3D5A6B', takeaway: 'Cross-cutting — applies across all task clusters. Prioritize for development regardless of AI adoption; these skills enable everything else.' },
  'Unassigned':     { color: '#aaa',    takeaway: 'Not yet placed in the skill sort exercise — revisit this skill.' },
};

export function downloadReport(state, results, constraints) {
  const role = state.role?.name || 'Unknown Role';
  const { clusters, skills } = state;
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fateState = { drops: state.drops, fateOverrides: state.fateOverrides, placements: state.placements, results };

  let taskRows = '';
  for (const c of clusters) {
    const bucket = results[c.id] || 'auto';
    const constraint = constraints[c.id]?.label || 'None — defaults to Full Auto';
    taskRows += `<tr>
      <td><strong>${esc(c.label)}</strong>${c.description ? `<br><span style="color:#999;font-size:11px">${esc(c.description)}</span>` : ''}</td>
      <td><span class="bucket-badge" style="background:${BC[bucket]}">${BL[bucket]}</span></td>
      <td>${esc(constraint)}</td>
    </tr>`;
  }

  const sortedSkills = [...skills].sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a.cat); const bi = CAT_ORDER.indexOf(b.cat);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const allEntries = [
    ...sortedSkills.map((s) => ({ name: s.name, cat: s.cat, gap: false })),
    ...state.newSkills.map((ns) => ({ name: ns.name, cat: 'Gap Skill (added)', gap: true })),
  ];

  let skillRows = '';
  for (const s of allEntries) {
    const fate = skillFate(s.name, s.gap, fateState);
    const isDropped = state.drops[s.name];
    const fm = FATE_META[fate.label] || FATE_META['Unassigned'];
    skillRows += `<tr${isDropped ? ' class="dropped-row"' : ''}>
      <td><strong>${esc(s.name)}</strong>${s.gap ? '<br><em style="color:#aaa;font-size:10.5px">gap skill</em>' : ''}</td>
      <td style="color:#777;font-size:11.5px">${esc(s.cat)}</td>
      <td style="white-space:nowrap"><span class="fate-badge" style="background:${fm.color}">${fate.label}</span></td>
      <td style="color:#555;font-size:11.5px">${fm.takeaway}</td>
    </tr>`;
  }

  const sourceNote = state.role?.source === 'onet'
    ? `O*NET role${state.role?.soc ? ` (${esc(state.role.soc)})` : ''}`
    : 'Custom role (employer-provided tasks & skills)';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>AI Routing Workshop — ${esc(role)}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;max-width:960px;margin:40px auto;padding:0 24px;color:#1a1a1a;font-size:13px;line-height:1.5}
  .rpt-header{background:#1A2A4A;color:#fff;padding:28px 32px;border-radius:10px 10px 0 0}
  .rpt-header h1{font-size:22px;font-weight:700;margin-bottom:4px}
  .rpt-header .meta{opacity:.65;font-size:12px}
  .rpt-body{background:#fff;border:1px solid #e0deda;border-top:none;border-radius:0 0 10px 10px;padding:28px 32px}
  h2{font-size:13px;font-weight:700;color:#1A2A4A;margin:28px 0 12px;padding-bottom:6px;border-bottom:2px solid #1A2A4A;text-transform:uppercase;letter-spacing:.06em}
  h2:first-child{margin-top:0}
  table{width:100%;border-collapse:collapse;margin-bottom:8px;font-size:12.5px}
  th{background:#1A2A4A;color:#fff;padding:9px 12px;text-align:left;font-weight:600;font-size:11.5px}
  td{padding:9px 12px;border-bottom:1px solid #eeede9;vertical-align:top}
  tr:last-child td{border-bottom:none}
  .bucket-badge{display:inline-block;padding:3px 11px;border-radius:4px;color:#fff;font-weight:700;font-size:11px;white-space:nowrap}
  .fate-badge{display:inline-block;padding:3px 10px;border-radius:4px;color:#fff;font-weight:700;font-size:11px}
  .dropped-row td{opacity:.45}
  .dropped-row td:nth-child(3),.dropped-row td:nth-child(4){opacity:1}
  .legend{margin-top:20px;padding:14px 16px;background:#f7f6f3;border-radius:6px;font-size:11.5px;color:#666}
  .legend strong{color:#1A2A4A}
  .legend ul{margin:6px 0 0 16px;line-height:1.9}
  .footer{margin-top:24px;font-size:11px;color:#bbb;text-align:center;padding-top:16px;border-top:1px solid #eee}
  .print-bar{margin-top:20px;text-align:right}
  .btn-print{background:#1A2A4A;color:#fff;border:none;border-radius:5px;padding:9px 20px;font-size:12px;font-weight:600;cursor:pointer}
  .btn-print:hover{background:#253d68}
  @media print{body{margin:0;padding:16px}.rpt-header{border-radius:0}.print-bar{display:none}}
</style></head>
<body>
<div class="rpt-header">
  <h1>AI Routing Workshop Report</h1>
  <div class="meta">${esc(role)} &nbsp;·&nbsp; ${sourceNote} &nbsp;·&nbsp; Generated ${date}</div>
</div>
<div class="rpt-body">
  <h2>Task Cluster Routings</h2>
  <table>
    <thead><tr><th>Cluster</th><th>Routing Decision</th><th>Binding Constraint</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>

  <h2>Skill Implications</h2>
  <table>
    <thead><tr><th>Skill</th><th>Category</th><th>Fate</th><th>Takeaway</th></tr></thead>
    <tbody>${skillRows}</tbody>
  </table>

  <div class="legend">
    <strong>How to read skill fates:</strong>
    <ul>
      <li><strong>Deepens</strong> — Human expertise is the differentiator; invest in development of this skill.</li>
      <li><strong>Persists</strong> — Skill remains essential; AI assists but humans own every output.</li>
      <li><strong>Potential Drop</strong> — At risk; confirm whether meaningful human judgment is still required.</li>
      <li><strong>Dropped</strong> — Confirmed automatable; redirect development investment.</li>
      <li><strong>Foundational</strong> — Cross-cutting; prioritize regardless of AI adoption.</li>
    </ul>
  </div>
  <div class="footer">AI Routing Workshop &nbsp;·&nbsp; Burning Glass Institute</div>
  <div class="print-bar"><button class="btn-print" onclick="window.print()">Print / Save as PDF</button></div>
</div>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Role-Redesign-' + role.replace(/[^a-zA-Z0-9]+/g, '-') + '-' + new Date().toISOString().slice(0, 10) + '.html';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
}
