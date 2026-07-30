import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, Upload, FileDown } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { loadOnetIndex, loadOnetRole } from '../workshop/onet.js';
import { parsePasted, parseCsvText, templateCsv } from '../workshop/parseUpload.js';
import { skillsFirstCategories, loadSkillsFirstRole } from '../workshop/skillsFirst.js';

export default function SourcePhase() {
  const { dispatch } = useWorkshop();
  const [tab, setTab] = useState('skillsfirst');

  return (
    <div className="panel">
      <div className="panel-hdr">
        <h2>Pick a Role</h2>
        <p>Start with one of our 30 Skills-First profiles, pull any O*NET occupation, or upload your own tasks and skills.</p>
      </div>
      <div className="panel-body">
        <div className="source-toggle">
          <button className={tab === 'skillsfirst' ? 'active' : ''} onClick={() => setTab('skillsfirst')}>Skills-First profile</button>
          <button className={tab === 'onet' ? 'active' : ''} onClick={() => setTab('onet')}>O*NET occupation</button>
          <button className={tab === 'custom' ? 'active' : ''} onClick={() => setTab('custom')}>Upload your own</button>
        </div>
        {tab === 'skillsfirst'
          ? <SkillsFirstPicker dispatch={dispatch} />
          : tab === 'onet'
            ? <OnetSearch dispatch={dispatch} />
            : <CustomUpload dispatch={dispatch} />}
      </div>
    </div>
  );
}

function SkillsFirstPicker({ dispatch }) {
  const cats = useMemo(() => skillsFirstCategories(), []);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(null);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cats
      .map((c) => ({ ...c, roles: q ? c.roles.filter((r) => r.name.toLowerCase().includes(q)) : c.roles }))
      .filter((c) => c.roles.length > 0);
  }, [cats, query]);

  const total = useMemo(() => cats.reduce((s, c) => s + c.roles.length, 0), [cats]);

  function pick(name) {
    setLoading(name);
    try { dispatch({ type: 'SET_ROLE', ...loadSkillsFirstRole(name) }); }
    catch { setLoading(null); }
  }

  return (
    <>
      <div className="parse-note">
        These 30 roles come <strong>pre-grouped</strong> with curated tasks and skills. Pick one and you'll go straight to reviewing its task groups.
      </div>
      <div className="search-row">
        <Search size={16} className="search-icon" />
        <input
          autoFocus
          placeholder={`Search the ${total} Skills-First profiles — e.g. “financial analyst”, “software developer”`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="role-results">
        {groups.length === 0 && <div className="no-match">No profiles match “{query}”. Try a different term.</div>}
        {groups.map((c) => (
          <div key={c.key}>
            <div className="role-family-label">{c.label}</div>
            {c.roles.map((r) => (
              <div key={r.name} className="role-row" onClick={() => pick(r.name)}>
                <div>
                  <div className="rr-name">{r.icon ? r.icon + ' ' : ''}{r.name}{loading === r.name ? ' — loading…' : ''}</div>
                  {r.workers && <div className="rr-alt">{r.workers}</div>}
                </div>
                <div className="rr-soc">Skills-First</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
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
  if (!index) return <div className="parse-note">Loading roles…</div>;

  return (
    <>
      <div className="search-row">
        <Search size={16} className="search-icon" />
        <input
          autoFocus
          placeholder="Search 900+ roles by title — e.g. “registered nurse”, “financial analyst”, “machinist”"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="role-results">
        {results.length === 0 && <div className="no-match">No roles match “{query}”. Try a different term.</div>}
        {grouped.map(([family, rows]) => (
          <div key={family}>
            <div className="role-family-label">{family}</div>
            {rows.map((r) => {
              const q = query.trim().toLowerCase();
              const titleMatches = q && r.title.toLowerCase().includes(q);
              const matchedAlt = q && !titleMatches ? (r.alt || []).find((a) => a.toLowerCase().includes(q)) : null;
              return (
                <div key={r.soc} className="role-row" onClick={() => pick(r)}>
                  <div>
                    <div className="rr-name">{r.title}{loadingSoc === r.soc ? ' — loading…' : ''}</div>
                    {matchedAlt
                      ? <div className="rr-alt">matches “{matchedAlt}”</div>
                      : (r.alt && r.alt.length > 0 && <div className="rr-alt">also: {r.alt.slice(0, 3).join(', ')}</div>)}
                  </div>
                  <div className="rr-soc">{r.soc}</div>
                </div>
              );
            })}
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
        if (parsed.skills.length) setSkillsText(parsed.skills.map((s) => s.name).join('\n'));
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
      <div className="parse-note">
        <strong>Tasks vs. skills:</strong> a <strong>task</strong> is something the person <em>does</em> in the job
        (e.g. “review insurance claims”). A <strong>skill</strong> is an ability or knowledge they <em>use</em> to do it
        (e.g. “negotiation”, “attention to detail”).
      </div>
      <div className="upload-grid">
        <div className="upload-field">
          <label>Tasks</label>
          <div className="hint">What the person does — one activity per line.</div>
          <textarea placeholder={'Review and approve expense reports\nRespond to customer inquiries by email\nReconcile monthly invoices'} value={tasksText} onChange={(e) => setTasksText(e.target.value)} />
        </div>
        <div className="upload-field">
          <label>Skills</label>
          <div className="hint">What they use to do the work — one per line.</div>
          <textarea placeholder={'Financial Analysis\nWritten Communication\nMicrosoft Excel'} value={skillsText} onChange={(e) => setSkillsText(e.target.value)} />
        </div>
      </div>
      <div className="upload-actions">
        <button className="file-btn" onClick={() => fileRef.current?.click()}><Upload size={14} /> Upload CSV</button>
        <button className="link-btn" onClick={downloadTemplate}><FileDown size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />Download CSV template</button>
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={onFile} />
      </div>
      {error && <div className="err-note" style={{ marginTop: 14 }}>{error}</div>}
      <div className="routing-nav" style={{ marginTop: 18 }}>
        <button className="btn btn-pri" onClick={proceed}>Next: group the tasks →</button>
      </div>
    </>
  );
}
