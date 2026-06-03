import { useWorkshop } from '../workshop/state.jsx';

export default function IntroPhase() {
  const { dispatch } = useWorkshop();
  return (
    <div id="phase-intro">
      <div className="intro-card">
        <div className="intro-hdr">
          <h2>Role Redesign</h2>
          <p>A simple, step-by-step way to figure out where AI fits in a job — and what that means for the skills your people need. Start with any role: pick one from a built-in list, or enter your own.</p>
        </div>
        <div className="intro-body">
          <p className="intro-what">
            You'll take a role's tasks and answer a few plain questions about each one. The tool suggests how much AI
            could do for each part of the job — and how much a person should stay involved — then shows you which skills
            grow more important, which stay the same, and which may fade. It takes about 15 minutes.
          </p>
          <div className="intro-phases">
            <div className="intro-phase">
              <div className="ph-num">1</div>
              <strong>Pick a Role</strong>
              <p>Choose from 900+ jobs with tasks and skills built in, or enter your own.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">2</div>
              <strong>Group the Tasks</strong>
              <p>Sort the job's tasks into a few groups of similar work. We start you off; adjust as you like.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">3</div>
              <strong>Set the AI Level</strong>
              <p>Answer a few questions about each group. The tool suggests how much AI should do versus a person.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">4</div>
              <strong>Sort the Skills</strong>
              <p>Place each skill with the work it supports, and see which skills grow, hold steady, or fade.</p>
            </div>
          </div>
          <div className="intro-callout">
            <strong>There are no universal right answers.</strong> The same task can carry very different stakes from one
            company or industry to the next. Use this to think through <em>your</em> situation — not to produce a one-size-fits-all verdict.
          </div>
          <button className="btn-begin" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'source' })}>
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
