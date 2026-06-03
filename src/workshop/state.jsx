import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { computeResult } from './logic.js';
import { suggestClusters, DEFAULT_CLUSTER_SETTINGS } from './suggest.js';

const STORAGE_KEY = 'role-redesign-open-state';

const EMPTY = {
  phase: 'intro',                  // intro | source | cluster | routing | skills
  role: null,                      // { name, soc?, source: 'onet'|'custom' }
  clusters: [],                    // [{ id, label, description, tasks:[{id,text}] }]
  poolTasks: [],                   // unclustered tasks during the cluster step: [{id,text}]
  skills: [],                      // [{ name, cat, def }]
  // O*NET task filtering (unused for custom roles):
  taskCatalog: [],                 // full task list with metadata: [{id,text,core,score,domain}]
  clusterSettings: null,           // { coreOnly, detail } — null for custom roles
  removedTaskIds: [],              // tasks the user deleted (excluded from re-suggest)
  clusterEdited: false,            // manual cluster edits made since last (re)suggest
  clusterIdx: 0,
  answers: {},                     // clusterId -> { q1:score, ... }
  placements: {},                  // skillName -> clusterId | 'pool' | 'transversal'
  drops: {},                       // skillName -> true
  newSkills: [],                   // [{ name, clusterId, id }]
  fateOverrides: {},               // skillName -> 'deepens'|'persists'|'potential-drop'
  defsOpen: false,
};

