// ── Routing framework configuration (ported from SFWI workshop) ──────────────

export const LEVEL = { hl: 4, hitl: 3, hotl: 2, auto: 1, none: 0 };

export const BUCKETS = {
  hl:   { label: 'Human-Led',         color: '#7B2020' },
  hitl: { label: 'Human-in-the-Loop', color: '#B85520' },
  hotl: { label: 'Human-on-the-Loop', color: '#9B7200' },
  auto: { label: 'Full Auto',         color: '#4a4a4a' },
};

export const CELL_COLORS = {
  hl:   { bg: '#7B2020', text: '#fff' },
  hitl: { bg: '#B85520', text: '#fff' },
  hotl: { bg: '#9B7200', text: '#fff' },
  none: { bg: '#D4D3CC', text: '#555' },
};

export const BADGE_LABELS = {
  hl:   '→ Human-Led',
  hitl: '→ HITL minimum',
  hotl: '→ HOTL minimum',
  none: 'No minimum set',
};

export const GAP_TIPS = {
  hl:   'What human skill does this cluster demand that is missing from the list?',
  hitl: 'What judgment or verification skill is missing from this cluster?',
  hotl: 'What monitoring or exception-handling skill should be tracked?',
  auto: 'What oversight or spot-check capability should be preserved?',
};

export const CAT_CLASS = {
  'Foundational & Leadership Skills': 'cat-foundational',
  'Core Role-Specific Skills': 'cat-core',
  'Baseline Applied Skills': 'cat-baseline',
};

export const CAT_ORDER = [
  'Foundational & Leadership Skills',
  'Core Role-Specific Skills',
  'Baseline Applied Skills',
];

