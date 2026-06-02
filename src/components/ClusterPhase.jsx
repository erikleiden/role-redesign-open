import { useMemo, useState } from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { useWorkshop } from '../workshop/state.jsx';
import { usePlaceable } from '../workshop/usePlaceable.js';

export default function ClusterPhase() {
  const { state, dispatch } = useWorkshop();
  const { clusters, poolTasks } = state;
  const [error, setError] = useState('');

  usePlaceable({
    itemSelector: '.task-card',
    zoneSelector: '.cluster-box-zone, .cl-pool',
    ignoreSelector: '.icon-btn, .cluster-box-hdr input',
    onMove: (taskId, target) => dispatch({ type: 'MOVE_TASK', taskId, target }),
    hintText: () => 'Moving task — tap a cluster (or the pool) to drop it, or tap the task again to cancel.',
  });

  const validation = useMemo(() => {
    const issues = [];
    if (poolTasks.length > 0) issues.push(`${poolTasks.length} task${poolTasks.length > 1 ? 's are' : ' is'} still unclustered.`);
    if (clusters.length < 2) issues.push('Create at least 2 clusters.');
    const empties = clusters.filter((c) => c.tasks.length === 0);
    if (empties.length) issues.push(`${empties.length} cluster${empties.length > 1 ? 's have' : ' has'} no tasks.`);
    const unnamed = clusters.filter((c) => !c.label.trim());
    if (unnamed.length) issues.push(`Name every cluster (${unnamed.length} unnamed).`);
    return issues;
  }, [clusters, poolTasks]);

  function proceed() {
    if (validation.length) { setError(validation.join(' ')); return; }
    dispatch({ type: 'SET_CLUSTER_IDX', idx: 0 });
    dispatch({ type: 'SET_PHASE', phase: 'routing' });
  }

  const totalTasks = poolTasks.length + clusters.reduce((s, c) => s + c.tasks.length, 0);

  return (
    <div>
      <div className="cluster-step-bar">
        <div className="csb-info">
          <strong>Group tasks into clusters.</strong> Each cluster is routed through the framework as one unit of work.
          {state.role?.source === 'onet'
            ? ' These suggested clusters come from O*NET work activities — rename, merge, split, or move tasks as needed.'
            : ' Create clusters and drag each task into the one where it fits.'}
          {' '}<span style={{ color: '#999' }}>{totalTasks} tasks · {clusters.length} clusters</span>
        </div>
        <button className="cluster-add-btn" onClick={() => dispatch({ type: 'ADD_CLUSTER' })}><Plus size={13} style={{ verticalAlign: '-2px' }} /> Add cluster</button>
      </div>

      <div className="cl-pool-label">Unclustered tasks {poolTasks.length === 0 ? '— all placed ✓' : `(${poolTasks.length})`}</div>
      <div className="cl-pool" data-zone="pool">
        {poolTasks.length === 0
          ? <div className="empty-hint">All tasks have been placed into clusters. Drag one back here to reassign it.</div>
          : poolTasks.map((t) => <TaskCard key={t.id} task={t} />)}
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
                : c.tasks.map((t) => <TaskCard key={t.id} task={t} />)}
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

function TaskCard({ task }) {
  return (
    <div className="task-card" draggable data-item={task.id} title={task.text}>
      <GripVertical size={13} className="tc-grip" />
      <span>{task.text}</span>
    </div>
  );
}
