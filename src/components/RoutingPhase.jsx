import { useState } from 'react';
import { useWorkshop } from '../workshop/state.jsx';
import { ROUTING_QUESTIONS, LEVEL, BUCKETS, CELL_COLORS, BADGE_LABELS } from '../workshop/config.js';
import { computeResult, currentFloorLevel, answeredCount } from '../workshop/logic.js';

export default function RoutingPhase() {
  const { state, dispatch } = useWorkshop();
  const { clusters, clusterIdx } = state;
  const [tasksOpen, setTasksOpen] = useState(true);

  const idx = Math.min(clusterIdx, clusters.length - 1);
  const cluster = clusters[idx];
  if (!cluster) return null;
  const answers = state.answers[cluster.id] || {};
  const floorLv = currentFloorLevel(answers);
  const { bucket, sourceLabel } = computeResult(answers);
  const nAnswered = answeredCount(answers);
  const totalQ = ROUTING_QUESTIONS.length;

  const isLast = idx === clusters.length - 1;
  const nextLabel = isLast ? 'Next: sort the skills →' : 'Next group →';

  function selectAnswer(qId, score) {
    dispatch({ type: 'SET_ANSWER', clusterId: cluster.id, qId, score });
  }
  function next() {
    if (isLast) dispatch({ type: 'SET_PHASE', phase: 'skills' });
    else dispatch({ type: 'SET_CLUSTER_IDX', idx: idx + 1 });
  }
  function prev() {
    if (idx > 0) dispatch({ type: 'SET_CLUSTER_IDX', idx: idx - 1 });
  }

  // group questions for rendering with dividers
  const rows = [];
  let lastGroup = null;
  for (const q of ROUTING_QUESTIONS) {
    if (q.group !== lastGroup) {
      rows.push({ divider: true, group: q.group, groupLabel: q.groupLabel, groupDesc: q.groupDesc, key: 'd' + q.group });
      lastGroup = q.group;
    }
    rows.push({ q, key: q.id });
  }

  let qLabelFloorClass = '';
  if (floorLv >= LEVEL.hl) qLabelFloorClass = ' floor-hl';
  else if (floorLv >= LEVEL.hitl) qLabelFloorClass = ' floor-hitl';
  else if (floorLv >= LEVEL.hotl) qLabelFloorClass = ' floor-hotl';

  return (
    <div>
      <div className="cluster-progress">
        <div className="cp-label">Group {idx + 1} of {clusters.length}</div>
        <div className="cp-pips">
          {clusters.map((c, i) => (
            <div key={c.id} className={`cp-pip ${i < idx ? 'done' : i === idx ? 'active' : ''}`}>{i + 1}</div>
          ))}
        </div>
      </div>

      <div className="cluster-card">
        <h2>{cluster.label}</h2>
        {cluster.description && <p>{cluster.description}</p>}
        {cluster.tasks?.length > 0 && (
          <>
            <button className={`tasks-toggle ${tasksOpen ? 'open' : ''}`} onClick={() => setTasksOpen((o) => !o)}>
              <span className="tasks-arrow">▶</span> Tasks ({cluster.tasks.length})
            </button>
            {tasksOpen && (
              <ul className="tasks-list">
                {cluster.tasks.map((t) => <li key={t.id}>{t.text}</li>)}
              </ul>
            )}
          </>
        )}
      </div>

      <div className="questions-wrap">
        <div className="dir-bar">
          <div className="dir-spacer" />
          <div className="dir-text">← A person does more &nbsp;·&nbsp; AI does more →</div>
        </div>
        {floorLv > 0 && (
          <div className="ratchet-note">
            <strong>Greyed-out options</strong> won't change the recommendation anymore — an earlier answer already means
            this work needs more human involvement. You can still change any answer.
          </div>
        )}
        {rows.map((row) => {
          if (row.divider) {
            const gClass = ['', 'g1', 'g2', 'g3'][row.group];
            return (
              <div key={row.key} className={`group-divider ${gClass}`}>
                <span>{row.groupLabel}</span>
                <span className="g-desc">{row.groupDesc}</span>
              </div>
            );
          }
          const q = row.q;
          const selectedScore = answers[q.id];
          let ceilIdx = -1;
          q.options.forEach((o, i) => { if ((LEVEL[o.min] || 0) >= floorLv) ceilIdx = i; });
          return (
            <div key={row.key} className="q-row">
              <div className={`q-label${qLabelFloorClass}`}>
                <div className="q-num">Q{ROUTING_QUESTIONS.indexOf(q) + 1}</div>
                <div className="q-name">{q.label}</div>
                <div className="q-text">{q.text}</div>
              </div>
              <div className="answers-row">
                {q.options.map((opt, oi) => {
                  const cc = CELL_COLORS[opt.min] || CELL_COLORS.none;
                  const optLevel = LEVEL[opt.min] || 0;
                  const minClass = opt.min === 'none' ? 'none-min' : opt.min;
                  let cls = `a-cell ${minClass}`;
                  if (selectedScore === opt.score) cls += ' selected';
                  if (floorLv > 0 && optLevel < floorLv) cls += ' floor-locked';
                  if (floorLv > 0 && oi === ceilIdx && ceilIdx < q.options.length - 1) cls += ' floor-ceil-' + bucket;
                  return (
                    <div key={opt.score} className={cls} style={{ background: cc.bg, color: cc.text }}
                      onClick={() => selectAnswer(q.id, opt.score)}>
                      <div className="a-label">{opt.label}</div>
                      <div className="a-sub">{opt.sub}</div>
                      <div className="a-badge">{BADGE_LABELS[opt.min]}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="result-bar">
        <span className="result-label-sm">Suggested level:</span>
        {nAnswered === 0 ? (
          <>
            <span className="result-badge result-badge-empty">Answer below</span>
            <span className="result-constraint">Answer the questions below and a suggestion will appear here.</span>
          </>
        ) : (
          <>
            <span className="result-badge" style={{ background: BUCKETS[bucket].color }}>{BUCKETS[bucket].label}</span>
            <span className="result-constraint">
              {sourceLabel ? <>Main reason: <strong>{sourceLabel}</strong></> : 'Nothing here requires a person — this could be fully automated.'}
            </span>
            <span className={`answered-count${nAnswered === totalQ ? ' done' : ''}`}>
              {nAnswered === totalQ ? `✓ All ${totalQ} answered` : `${nAnswered} of ${totalQ} answered`}
            </span>
          </>
        )}
      </div>

      <div className="routing-nav">
        <button className="btn btn-sec" onClick={prev} disabled={idx === 0}>← Back</button>
        <button className="btn btn-pri" onClick={next}>{nextLabel}</button>
      </div>
    </div>
  );
}
