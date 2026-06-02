import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload, FileDown } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { loadOnetIndex, loadOnetRole } from '../workshop/onet.js';
import { parsePasted, parseCsvText, templateCsv } from '../workshop/parseUpload.js';

export default function SourcePhase() {
  const { dispatch } = useWorkshop();
  const [tab, setTab] = useState('onet');

  return (
    <div className="panel">
      <div className="panel-hdr">
        <h2>Choose a Role</h2>
        <p>Pull a role's tasks &amp; skills from O*NET, or bring your own.</p>
      </div>
      <div className="panel-body">
        <div className="source-toggle">
          <button className={tab === 'onet' ? 'active' : ''} onClick={() => setTab('onet')}>Search O*NET roles</button>
          <button className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}>Upload my own</button>
        </div>
        {tab === 'onet' ? <OnetSearch dispatch={dispatch} /> : <CustomUpload dispatch={dispatch} />}
      </div>
    </div>
  );
}

function OnetSearch({ dispatch }) {
  const [index, setIndex] = useState(null);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loadingSoc, setLoadingSoc] = useState(null);

  useEffect(() => {
    loadOnetIndex().then(setIndex).catch((e) => setError(e.message));
  }, []);

  const results = useMemo(() => {
    if (!index) return [];
    const q = query.trim().toLowerCase();
    if (!q) return index;
    return index.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      (r.alt || []).some((a) => a.toLowerCase().includes(q)),
    );
  }, [index, query]);

  const grouped = useMemo(() => {
    const cap = results.slice(0, 400);
    const byFam = new Map();
    for (const r of cap) {
      if (!byFam.has(r.family)) byFam.set(r.family, []);
      byFam.get(r.family).push(r);
    }
    return [...byFam.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

  async function pick(r) {
    setError('');
    setLoadingSoc(r.soc);
    try {
      const payload = await loadOnetRole(r.soc);
      dispatch({ type: 'SET_ROLE', ...payload });
    } catch (e) {
      setError(e.message);
      setLoadingSoc(null);
    }
  }

  if (error) return <div className="err-note">{error}</div>;
  if (!index) return <div className="parse-note">Loading O*NET occupations…</div>;

  return (
    <>
      <div className="search-row">
        <Search size={16} className="search-icon" />
        <input
          autoFocus
          placeholder="Search 900+ roles — e.g. “recruiter”, “forklift”, “financial analyst”…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="role-results">
        {results.length === 0 && <div className="no-match">No roles match “{query}”. Try a different term.</div>}
        {grouped.map(([family, rows]) => (
          <div key={family}>
            <div className="role-family-label">{family}</div>
            {rows.map((r) => (
              <div key={r.soc} className="role-row" onClick={() => pick(r)}>
                <div>
                  <div className="rr-name">{r.title}{loadingSoc === r.soc ? ' — loading…' : ''}</div>
                  {r.alt && r.alt.length > 0 && (
                    <div className="rr-alt">also: {r.alt.slice(0, 3).join(', ')}</div>
                  )}
                </div>
                <div className="rr-soc">{r.soc}</div>
              </div>
            ))}
          </div>
        ))}
        {results.length > 400 && (
          <div className="no-match">Showing the first 400 — keep typing to narrow it down.</div>
        )}
      </div>
    </>
  );
}

function CustomUpload({ dispatch }) {
  const [roleName, setRoleName] = useState('');
  const [tasksText, setTasksText] = useState('');
  const [skillsText, setSkillsText] = useState('');
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  function onFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = parseCsvText(roleName || file.name.replace(/\.csv$/i, ''), String(reader.result));
        if (parsed.poolTasks.length) setTasksText(parsed.poolTasks.map((t) => t.text).join('\n'));
        if (parsed.skills.length) setSkillsText(parsed.skills.map((s) => `${s.name}, ${s.cat}`).join('\n'));
        if (!roleName) setRoleName(file.name.replace(/\.csv$/i, ''));
        setError('');
      } catch {
        setError('Could not parse that CSV. Make sure it has a Task column and/or a Skill column.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function downloadTemplate() {
    const blob = new Blob([templateCsv()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'role-redesign-template.csv';
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 100);
  }

  function proceed() {
    const payload = parsePasted(roleName, tasksText, skillsText);
    if (payload.poolTasks.length === 0) { setError('Add at least one task to continue.'); return; }
    if (payload.skills.length === 0) { setError('Add at least one skill to continue.'); return; }
    dispatch({ type: 'SET_ROLE', ...payload });
  }

  return (
    <>
      <input className="role-name-input" placeholder="Role name (e.g. “Claims Adjuster”)" value={roleName} onChange={(e) => setRoleName(e.target.value)} />
      <div className="upload-grid">
        <div className="upload-field">
          <label>Tasks</label>
          <div className="hint">One task per line.</div>
          <textarea placeholder={'Review and approve expense reports\nRespond to customer inquiries by email\nReconcile monthly invoices'} value={tasksText} onChange={(e) => setTasksText(e.target.value)} />
        </div>
        <div className="upload-field">
          <label>Skills</label>
          <div className="hint">One skill per line. Optionally add a category after a comma: Foundational &amp; Leadership, Core Role-Specific, or Baseline Applied.</div>
          <textarea placeholder={'Financial Analysis, Core\nWritten Communication, Foundational\nMicrosoft Excel, Baseline'} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </div>
      </div>
      <div className="upload-actions">
        <button className="file-btn" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload CSV</button>
        <button className="link-btn" onClick={downloadTemplate}><FileDown size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Download CSV template</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
      </div>
      {error && <div className="err-note" style={{ marginTop: 14 }}>{error}</div>}
      <div className="routing-nav" style={{ marginTop: 18 }}>
        <button className="btn btn-pri" onClick={proceed}>Continue to Clustering →</button>
      </div>
    </>
  );
}
