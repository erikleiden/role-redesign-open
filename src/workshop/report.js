import { CAT_ORDER, BUCKETS } from './config.js';
import { skillFate, esc } from './logic.js';

const BL = { hl: BUCKETS.hl.label, hitl: BUCKETS.hitl.label, hotl: BUCKETS.hotl.label, auto: BUCKETS.auto.label };
const BC = { hl: '#7B2020', hitl: '#B85520', hotl: '#9B7200', auto: '#4a4a4a' };

const FATE_META = {
  'Grows in value':   { color: '#1A2A4A', takeaway: 'A person stays central here, so this skill matters more, not less. Worth investing in as AI takes over the routine parts.' },
  'Still needed':     { color: '#B85520', takeaway: 'Stays essential — a person reviews and owns every result, so keep this skill strong.' },
  'At risk':          { color: '#9B7200', takeaway: 'May fade as AI does more of this work. Check whether real human judgment is still needed here.' },
  'No longer needed': { color: '#7B2020', takeaway: 'AI can handle this. Consider shifting training investment toward skills that grow or stay needed.' },
  'New skill':        { color: '#2C6E8A', takeaway: 'A gap to fill — this skill needs to be hired for or trained to support working alongside AI.' },
  'Used everywhere':  { color: '#3D5A6B', takeaway: 'Cuts across the whole job. Worth investing in no matter how the work is split up.' },
  'Not sorted yet':   { color: '#aaa',    takeaway: 'Not yet placed in the exercise — revisit this skill.' },
};

export function downloadReport(state, results, constraints) {
  const role = state.role?.name || 'Unknown Role';
  const { clusters, skills } = state;
  const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const fateState = { drops: state.drops, fateOverrides: state.fateOverrides, placements: state.placements, results };

  let taskRows = '';
  for (const c of clusters) {
    const bucket = results[c.id] || 'auto';
    const constraint = constraints[c.id]?.label || 'Nothing requires a person';
    taskRows += `<tr>
      <td><strong>${esc(c.label)}</strong>${c.description ? `<br><span style="color:#999;font-size:11px">${esc(c.description)}</span>` : ''}</td>
      <td><span class="bucket-badge" style="background:${BC[bucket]}">${BL[bucket]}</span></td>
      <td>${esc(constraint)}</td>
    </tr>`;
  }

  const hasCategories = skills.some((s) => s.cat);
  const sortedSkills = [...skills].sort((a, b) => {
    const ai = CAT_ORDER.indexOf(a.cat); const bi = CAT_ORDER.indexOf(b.cat);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });
  const allEntries = [
    ...sortedSkills.map((s) => ({ name: s.name, cat: s.cat, gap: false })),
    ...state.newSkills.map((ns) => ({ name: ns.name, cat: 'Added skill', gap: true })),
  ];

  let skillRows = '';
  for (const s of allEntries) {
    const fate = skillFate(s.name, s.gap, fateState);
    const isDropped = state.drops[s.name];
    const fm = FATE_META[fate.label] || FATE_META['Not sorted yet'];
    skillRows += `<tr${isDropped ? ' class="dropped-row"' : ''}>
      <td><strong>${esc(s.name)}</strong>${s.gap ? '<br><em style="color:#aaa;font-size:10.5px">added skill</em>' : ''}</td>
      ${hasCategories ? `<td style="color:#777;font-size:11.5px">${esc(s.cat)}</td>` : ''}
      <td style="white-space:nowrap"><span class="fate-badge" style="background:${fm.color}">${fate.label}</span></td>
      <td style="color:#555;font-size:11.5px">${fm.takeaway}</td>
    </tr>`;
  }

  const sourceNote = state.role?.source === 'onet'
    ? `Built-in role${state.role?.soc ? ` · O*NET ${esc(state.role.soc)}` : ''}`
    : 'Your own tasks & skills';

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8">
<title>Role Redesign Summary — ${esc(role)}</title>
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
  <h1>Role Redesign Summary</h1>
  <div class="meta">${esc(role)} &nbsp;·&nbsp; ${sourceNote} &nbsp;·&nbsp; Generated ${date}</div>
</div>
<div class="rpt-body">
  <h2>AI Level by Task Group</h2>
  <table>
    <thead><tr><th>Task group</th><th>Suggested AI level</th><th>Main reason</th></tr></thead>
    <tbody>${taskRows}</tbody>
  </table>

  <h2>What Happens to Each Skill</h2>
  <table>
    <thead><tr><th>Skill</th>${hasCategories ? '<th>Category</th>' : ''}<th>What happens</th><th>What to do</th></tr></thead>
    <tbody>${skillRows}</tbody>
  </table>

  <div class="legend">
    <strong>What the outcomes mean:</strong>
    <ul>
      <li><strong>Grows in value</strong> — A person stays central; invest in this skill.</li>
      <li><strong>Still needed</strong> — Stays essential; AI helps, but a person owns the result.</li>
      <li><strong>At risk</strong> — May fade; check whether real human judgment is still needed.</li>
      <li><strong>No longer needed</strong> — AI can handle it; shift training elsewhere.</li>
      <li><strong>Used everywhere</strong> — Cuts across the whole job; invest no matter what.</li>
    </ul>
  </div>
  <div class="footer">Role Redesign &nbsp;·&nbsp; Burning Glass Institute</div>
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
