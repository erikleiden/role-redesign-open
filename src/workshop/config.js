// ── Framework configuration ──────────────────────────────────────────────────

export const LEVEL = { hl: 4, hitl: 3, hotl: 2, auto: 1, none: 0 };

// The four AI-involvement levels, plain-language. `desc` explains each in one sentence.
export const BUCKETS = {
  hl:   { label: 'Human-led',       color: '#7B2020', desc: 'A person does the work. AI can help prepare, but the person produces the result.' },
  hitl: { label: 'AI-assisted',     color: '#B85520', desc: 'AI does a first pass; a person reviews and approves every result before it is used.' },
  hotl: { label: 'AI-monitored',    color: '#9B7200', desc: 'AI does the work on its own; a person keeps watch and steps in when something looks off.' },
  auto: { label: 'Fully automated', color: '#4a4a4a', desc: 'AI handles it start to finish; people only spot-check now and then.' },
};

export const CELL_COLORS = {
  hl:   { bg: '#7B2020', text: '#fff' },
  hitl: { bg: '#B85520', text: '#fff' },
  hotl: { bg: '#9B7200', text: '#fff' },
  none: { bg: '#D4D3CC', text: '#555' },
};

// Footer shown on each answer — what level of human involvement this answer requires (a floor).
export const BADGE_LABELS = {
  hl:   '→ A person must do this',
  hitl: '→ A person must check the work',
  hotl: '→ A person must keep watch',
  none: 'No requirement',
};

