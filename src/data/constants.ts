/** Every number the demo depends on lives here so it is easy to change. */
export const DAILY_SWARM_CAP = 25; // US$ per day for the whole swarm (placeholder)
export const MEMBER_DAILY_CAP = 5; // US$ per member per day (placeholder)
export const AGREEMENT_BAR = 90; // % alike the two answers must be (placeholder)
export const MAX_ACTIVE_JOBS = 20;
export const LEASE_SECONDS = 60;
export const HEARTBEAT_SECONDS = 15;
export const TOTAL_MEMBERS = 8;

/** Time between simulation ticks. The tour's fast mode divides this. */
export const TICK_MS = 2300;

/** The demo runs on its own clock so the story reads the same on every load. */
export const DEMO_DATE_LABEL = 'Thu 26 Nov 2026';
export const DEMO_START = { h: 14, m: 20, s: 0 };

export const STEPS = [
  'Asked',
  'Checked',
  'Assigned',
  'Researching',
  'Handed in',
  'Re-checked',
  'Agreed',
  'Drafted',
  'Person decides',
  'Published',
] as const;

export const STEP_EXPLAIN: string[] = [
  'Someone asks a research question about EURUSD.',
  'The platform checks it has not been answered already and that the budget allows it.',
  "One member's AI gets the job, with the most it may cost set aside and a 60-second lease.",
  "The member's AI does the research on the shared data, checking in every 15 seconds.",
  'It hands in a finding with a signed run receipt that lists exactly what it did.',
  "A different member's AI redoes the work on its own, without seeing the first answer.",
  'If the two answers are alike enough, the finding counts. If not, it goes back for another try.',
  'An editor AI writes a short, plain post. It can only write drafts.',
  'A person reads both answers and the draft, then approves or rejects it. No AI can publish.',
  'Approved posts appear on the viewer page with their evidence and an expiry time.',
];

export const ROLES = [
  'Stop-loss researcher',
  'Market regime analyst',
  'Short-term analyst',
  'Data quality monitor',
  'Experiment worker',
  'Re-checker',
  'Editor',
] as const;

/** Roles a person can ask for on the Ask form. */
export const ASKABLE_ROLES = ROLES.filter((r) => r !== 'Re-checker' && r !== 'Editor');

export const PERIODS = ['Last 24 hours', 'Last 7 days', 'Last 3 months', 'Last 2 years'] as const;

export const RECHECKER_ID = 'dana';
export const EDITOR_NAME = 'Editor AI';

export const EXAMPLE_STUDIED = 'How did EURUSD react to the last ECB rate statement?';
export const EXAMPLE_FRESH = 'Is EURUSD more volatile on Fridays than on other weekdays?';
export const EXAMPLES = [
  EXAMPLE_FRESH,
  EXAMPLE_STUDIED,
  'Does EURUSD drift in the hour before the US jobs report?',
  'How often does a 15-minute EURUSD breakout fail within the hour?',
];

export const RUNNER_VERSION = 'swarm-runner 0.4.2';
export const CODE_VERSION = 'research-lib@3f9c2e1';
export const DATASET = 'eurusd-m15 snapshot 2026-11-26 v3';
