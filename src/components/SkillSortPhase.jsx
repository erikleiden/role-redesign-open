import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { BUCKETS, CAT_CLASS, CAT_ORDER, LEVEL, GAP_TIPS } from '../workshop/config.js';
import { skillFate, autoFateLabel, fateExplanation, normalizePlacement } from '../workshop/logic.js';
import { usePlaceable } from '../workshop/usePlaceable.js';
import { downloadReport } from '../workshop/report.js';

const FATE_SORT = { Dropped: 0, 'Potential Drop': 1, Persists: 2, Foundational: 2.5, Deepens: 3, 'New Skill': 4, Unassigned: 5 };
const CHANGE_ICON = {
  Deepens: { c: '#1A2A4A', s: '↑' }, Persists: { c: '#B85520', s: '→' },
  'Potential Drop': { c: '#9B7200', s: '↓' }, Dropped: { c: '#7B2020', s: '✕' },
  'New Skill': { c: '#2C6E8A', s: '+' }, Foundational: { c: '#3D5A6B', s: '◆' }, Unassigned: { c: '#ccc', s: '·' },
};

export default function SkillSortPhase() {
  const { state, dispatch, results, constraints } = useWorkshop();
  const { clusters, skills, placements, drops, newSkills, fateOverrides } = state;
  const fateState = { drops, fateOverrides, placements, results };
  const defMap = useMemo(() => Object.fromEntries(skills.map((s) => [s.name, s.def || ''])), [skills]);

  usePlaceable({
    itemSelector: '.skill-pill',
    zoneSelector: '.cluster-drop-zone, #pool-drop-zone, .transversal-drop-zone',
    ignoreSelector: '.pill-drop-confirm, .fate-select, .pill-remove',
    onMove: (skill, target) => dispatch({ type: 'MOVE_SKILL', skill, target }),
    hintText: (name) => `Placing <strong>${name.replace(/</g, '')}</strong> — tap a group to add it there (you can add it to more than one), or tap the skill again to cancel.`,
  });

  const sortedClusters = useMemo(
    () => [...clusters].sort((a, b) => (LEVEL[results[b.id] || 'auto'] || 0) - (LEVEL[results[a.id] || 'auto'] || 0)),
    [clusters, results],
  );
  const catRank = (cat) => { const i = CAT_ORDER.indexOf(cat); return i === -1 ? 99 : i; };
  const sortedSkills = useMemo(() => [...skills].sort((a, b) => catRank(a.cat) - catRank(b.cat)), [skills]);
  // Custom roles have no skill categories — hide the legend and Category columns for them.
  const hasCategories = useMemo(() => skills.some((s) => s.cat), [skills]);

  const placedOf = (name) => normalizePlacement(placements[name]);
  const poolSkills = sortedSkills.filter((s) => placedOf(s.name).length === 0);
  const transversalSkills = sortedSkills.filter((s) => placedOf(s.name).includes('transversal'));
  const poolGaps = newSkills.filter((ns) => ns.clusterId === 'pool');
  const transversalGaps = newSkills.filter((ns) => ns.clusterId === 'transversal');

  const allEntries = useMemo(() => ([
    ...sortedSkills.map((s) => ({ name: s.name, cat: s.cat, gap: false })),
    ...newSkills.map((ns) => ({ name: ns.name, cat: 'Gap Skill', gap: true })),
  ]), [sortedSkills, newSkills]);

  return (
    <div>
      <div className="ss-header">
        <h2>Sort the Skills — {state.role?.name}</h2>
        <p>Drag each skill into the group(s) of work where it matters — or tap a skill, then tap a group. A skill can go in more than one group; its outcome is set by the group that most needs people. Where AI does most of the work, you can mark skills that are no longer needed.</p>
        <button className="btn-back" onClick={() => { dispatch({ type: 'SET_CLUSTER_IDX', idx: clusters.length - 1 }); dispatch({ type: 'SET_PHASE', phase: 'routing' }); }}>← Back</button>
      </div>

      <div className="ss-pool-label">All skills <span className="sub">— drag or tap each one into one or more groups below</span></div>
      <div id="pool-drop-zone" data-zone="pool">
        {poolSkills.length === 0 && poolGaps.length === 0
          ? <div className="pool-placeholder">All skills sorted</div>
          : <>
              {poolSkills.map((s) => <Pill key={s.name} name={s.name} cat={s.cat} def={defMap[s.name]} dropped={!!drops[s.name]} />)}
              {poolGaps.map((ns) => <Pill key={ns.id} name={ns.name} gap dropped={!!drops[ns.name]} />)}
            </>}
      </div>

      {hasCategories && (
        <div className="cat-legend">
          <span><span className="legend-dot" style={{ background: '#2C5F8A' }} />Foundational &amp; Leadership</span>
          <span><span className="legend-dot" style={{ background: '#5A7A3A' }} />Core Role-Specific</span>
          <span><span className="legend-dot" style={{ background: '#7A5A2A' }} />Baseline Applied</span>
        </div>
      )}

      <div className="seq-bar">Most human involvement <div className="seq-line" /> Full Auto</div>

      <div id="ss-columns" style={{ gridTemplateColumns: `repeat(${sortedClusters.length}, 1fr)` }}>
        {sortedClusters.map((c) => {
          const bucket = results[c.id] || 'auto';
          const bkt = BUCKETS[bucket];
          const placed = sortedSkills.filter((s) => placedOf(s.name).includes(c.id));
          const gaps = newSkills.filter((ns) => ns.clusterId === c.id);
          const fateText = bucket === 'hl' ? 'Skills here: Deepen' : bucket === 'hitl' ? 'Skills here: Persist' : 'Skills here: Potential Drop';
          return (
            <div key={c.id} className="cluster-col">
              <div className="cluster-col-header" style={{ background: bkt.color }}>
                <div className="bucket-badge">{bkt.label}</div>
                <h3>{c.label}</h3>
                <div className="fate-hint">{fateText}</div>
              </div>
              <div className="cluster-drop-zone" data-zone={c.id}>
                {placed.length === 0 && gaps.length === 0
                  ? <div className="empty-hint">Drop skills here</div>
                  : <>
                      {placed.map((s) => <Pill key={s.name} name={s.name} cat={s.cat} def={defMap[s.name]} bucket={bucket} dropped={!!drops[s.name]} multi={placedOf(s.name).length > 1} onRemove={() => dispatch({ type: 'UNPLACE_SKILL', skill: s.name, target: c.id })} onDrop={(ck) => dispatch({ type: 'TOGGLE_DROP', skill: s.name, checked: ck })} />)}
                      {gaps.map((ns) => <Pill key={ns.id} name={ns.name} gap bucket={bucket} dropped={!!drops[ns.name]} onDrop={(ck) => dispatch({ type: 'TOGGLE_DROP', skill: ns.name, checked: ck })} />)}
                    </>}
              </div>
              <GapAdder clusterId={c.id} tip={GAP_TIPS[bucket]} onAdd={(name) => dispatch({ type: 'ADD_GAP', name, clusterId: c.id })} />
            </div>
          );
        })}
      </div>

      <div className="transversal-zone">
        <div className="transversal-zone-hdr">
          <h3>Used across all groups</h3>
          <span>Skills that matter no matter how the work is split — worth investing in either way</span>
        </div>
        <div className="transversal-drop-zone" data-zone="transversal">
          {transversalSkills.length === 0 && transversalGaps.length === 0
            ? <div className="empty-hint">Drop skills used everywhere here</div>
            : <>
                {transversalSkills.map((s) => <Pill key={s.name} name={s.name} cat={s.cat} def={defMap[s.name]} dropped={!!drops[s.name]} />)}
                {transversalGaps.map((ns) => <Pill key={ns.id} name={ns.name} gap dropped={!!drops[ns.name]} />)}
              </>}
        </div>
      </div>

      <SummaryTable allEntries={allEntries} fateState={fateState} placements={placements} drops={drops}
        hasCategories={hasCategories}
        fateOverrides={fateOverrides} onOverride={(name, value) => dispatch({ type: 'SET_FATE_OVERRIDE', skill: name, value })}
        autoLabel={(name) => autoFateLabel(name, fateState)}
        explain={(name, gap) => fateExplanation(name, gap, fateState, { clusters, constraints })} />

      <BeforeAfter allEntries={allEntries} fateState={fateState} drops={drops} hasCategories={hasCategories} />

      <div className="export-row">
        <button className="btn-export" onClick={() => downloadReport(state, results, constraints)}>
          <Download size={15} /> Download summary
        </button>
      </div>
    </div>
  );
}