export const GAP_TIPS = {
  hl:   "What human skill does this work need that isn't in the list?",
  hitl: 'What checking or judgment skill is missing here?',
  hotl: 'What monitoring skill should someone keep an eye on?',
  auto: 'What spot-checking skill is worth keeping?',
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
  { id: 'q1', label: 'Hands-on work', group: 1,
    groupLabel: 'First: the deal-breakers',
    groupDesc: 'If any of these apply, a person needs to lead this work.',
    text: 'Does this work need someone physically present or hands-on?',
    options: [
      { score: 1, label: 'Always',          sub: 'Being there in person IS the work — it cannot be done remotely.', min: 'hl' },
      { score: 2, label: 'Usually',         sub: 'Almost always hands-on; remote exceptions are rare.', min: 'hl' },
      { score: 3, label: 'Sometimes',       sub: 'Mostly can be done remotely; being there helps now and then.', min: 'hitl' },
      { score: 4, label: 'No',              sub: 'Can be done fully remotely with nothing lost.', min: 'none' },
    ] },
  { id: 'q2', label: 'Rules & compliance', group: 1,
    groupLabel: 'First: the deal-breakers',
    groupDesc: 'If any of these apply, a person needs to lead this work.',
    text: 'What rules or laws apply to this work?',
    options: [
      { score: 1, label: 'A person must sign off', sub: 'Law or regulation requires a named person to be accountable.', min: 'hl' },
      { score: 2, label: 'A record is required',   sub: 'Human review has to be documented for compliance.', min: 'hitl' },
      { score: 3, label: 'Best practices apply',   sub: 'Standards to follow, but no law requires a person to approve.', min: 'none' },
      { score: 4, label: 'No rules apply',         sub: 'Fully up to your discretion — no compliance to worry about.', min: 'none' },
    ] },
  { id: 'q3', label: 'Can it be made into rules?', group: 1,
    groupLabel: 'First: the deal-breakers',
    groupDesc: 'If any of these apply, a person needs to lead this work.',
    text: 'Could this work be written down as clear, step-by-step rules?',
    options: [
      { score: 1, label: 'Not at all',  sub: 'It depends on judgment and context — rules cannot capture it.', min: 'hl' },
      { score: 2, label: 'Somewhat',    sub: 'Guidelines exist, but a lot still comes down to judgment.', min: 'hitl' },
      { score: 3, label: 'Mostly',      sub: 'A clear process with only a few unusual cases.', min: 'none' },
      { score: 4, label: 'Completely',  sub: 'Step-by-step rules cover it, exceptions included.', min: 'none' },
    ] },
  { id: 'q4', label: 'Human relationships', group: 2,
    groupLabel: 'Next: how much oversight',
    groupDesc: 'These set the least amount of human involvement this work needs.',
    text: 'Does this work depend on a personal, human relationship?',
    options: [
      { score: 1, label: 'It is the whole point', sub: 'Trust, rapport, or a personal connection is the real value.', min: 'hitl' },
      { score: 2, label: 'Yes, it matters a lot', sub: 'A human presence clearly improves the outcome; people expect it.', min: 'hitl' },
      { score: 3, label: 'People prefer a human', sub: 'People will accept AI but would rather deal with a person.', min: 'hotl' },
      { score: 4, label: 'Not really',            sub: 'The relationship side does not matter here.', min: 'none' },
    ] },
  { id: 'q5', label: 'Cost of a mistake', group: 2,
    groupLabel: 'Next: how much oversight',
    groupDesc: 'These set the least amount of human involvement this work needs.',
    text: 'If a mistake slipped through unnoticed, how bad would it be?',
    options: [
      { score: 1, label: 'Severe', sub: 'Legal trouble, a safety risk, or serious harm that cannot be undone.', min: 'hitl' },
      { score: 2, label: 'Major',  sub: 'Real damage to operations or reputation — hard to recover from.', min: 'hitl' },
      { score: 3, label: 'Fixable', sub: 'Can be put right with some effort.', min: 'hotl' },
      { score: 4, label: 'Minor',  sub: 'Easy to catch and fix with little consequence.', min: 'none' },
    ] },
  { id: 'q6', label: 'Easy to double-check?', group: 2,
    groupLabel: 'Next: how much oversight',
    groupDesc: 'These set the least amount of human involvement this work needs.',
    text: "Can you check AI's work without basically redoing it yourself?",
    options: [
      { score: 1, label: 'No',           sub: 'The only way to know if it is right is to do the work again.', min: 'hitl' },
      { score: 2, label: 'Hard to',      sub: 'It takes real expertise and effort to verify.', min: 'hitl' },
      { score: 3, label: 'Mostly',       sub: 'A quick review catches most problems.', min: 'hotl' },
      { score: 4, label: 'Easily',       sub: 'A simple check or the system itself confirms it is correct.', min: 'none' },
    ] },
  { id: 'q7', label: 'Expertise needed', group: 3,
    groupLabel: 'Finally: worth keeping a person involved?',
    groupDesc: 'These keep a person involved when the work builds skills or needs deep expertise.',
    text: 'How specialized is the know-how this work requires?',
    options: [
      { score: 1, label: 'Rare expert',     sub: 'Takes years to develop; hard to hire and harder to replace.', min: 'hitl' },
      { score: 2, label: 'Trained professional', sub: 'Needs a credential or solid professional experience.', min: 'hitl' },
      { score: 3, label: 'Capable employee', sub: 'Most trained employees can handle it.', min: 'hotl' },
      { score: 4, label: 'Entry-level',     sub: 'Quick to learn with little training.', min: 'none' },
    ] },
  { id: 'q8', label: 'Builds skills & careers', group: 3,
    groupLabel: 'Finally: worth keeping a person involved?',
    groupDesc: 'These keep a person involved when the work builds skills or needs deep expertise.',
    text: 'Does doing this work help people build skills that matter for their careers?',
    options: [
      { score: 1, label: 'Yes, it is essential', sub: 'Take it away and the role loses how people grow.', min: 'hotl' },
      { score: 2, label: 'Yes, it helps',        sub: 'A good chance to learn that is worth protecting.', min: 'hotl' },
      { score: 3, label: 'A little',             sub: 'Some learning value, but not central to growth.', min: 'none' },
      { score: 4, label: 'No',                   sub: 'Routine work that does not build much.', min: 'none' },
    ] },
];
