import { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import { computeResult } from './logic.js';

const STORAGE_KEY = 'role-redesign-open-state';

const EMPTY = {
  phase: 'intro',                  // intro | source | cluster | routing | skills
  role: null,                      // { name, soc?, source: 'onet'|'custom' }
  clusters: [],                    // [{ id, label, description, tasks:[{id,text}] }]
  poolTasks: [],                   // unclustered tasks during the cluster step: [{id,text}]
  skills: [],                      // [{ name, cat, def }]
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
    case 'SET_ROLE':
      return {
        ...EMPTY,
        phase: 'cluster',
        role: action.role,
        clusters: action.clusters,
        poolTasks: action.poolTasks || [],
        skills: action.skills,
      };

    case 'SET_CLUSTERS':
      return { ...state, clusters: action.clusters };

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
        return { ...state, poolTasks: [...poolTasks, task], clusters };
      }
      return {
        ...state,
        poolTasks,
        clusters: clusters.map((c) => (c.id === action.target ? { ...c, tasks: [...c.tasks, task] } : c)),
      };
    }

    // Permanently remove a task from the role (pool or any cluster).
    case 'DELETE_TASK':
      return {
        ...state,
        poolTasks: state.poolTasks.filter((t) => t.id !== action.taskId),
        clusters: state.clusters.map((c) => ({ ...c, tasks: c.tasks.filter((t) => t.id !== action.taskId) })),
      };

    case 'RENAME_CLUSTER':
      return {
        ...state,
        clusters: state.clusters.map((c) => (c.id === action.clusterId ? { ...c, label: action.label } : c)),
      };

    case 'ADD_CLUSTER': {
      const id = 'cl_' + Date.now();
      return { ...state, clusters: [...state.clusters, { id, label: '', description: '', tasks: [] }] };
    }

    case 'DELETE_CLUSTER': {
      const dead = state.clusters.find((c) => c.id === action.clusterId);
      if (!dead) return state;
      return {
        ...state,
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
