import bgiLogo from './assets/BGILogo.png';
import { useWorkshop } from './workshop/state.jsx';
import IntroPhase from './components/IntroPhase.jsx';
import SourcePhase from './components/SourcePhase.jsx';
import ClusterPhase from './components/ClusterPhase.jsx';
import RoutingPhase from './components/RoutingPhase.jsx';
import SkillSortPhase from './components/SkillSortPhase.jsx';

const STEPS = [
  { key: 'source',  label: '1 · Role' },
  { key: 'cluster', label: '2 · Cluster' },
  { key: 'routing', label: '3 · Routing' },
  { key: 'skills',  label: '4 · Skills' },
];

export default function App() {
  const { state, dispatch } = useWorkshop();
  const { phase, role, defsOpen } = state;
  const inApp = phase !== 'intro';
  const curIdx = STEPS.findIndex((s) => s.key === phase);

  function changeRole() {
    const hasWork = Object.keys(state.answers).length > 0 || Object.keys(state.placements).length > 0;
    if (hasWork && !window.confirm('Switching roles will reset your clustering, routing, and skill-sort progress. Continue?')) return;
    dispatch({ type: 'CHANGE_ROLE' });
  }
  function startOver() {
    if (!window.confirm('Start over from the beginning? This clears all current work.')) return;
    dispatch({ type: 'RESET' });
  }

  return (
    <>
      <header id="app-header">
        <div className="header-left">
          <a href="https://burningglassinstitute.org" target="_blank" rel="noreferrer">
            <img className="header-logo" src={bgiLogo} alt="Burning Glass Institute" />
          </a>
          <div className="header-titles">
            <h1>Role Redesign — AI Routing Workshop</h1>
            {role && phase !== 'source' && phase !== 'intro' && (
              <div id="role-badge">{role.name}</div>
            )}
          </div>
        </div>
        <div className="header-right">
          {role && inApp && phase !== 'source' && (
            <button className="hdr-btn" onClick={changeRole}>← Change Role</button>
          )}
          {(phase === 'routing' || phase === 'skills') && (
            <button className="hdr-btn" onClick={() => dispatch({ type: 'TOGGLE_DEFS' })}>
              Definitions {defsOpen ? '▴' : '▾'}
            </button>
          )}
          {inApp && (
            <div className="phase-stepper">
              {STEPS.map((s, i) => {
                const cls = s.key === phase ? 'active' : (curIdx > -1 && i < curIdx) ? 'done' : '';
                const clickable = cls === 'done';
                return (
                  <div key={s.key}
                    className={`phase-pip ${cls}`}
                    onClick={clickable ? () => dispatch({ type: 'SET_PHASE', phase: s.key }) : undefined}>
                    {s.label}
                  </div>
                );
              })}
            </div>
          )}
          {inApp && <button className="hdr-btn" onClick={startOver}>↺ Start Over</button>}
        </div>
      </header>

      {defsOpen && (phase === 'routing' || phase === 'skills') && (
        <div id="defs-panel">
          <div className="def-item"><div className="def-swatch" style={{ background: '#7B2020' }} />
            <div className="def-label"><strong>Human-Led</strong><span>Human does the work; AI may assist in prep only</span></div></div>
          <div className="def-item"><div className="def-swatch" style={{ background: '#B85520' }} />
            <div className="def-label"><strong>Human-in-the-Loop (HITL)</strong><span>AI drafts or processes; human reviews every output</span></div></div>
          <div className="def-item"><div className="def-swatch" style={{ background: '#9B7200' }} />
            <div className="def-label"><strong>Human-on-the-Loop (HOTL)</strong><span>AI operates; human monitors and intervenes when needed</span></div></div>
          <div className="def-item"><div className="def-swatch" style={{ background: '#4a4a4a' }} />
            <div className="def-label"><strong>Full Auto</strong><span>AI handles end-to-end; periodic human spot-check only</span></div></div>
        </div>
      )}

      <main className="container">
        {phase === 'intro' && <IntroPhase />}
        {phase === 'source' && <SourcePhase />}
        {phase === 'cluster' && <ClusterPhase />}
        {phase === 'routing' && <RoutingPhase />}
        {phase === 'skills' && <SkillSortPhase />}
      </main>

      <footer className="app-footer">
        &copy; {new Date().getFullYear()} Burning Glass Institute. Task &amp; skill data from O*NET 30.3 (U.S. Department of Labor, CC BY 4.0).
        &nbsp;<a href="https://burningglassinstitute.org" target="_blank" rel="noreferrer">burningglassinstitute.org</a>
      </footer>
    </>
  );
}