function Pill({ name, cat, def, gap, bucket, dropped, onDrop, onRemove, multi }) {
  const catCls = gap ? 'cat-gap' : (cat ? (CAT_CLASS[cat] || 'cat-baseline') : 'cat-none');
  const needsConfirm = bucket === 'hotl' || bucket === 'auto';
  return (
    <div className={`skill-pill ${catCls}${gap ? ' gap-pill' : ''}${dropped ? ' dropped' : ''}`}
      draggable data-item={name} title={multi ? `${name} — also in other groups` : (def || '')}>
      {multi && <span className="pill-multi" title="This skill is in more than one group">⧉</span>}
      <span style={{ flex: 1 }}>{name}</span>
      {needsConfirm && (
        <span className="pill-drop-confirm">
          <input type="checkbox" checked={!!dropped} onChange={(e) => onDrop?.(e.target.checked)} title="Confirm this skill can be dropped" />
          <label onClick={(e) => { e.preventDefault(); onDrop?.(!dropped); }}>Drop</label>
        </span>
      )}
      {onRemove && (
        <button className="pill-remove" title="Remove from this group" onClick={(e) => { e.stopPropagation(); onRemove(); }}>×</button>
      )}
    </div>
  );
}

function GapAdder({ tip, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  function commit() {
    const v = text.trim();
    if (!v) return;
    onAdd(v); setText(''); setOpen(false);
  }
  return (
    <div className="gap-wrap" title={tip}>
      {!open
        ? <button className="gap-btn" onClick={() => setOpen(true)}>+ Add a missing skill</button>
        : <div className="gap-input-wrap">
            <input autoFocus placeholder="Skill name…" value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setOpen(false); }} />
            <button onClick={commit}>Add</button>
          </div>}
    </div>
  );
}

