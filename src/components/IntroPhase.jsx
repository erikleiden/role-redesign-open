import { useWorkshop } from '../workshop/state.jsx';

export default function IntroPhase() {
  const { dispatch } = useWorkshop();
  return (
    <div id="phase-intro">
      <div className="intro-card">
        <div className="intro-hdr">
          <h2>Role Redesign Workshop</h2>
          <p>A structured framework for deciding where humans stay in the loop as AI enters a role — and how that reshapes the skills that matter. Bring your own role, or pull one from O*NET.</p>
        </div>
        <div className="intro-body">
          <p className="intro-what">
            For any role, this exercise turns a list of tasks and skills into two decisions: the appropriate level of AI
            autonomy for each cluster of work, and what that means for every skill in the role. The output is a routing
            rationale and a before/after skill picture you can act on.
          </p>
          <div className="intro-phases">
            <div className="intro-phase">
              <div className="ph-num">1</div>
              <strong>Choose a Role</strong>
              <p>Pull tasks &amp; skills from any of 900+ O*NET occupations, or paste/upload your own.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">2</div>
              <strong>Cluster Tasks</strong>
              <p>Group the role's tasks into clusters. O*NET roles arrive pre-clustered; adjust as you like.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">3</div>
              <strong>Route Clusters</strong>
              <p>Answer 8 structured questions per cluster. The framework sets each to Human-Led, HITL, HOTL, or Full Auto.</p>
            </div>
            <div className="intro-phase">
              <div className="ph-num">4</div>
              <strong>Sort Skills</strong>
              <p>Place each skill where it applies. See live how AI integration deepens, sustains, or displaces it.</p>
            </div>
          </div>
          <div className="intro-callout">
            <strong>Note on variability:</strong> Answers will differ by company, industry, and regulatory environment.
            The same task can carry different stakes in financial services vs. retail, or different compliance
            requirements across jurisdictions. Use the tool to structure your specific context, not to generate
            universal conclusions.
          </div>
          <button className="btn-begin" onClick={() => dispatch({ type: 'SET_PHASE', phase: 'source' })}>
            Get Started →
          </button>
        </div>
      </div>
    </div>
  );
}