export const ROUTING_QUESTIONS = [
  { id: 'q1', label: 'Physical Presence', group: 1,
    groupLabel: 'Group 1 — Hard Exits',
    groupDesc: 'Any answer here can force Human-Led.',
    text: 'Does completing this cluster require physical presence or hands-on action?',
    options: [
      { score: 1, label: 'Always essential',    sub: 'Physical presence IS the work — cannot be separated from it.', min: 'hl' },
      { score: 2, label: 'Usually required',    sub: 'The norm; remote exceptions are rare and incomplete.', min: 'hl' },
      { score: 3, label: 'Occasionally needed', sub: 'Most work is remote-capable; physical presence sometimes helps.', min: 'hitl' },
      { score: 4, label: 'Not required',        sub: 'Fully performable remotely with no meaningful loss.', min: 'none' },
    ] },
  { id: 'q2', label: 'Regulatory Context', group: 1,
    groupLabel: 'Group 1 — Hard Exits',
    groupDesc: 'Any answer here can force Human-Led.',
    text: 'What compliance or legal context governs this cluster?',
    options: [
      { score: 1, label: 'Licensed sign-off required', sub: 'Law or regulation requires a named human to be accountable.', min: 'hl' },
      { score: 2, label: 'Audit trail required',       sub: 'Human review must be documented; accountability is external.', min: 'hitl' },
      { score: 3, label: 'Standards-guided',           sub: 'Best practices apply but no external mandate requires human sign-off.', min: 'none' },
      { score: 4, label: 'No compliance context',      sub: 'Fully discretionary — no regulatory constraints.', min: 'none' },
    ] },
  { id: 'q3', label: 'Codifiability', group: 1,
    groupLabel: 'Group 1 — Hard Exits',
    groupDesc: 'Any answer here can force Human-Led.',
    text: 'Can the rules and logic for this cluster be written down completely?',
    options: [
      { score: 1, label: 'Not at all',       sub: 'Highly contextual and judgment-driven — rules cannot capture it.', min: 'hl' },
      { score: 2, label: 'Somewhat',         sub: 'Guidelines exist but significant discretion remains in practice.', min: 'hitl' },
      { score: 3, label: 'Mostly',           sub: 'Structured process with clear procedure; few real edge cases.', min: 'none' },
      { score: 4, label: 'Fully rule-based', sub: 'Explicit procedures cover it completely; exceptions are defined.', min: 'none' },
    ] },
  { id: 'q4', label: 'Relational Value', group: 2,
    groupLabel: 'Group 2 — Oversight Floors',
    groupDesc: 'Answers here set a minimum level of human involvement.',
    text: 'Does this cluster require human relational presence to deliver its value?',
    options: [
      { score: 1, label: 'Relationship IS the value', sub: 'Trust, rapport, or emotional presence is the core output.', min: 'hitl' },
      { score: 2, label: 'Human presence essential',  sub: 'Significantly enhances outcome — stakeholders expect it.', min: 'hitl' },
      { score: 3, label: 'Human preferred',           sub: 'Stakeholders tolerate AI delivery but prefer a human touch.', min: 'hotl' },
      { score: 4, label: 'Not a factor',              sub: 'Relationship context is irrelevant to task delivery.', min: 'none' },
    ] },
  { id: 'q5', label: 'Error Stakes', group: 2,
    groupLabel: 'Group 2 — Oversight Floors',
    groupDesc: 'Answers here set a minimum level of human involvement.',
    text: 'What is the cost of an undetected error from this cluster?',
    options: [
      { score: 1, label: 'Catastrophic', sub: 'Legal liability, safety risk, or severe irreversible harm.', min: 'hitl' },
      { score: 2, label: 'High impact',  sub: 'Significant operational or reputational damage — hard to recover.', min: 'hitl' },
      { score: 3, label: 'Recoverable',  sub: 'Fixable with meaningful effort; some downstream impact.', min: 'hotl' },
      { score: 4, label: 'Low',          sub: 'Easily caught and corrected with minimal consequence.', min: 'none' },
    ] },
  { id: 'q6', label: 'Output Verifiability', group: 2,
    groupLabel: 'Group 2 — Oversight Floors',
    groupDesc: 'Answers here set a minimum level of human involvement.',
    text: 'Can AI output from this cluster be checked without re-doing the work?',
    options: [
      { score: 1, label: 'Not possible',     sub: 'Requires re-doing the task to know if the output is correct.', min: 'hitl' },
      { score: 2, label: 'Difficult',        sub: 'Significant expert effort required to verify output quality.', min: 'hitl' },
      { score: 3, label: 'Mostly verifiable', sub: 'A quick review catches most errors without re-doing the work.', min: 'hotl' },
      { score: 4, label: 'Easily verified',  sub: 'Objective check or auto-validation confirms accuracy.', min: 'none' },
    ] },
  { id: 'q7', label: 'Required Expertise', group: 3,
    groupLabel: 'Group 3 — Strategic Modifiers',
    groupDesc: 'Prevents Full Auto when the task demands rare human capability.',
    text: 'How specialized is the human knowledge required for this cluster?',
    options: [
      { score: 1, label: 'Rare specialist',       sub: 'Years to develop; hard to hire and harder to replace.', min: 'hitl' },
      { score: 2, label: 'Professional training', sub: 'Standard professional credentials or equivalent experience required.', min: 'hitl' },
      { score: 3, label: 'Trained generalist',    sub: 'Any capable employee with role-specific training can do it.', min: 'hotl' },
      { score: 4, label: 'Basic / entry-level',   sub: 'Minimal training required; quickly learned on the job.', min: 'none' },
    ] },
  { id: 'q8', label: 'Learning Value', group: 3,
    groupLabel: 'Group 3 — Strategic Modifier',
    groupDesc: 'Prevents Full Auto when the task builds critical human capability.',
    text: 'Does doing this cluster build critical human capability over time?',
    options: [
      { score: 1, label: 'Core to career path',  sub: 'Essential for skill development; removing it hollows out the role.', min: 'hotl' },
      { score: 2, label: 'Valuable learning',    sub: 'Good developmental opportunity worth preserving.', min: 'hotl' },
      { score: 3, label: 'Marginal benefit',     sub: 'Some learning value, but not critical to career growth.', min: 'none' },
      { score: 4, label: 'No development value', sub: 'Routine work; no meaningful growth from doing it.', min: 'none' },
    ] },
];