function reducer(state, action) {
  switch (action.type) {
    case 'LOAD':
      return { ...EMPTY, ...action.state };

    case 'SET_PHASE':
      return { ...state, phase: action.phase };

    case 'TOGGLE_DEFS':
      return { ...state, defsOpen: !state.defsOpen };

    // Load a fresh role (from O*NET or custom upload). Resets all downstream work.
    case 'SET_ROLE': {
      const base = { ...EMPTY, phase: 'cluster', role: action.role, skills: action.skills };
      if (action.taskCatalog) {
        // O*NET: build suggested clusters from the catalog using default filter settings.
        const settings = { ...DEFAULT_CLUSTER_SETTINGS };
        const { clusters, poolTasks } = suggestClusters(action.taskCatalog, settings, []);
        return { ...base, taskCatalog: action.taskCatalog, clusterSettings: settings, removedTaskIds: [], clusters, poolTasks };
      }
      // Custom upload: tasks start in the pool; user builds clusters manually.
      return { ...base, clusters: action.clusters || [], poolTasks: action.poolTasks || [], clusterSettings: null };
    }

    // Re-suggest O*NET clusters when the Core-only / detail controls change.
    case 'SET_CLUSTER_SETTINGS': {
      const settings = { ...state.clusterSettings, ...action.patch };
      const { clusters, poolTasks } = suggestClusters(state.taskCatalog, settings, state.removedTaskIds);
      return { ...state, clusterSettings: settings, clusters, poolTasks, clusterEdited: false };
    }

    case 'SET_CLUSTERS':
      return { ...state, clusters: action.clusters, clusterEdited: true };

    // Move a task between the pool and clusters (clustering step).
    case 'MOVE_TASK': {
      let task = state.poolTasks.find((t) => t.id === action.taskId);
      const poolTasks = task ? state.poolTasks.filter((t) => t.id !== action.taskId) : [...state.poolTasks];
      const clusters = state.clusters.map((c) => {
        if (!task) { const f = c.tasks.find((t) => t.id === action.taskId); if (f) task = f; }
        return { ...c, tasks: c.tasks.filter((t) => t.id !== action.taskId) };
      });
      if (!task) return state;
      if (action.target === 'pool') {
        return { ...state, clusterEdited: true, poolTasks: [...poolTasks, task], clusters };
      }
      return {
        ...state,
        clusterEdited: true,
        poolTasks,
        clusters: clusters.map((c) => (c.id === action.target ? { ...c, tasks: [...c.tasks, task] } : c)),
      };
    }

    // Permanently remove a task from the role (pool or any cluster). Stays removed across re-suggest.
    case 'DELETE_TASK':
      return {
        ...state,
        clusterEdited: true,
        removedTaskIds: state.removedTaskIds.includes(action.taskId) ? state.removedTaskIds : [...state.removedTaskIds, action.taskId],
        poolTasks: state.poolTasks.filter((t) => t.id !== action.taskId),
        clusters: state.clusters.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== action.taskId) })),
      };

    case 'RENAME_CLUSTER':
      return {
        ...state,
        clusterEdited: true,
        clusters: state.clusters.map((c) => (c.id === action.clusterId ? { ...c, label: action.label } : c)),
      };

    case 'ADD_CLUSTER': {
      const id = 'cl_' + Date.now();
      return { ...state, clusterEdited: true, clusters: [...state.clusters, { id, label: '', description: '', tasks: [] }] };
    }

    case 'DELETE_CLUSTER': {
      const dead = state.clusters.find((c) => c.id === action.clusterId);
      if (!dead) return state;
      return {
        ...state,
        clusterEdited: true,
        poolTasks: [...state.poolTasks, ...dead.tasks],
        clusters: state.clusters.filter((c) => c.id !== action.clusterId),
      };
    }

    case 'SET_CLUSTER_IDX':
      return { ...state, clusterIdx: action.idx };

    case 'SET_ANSWER': {
      const cur = state.answers[action.clusterId] || {};
      return {
        ...state,
        answers: { ...state.answers, [action.clusterId]: { ...cur, [action.qId]: action.score } },
      };
    }

    case 'MOVE_SKILL':
      return { ...state, placements: { ...state.placements, [action.skill]: action.target } };

    case 'TOGGLE_DROP': {
      const drops = { ...state.drops };
      const overrides = { ...state.fateOverrides };
      if (action.checked) { drops[action.skill] = true; delete overrides[action.skill]; }
      else delete drops[action.skill];
      return { ...state, drops, fateOverrides: overrides };
    }

    case 'SET_FATE_OVERRIDE': {
      const drops = { ...state.drops };
      const overrides = { ...state.fateOverrides };
      delete drops[action.skill];
      if (action.value === '' || action.value == null) delete overrides[action.skill];
      else if (action.value === 'dropped') { delete overrides[action.skill]; drops[action.skill] = true; }
      else overrides[action.skill] = action.value;
      return { ...state, drops, fateOverrides: overrides };
    }

    case 'ADD_GAP': {
      if (state.newSkills.some((ns) => ns.name === action.name)) return state;
      return {
        ...state,
        newSkills: [...state.newSkills, { name: action.name, clusterId: action.clusterId, id: 'gap_' + Date.now() }],
      };
    }

    case 'CHANGE_ROLE':
      return { ...EMPTY, phase: 'source' };

    case 'RESET':
      return { ...EMPTY };

    default:
      return state;
  }
}

const Ctx = createContext(null);

export function WorkshopProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, EMPTY, (init) => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.role) return { ...init, ...saved };
      }
    } catch { /* ignore */ }
    return init;
  });

  // Persist whenever meaningful state changes (skip the transient defs toggle being fine to save too)
  useEffect(() => {
    try {
      if (!state.role) { localStorage.removeItem(STORAGE_KEY); return; }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state]);

  // Derive routing results + binding constraints from answers (single source of truth).
  const { results, constraints } = useMemo(() => {
    const results = {};
    const constraints = {};
    for (const c of state.clusters) {
      const { bucket, sourceQId, sourceLabel } = computeResult(state.answers[c.id] || {});
      results[c.id] = bucket;
      if (sourceQId) constraints[c.id] = { qId: sourceQId, label: sourceLabel };
    }
    return { results, constraints };
  }, [state.clusters, state.answers]);

  return <Ctx.Provider value={{ state, dispatch, results, constraints }}>{children}</Ctx.Provider>;
}

export function useWorkshop() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkshop must be used within WorkshopProvider');
  return ctx;
}
