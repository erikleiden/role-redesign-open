import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical, X } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { usePlaceable } from '../workshop/usePlaceable.js';
import { taskCounts } from '../workshop/suggest.js';

const DETAIL_OPTS = [
  { key: 'few', label: 'Few' },
  { key: 'standard', label: 'Standard' },
  { key: 'all', label: 'All' },
];

export default function ClusterPhase() {
  const { state, dispatch } = useWorkshop();
  const { clusters, poolTasks } = state;
  const [error, setError] = useState('');

  usePlaceable({
    itemSelector: '.task-card',
    zoneSelector: '.cluster-box-zone, .cl-pool',
    ignoreSelector: '.icon-btn, .task-del, .cluster-box-hdr input',
    onMove: (taskId, target) => dispatch({ type: 'MOVE_TASK', taskId, target }),
    hintText: () => 'Moving task — tap a cluster (or the pool) to drop it, or tap the task again to cancel.',
  });

  // Blocking issues (must be fixed before routing). Leftover pool tasks are NOT blocking —
  // they are simply excluded from routing (see advisory note below).
  const validation = useMemo(() => {
    const issues = [];
    if (clusters.length < 2) issues.push('Create at least 2 clusters.');
    const empties = clusters.filter((c) => c.tasks.length === 0);
    if (empties.length) issues.push(`${empties.length} cluster${empties.length > 1 ? 's have' : ' has'} no tasks.`);
    const unnamed = clusters.filter((c) => !c.label.trim());
    if (unnamed.length) issues.push(`Name every cluster (${unnamed.length} unnamed).`);
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
        !window.confirm('Re-suggesting rebuilds the clusters from O*NET. Your renames, moves, and added clusters will be reset (deleted tasks stay removed). Continue?')) return;
    dispatch({ type: 'SET_CLUSTER_SETTINGS', patch });
  }
  const counts = isOnet ? taskCounts(state.taskCatalog, settings, state.removedTaskIds) : null;

  const totalTasks = poolTasks.length + clusters.reduce((s, c) => s + c.tasks.length, 0);

  return (
    <div>
      <div className="cluster-step-bar">
        <div className="csb-info">
          <strong>Group tasks into clusters.</strong> Each cluster is routed through the framework as one unit of work.
          {state.role?.source === 'onet'
            ? ' These suggested clusters come from O*NET work activities — rename, split, merge, move, or delete tasks as needed.'
            : ' Create clusters and drag each task into the one where it fits.'}
          {' '}Use the <X size={11} style={{ verticalAlign: '-1px' }} /> on a task to remove it; the trash icon deletes a cluster.
          {' '}<span style={{ color: '#999' }}>{totalTasks} tasks · {clusters.length} clusters</span>
        </div>
        <button className="cluster-add-btn" onClick={() => dispatch({ type: 'ADD_CLUSTER' })}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Add cluster</button>
      </div>

      {isOnet && settings && (
        <div className="task-filter-bar">
          <label className="tf-check">
            <input type="checkbox" checked={settings.coreOnly} onChange={(e) => changeSettings({ coreOnly: e.target.checked })} />
            Core tasks only
            <span className="tf-help" title="Show only O*NET “Core” tasks — the central duties — and hide peripheral “Supplemental” ones.">ⓘ</span>
          </label>
          <div className="tf-seg-wrap">
            <span className="tf-seg-label">Detail</span>
            <div className="tf-seg">
              {DETAIL_OPTS.map((o) => (
                <button key={o.key} className={settings.detail === o.key ? 'active' : ''} onClick={() => changeSettings({ detail: o.key })}>{o.label}</button>
              ))}
            </div>
            <span className="tf-help" title="How many tasks to keep per cluster, ranked by importance × how often the task is performed. Few = top 3, Standard = top 6, All = every task.">ⓘ</span>
          </div>
          {counts && <span className="tf-count">showing {counts.shown} of {counts.available} O*NET tasks</span>}
        </div>
      )}

      <div className="cl-pool-label">
        Unclustered tasks {poolTasks.length === 0 ? '— all placed ✓' : `(${poolTasks.length})`}
        {poolTasks.length > 0 && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: '#b06a2a' }}> — these will be excluded from routing</span>}
      </div>
      <div className="cl-pool" data-zone="pool">
        {poolTasks.length === 0
          ? <div className="empty-hint">All tasks have been placed into clusters. Drag one back here to set it aside (it won't be routed), or delete it.</div>
          : poolTasks.map((t) => <TaskCard key={t.id} task={t} onDelete={() => dispatch({ type: 'DELETE_TASK', taskId: t.id })} />)}
      </div>

      <div className="cluster-cols" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
        {clusters.map((c) => (
          <div key={c.id} className="cluster-box">
            <div className="cluster-box-hdr">
              <input
                placeholder="Cluster name…"
                value={c.label}
                onChange={(e) => dispatch({ type: 'RENAME_CLUSTER', clusterId: c.id, label: e.target.value })}
              />
              <button className="icon-btn" title="Delete cluster (tasks return to the pool)"
                onClick={() => dispatch({ type: 'DELETE_CLUSTER', clusterId: c.id })}>
                <Trash2 size={15} />
              </button>
            </div>
            <div className="cluster-box-zone" data-zone={c.id}>
              {c.tasks.length === 0
                ? <div className="empty-hint">Drop tasks here</div>
                : c.tasks.map((t) => <TaskCard key={t.id} task={t} onDelete={() => dispatch({ type: 'DELETE_TASK', taskId: t.id })} />)}
            </div>
          </div>
        ))}
      </div>

      {error && <div className="err-note">{error}</div>}
      <div className="routing-nav">
        <button className="btn btn-sec" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'source' })}>← Back</button>
        <button className="btn btn-pri" onClick={proceed} disabled={validation.length > 0}
          title={validation.length ? validation.join(' ') : ''}>
          Continue to Routing →
        </button>
      </div>
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