function SummaryTable({ allEntries, fateState, placements, drops, fateOverrides, onOverride, autoLabel, explain, hasCategories }) {
  return (
    <div className="ss-summary">
      <h3>What happens to each skill <span className="sub">— the “Why” column shows what drove each suggestion; click any outcome to change it</span></h3>
      <table className="summary-table">
        <thead><tr><th>Skill</th>{hasCategories && <th>Category</th>}<th>What happens</th><th>Why this outcome</th></tr></thead>
        <tbody>
          {allEntries.map((s) => {
            const fate = skillFate(s.name, s.gap, fateState);
            const isDropped = drops[s.name];
            const isPlaced = !s.gap && normalizePlacement(placements[s.name]).length > 0;
            const override = fateOverrides[s.name] || '';
            const selCls = 'sel-' + fate.cls.replace('fate-', '');
            return (
              <tr key={s.name} className={isDropped ? 'skill-dropped' : ''}>
                <td><strong>{s.name}</strong></td>
                {hasCategories && <td style={{ color: '#888', fontSize: 11 }}>{s.cat}</td>}
                <td>
                  {isPlaced ? (
                    <select className={`fate-select ${selCls}`} value={isDropped ? 'dropped' : override}
                      onChange={(e) => onOverride(s.name, e.target.value)}>
                      <option value="">Suggested: {autoLabel(s.name)}</option>
                      <option value="deepens">Deepens</option>
                      <option value="persists">Persists</option>
                      <option value="potential-drop">Potential Drop</option>
                      <option value="dropped">Dropped</option>
                    </select>
                  ) : (
                    <span className={`tb-badge ${fate.cls}`}>{fate.label}</span>
                  )}
                </td>
                <td className="why-cell">{explain(s.name, s.gap)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function BeforeAfter({ allEntries, fateState, drops, hasCategories }) {
  const sorted = [...allEntries].sort((a, b) => {
    const fa = skillFate(a.name, a.gap, fateState).label;
    const fb = skillFate(b.name, b.gap, fateState).label;
    return (FATE_SORT[fa] ?? 5) - (FATE_SORT[fb] ?? 5);
  });
  const counts = { deepens: 0, persists: 0, foundational: 0, drop: 0, dropped: 0, new: 0, unassigned: 0 };
  for (const s of allEntries) {
    const f = skillFate(s.name, s.gap, fateState).label;
    if (f === 'Deepens') counts.deepens++;
    else if (f === 'Persists') counts.persists++;
    else if (f === 'Foundational') counts.foundational++;
    else if (f === 'Potential Drop') counts.drop++;
    else if (f === 'Dropped') counts.dropped++;
    else if (f === 'New Skill') counts.new++;
    else counts.unassigned++;
  }
  const stats = [];
  if (counts.deepens) stats.push(['deepens', `↑ ${counts.deepens} Deepening`]);
  if (counts.foundational) stats.push(['foundational', `◆ ${counts.foundational} Foundational`]);
  if (counts.persists) stats.push(['persists', `→ ${counts.persists} Persisting`]);
  if (counts.drop) stats.push(['drop', `↓ ${counts.drop} At Risk`]);
  if (counts.dropped) stats.push(['dropped', `✕ ${counts.dropped} Dropped`]);
  if (counts.new) stats.push(['new', `+ ${counts.new} New`]);
  if (counts.unassigned) stats.push(['unassigned', `· ${counts.unassigned} Unplaced`]);

  return (
    <div className="ba-section">
      <h3>Each skill: today vs. with AI</h3>
      <div className="ba-stats">
        {stats.length ? stats.map(([k, label]) => <span key={k} className={`ba-stat ${k}`}>{label}</span>)
          : <span style={{ color: '#aaa', fontSize: 12 }}>Sort skills into the groups above to see the impact.</span>}
      </div>
      <table className="ba-table">
        <thead><tr><th>Skill</th>{hasCategories && <th>Category</th>}<th>Today</th><th style={{ width: 32, textAlign: 'center' }} /><th>With AI</th></tr></thead>
        <tbody>
          {sorted.map((s) => {
            const fate = skillFate(s.name, s.gap, fateState);
            const ic = CHANGE_ICON[fate.label] || CHANGE_ICON.Unassigned;
            return (
              <tr key={s.name} className={drops[s.name] ? 'ba-dropped' : ''}>
                <td><strong>{s.name}</strong>{s.gap && <><br /><em style={{ color: '#aaa', fontSize: 10.5 }}>added skill</em></>}</td>
                {hasCategories && <td style={{ color: '#888', fontSize: 11 }}>{s.cat}</td>}
                <td>{s.gap ? <span style={{ color: '#bbb', fontSize: 12 }}>— (not in role yet)</span> : <span className="ba-badge-before">In the role</span>}</td>
                <td style={{ textAlign: 'center', width: 32 }}><span className="ba-change" style={{ color: ic.c }}>{ic.s}</span></td>
                <td><span className={`tb-badge ${fate.cls}`}>{fate.label}</span></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
