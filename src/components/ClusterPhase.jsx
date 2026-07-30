import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { usePlaceable } from '../workshop/usePlaceable.js';
import { taskCounts } from '../workshop/suggest.js';

const DETAIL_OPTS = [
  { key: 'few', label: 'Top 3' },
  { key: 'standard', label: 'Top 6' },
  { key: 'all', label: 'All' },
];

export default function ClusterPhase() {
  const { state, dispatch } = useWorkshop();
  const { clusters, poolTasks } = state;
  const [error, setError] = useState('');

  usePlaceable({
    itemSelector: '.task-card',
    zoneSelector: '.cluster-box-zone, .cl-pool',
    ignoreSelector: '.icon-btn, .task-del, .cluster-box-hdr input, .task-adder',
    onMove: (taskId, target) => dispatch({ type: 'MOVE_TASK', taskId, target }),
    hintText: () => 'Moving task — tap a cluster (or the pool) to drop it, or tap the task again to cancel.',
  });

  // Blocking issues (must be fixed before routing). Leftover pool tasks are NOT blocking —
  // they are simply excluded from routing (see advisory note below).
  const validation = useMemo(() => {
    const issues = [];
    if (clusters.length < 2) issues.push('Make at least 2 groups.');
    const empties = clusters.filter((c) => c.tasks.length === 0);
    if (empties.length) issues.push(`${empties.length} group${empties.length > 1 ? 's have' : ' has'} no tasks.`);
    const unnamed = clusters.filter((c) => !c.label.trim());
    if (unnamed.length) issues.push(`Give every group a name (${unnamed.length} still blank).`);
    return issues;
  }, [clusters]);

  function proceed() {
    if (validation.length) { setError(validation.join(' ')); return; }
    dispatch({ type: 'SET_CLUSTER_IDX', idx: 0 });
    dispatch({ type: 'SET_PHASE', phase: 'routing' });
  }

  const isOnet = state.role?.source === 'onet' && state.taskCatalog?.length > 0;
  const settings = state.clusterSettings;
  function changeSettings(patch) {
    if (state.clusterEdited &&
        !window.confirm('This will rebuild the groups from scratch. Your renames, moves, and added groups will be reset (deleted tasks stay deleted). Continue?')) return;
    dispatch({ type: 'SET_CLUSTER_SETTINGS', patch });
  }
  const counts = isOnet ? taskCounts(state.taskCatalog, settings, state.removedTaskIds) : null;

  const totalTasks = poolTasks.length + clusters.reduce((s, c) => s + c.tasks.length, 0);

  return (
    <div>
      <div className="cluster-step-bar">
        <div className="csb-info">
          <strong>Sort the tasks into groups.</strong> Each group gets one AI recommendation, so put similar work together.
          {state.role?.source === 'custom'
            ? ' Make a few groups and drag each task into the one where it fits.'
            : " We've grouped them for you as a starting point — rename, move, combine, add, or delete tasks however you like."}
          {' '}Use the <X size={11} style={{ verticalAlign: '-1px' }} /> to remove a task; the trash icon deletes a group.
          {' '}<span style={{ color: '#999' }}>{totalTasks} tasks · {clusters.length} groups</span>
        </div>
        <button className="cluster-add-btn" onClick={() => dispatch({ type: 'ADD_CLUSTER' })}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Add group</button>
      </div>

      {isOnet && settings && (
        <div className="task-filter-bar">
          <label className="tf-check">
            <input type="checkbox" checked={settings.coreOnly} onChange={(e) => changeSettings({ coreOnly: e.target.checked })} />
            Main tasks only
            <span className="tf-help" title="Show only the central tasks of the job and hide the occasional, peripheral ones.">ⓘ</span>
          </label>
          <div className="tf-seg-wrap">
            <span className="tf-seg-label">Tasks per group</span>
            <div className="tf-seg">
              {DETAIL_OPTS.map((o) => (
                <button key={o.key} className={settings.detail === o.key ? 'active' : ''} onClick={() => changeSettings({ detail: o.key })}>{o.label}</button>
              ))}
            </div>
            <span className="tf-help" title="Keeps the most important tasks in each group, ranked by how important and how often they're done. A group with fewer tasks than this simply shows all of them. ‘All’ shows every task.">ⓘ</span>
          </div>
          {counts && <span className="tf-count">showing {counts.shown} of {counts.available} tasks</span>}
        </div>
      )}

      <div className="cl-pool-label">
        Not in a group yet {poolTasks.length === 0 ? '— all sorted ✓' : `(${poolTasks.length})`}
        {poolTasks.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#b06a2a' }}> — anything left here is skipped</span>}
      </div>
      <div className="cl-pool" data-zone="pool">
        {poolTasks.length === 0
          ? <div className="empty-hint">Every task is in a group. Drag one back here to set it aside (it'll be skipped), or delete it.</div>
          : poolTasks.map((t) => <TaskCard key={t.id} task={t} onDelete={() => dispatch({ type: 'DELETE_TASK', taskId: t.id })} />)}
        <TaskAdder placeholder="Add a task the list is missing…" onAdd={(text) => dispatch({ type: 'ADD_TASK', text, target: 'pool' })} />
      </div>

      <div className="cluster-cols" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {clusters.map((c) => (
          <div key={c.id} className="cluster-box">
            <div className="cluster-box-hdr">
              <input
                placeholder="Group name…"
                value={c.label}
                onChange={(e) => dispatch({ type: 'RENAME_CLUSTER', clusterId: c.id, label: e.target.value })}
              />
              <button className="icon-btn" title="Delete this group (its tasks go back to the list)"
                onClick={() => dispatch({ type: 'DELETE_CLUSTER', clusterId: c.id })}>
                <Trash2 size={15} />
              </button>
            </div>
            <div className="cluster-box-zone" data-zone={c.id}>
              {c.tasks.length === 0
                ? <div className="empty-hint">Drop tasks here</div>
                : c.tasks.map((t) => <TaskCard key={t.id} task={t} onDelete={() => dispatch({ type: 'DELETE_TASK', taskId: t.id })} />)}
              <TaskAdder placeholder="Add a task to this group…" onAdd={(text) => dispatch({ type: 'ADD_TASK', text, target: c.id })} />
            </div>
          </div>
        ))}
      </div>

      {error && <div className="err-note">{error}</div>}
      <div className="routing-nav">
        <button className="btn btn-sec" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'source' })}>← Back</button>
        <button className="btn btn-pri" onClick={proceed} disabled={validation.length > 0}
          title={validation.length ? validation.join(' ') : ''}>
          Next: set the AI level →
        </button>
      </div>
    </div>
  );
}

function TaskAdder({ placeholder, onAdd }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  function commit() {
    const v = text.trim();
    if (!v) return;
    onAdd(v); setText(''); // keep open so several tasks can be added in a row
  }
  return (
    <div className="task-adder">
      {!open
        ? <button className="task-add-link" onClick={() => setOpen(true)}><Plus size={12} style={{ verticalAlign: '-2px' }} /> Add task</button>
        : <div className="task-add-input">
            <input autoFocus placeholder={placeholder} value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setText(''); setOpen(false); } }} />
            <button onClick={commit}>Add</button>
            <button className="ta-done" onClick={() => { setText(''); setOpen(false); }}>Done</button>
          </div>}
    </div>
  );
}

function TaskCard({ task, onDelete }) {
  return (
    <div className="task-card" draggable data-item={task.id} title={task.text}>
      <GripVertical size={13} className="tc-grip" />
      <span style={{ flex: 1 }}>{task.text}</span>
      {onDelete && (
        <button className="task-del" title="Remove this task from the role" onClick={onDelete}>
          <X size={13} />
        </button>
      )}
    </div>
  );
}
