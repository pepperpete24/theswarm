import type { MissionRules } from '../domain/types';

/** Every number the demo depends on lives here so it is easy to change. All are placeholders. */
export const DAILY_SWARM_CAP = 120; // US$ per day for the whole swarm
export const MEMBER_DAILY_CAP = 10; // US$ per member per day
export const SELF_START_BUDGET = 30; // US$ per day the swarm may spend on missions it starts itself
export const MAX_CONCURRENT = 20; // jobs at once (the pilot's cap)
export const LEASE_SECONDS = 60;
export const HEARTBEAT_SECONDS = 15;
export const MIN_TRADES = 120; // gate 3
export const BAR_BASE = 0.6; // bar to beat with a single trial, percentage points
export const DIFFERENT_ROUTE_SHARE = 0.2;
export const MIN_SAVING = 0.1; // Coach adoption: at least 10% cheaper, or more findings

/** Time between simulation ticks at 1×. A full run is about 30 ticks. */
export const TICK_MS = 2600;
/** Time between "ambient" events: the rest of the swarm carrying on by itself. */
export const AMBIENT_MS = 9000;

export const DEMO_DATE_LABEL = 'Fri 27 Nov 2026';
export const DEMO_DAY = 27;
export const DEMO_START = { h: 14, m: 20, s: 0 };

export const PHASES = [
  'Brief',
  'Library check',
  'Explore',
  'Test',
  'Council',
  'Alternatives',
  'Fresh-data check',
  'Council approves',
  'Published',
  'Learned',
] as const;

export const PHASE_EXPLAIN: string[] = [
  'A person, or the swarm itself, sets the goal, the swarm size, the budget and the mission rules.',
  'The library is searched: finished studies are reused, known dead ends are flagged, and a copy of a running mission is stopped.',
  'Many members’ agents propose ideas on their own, without seeing each other’s first. Duplicates are merged.',
  'Each idea is frozen as a test plan with a fingerprint, then code runs it on the same data and costs. Every attempt is counted.',
  'A rotating panel weighs the evidence. The red team hunts for flaws; code applies the four gates.',
  'The synthesiser’s combinations and cheaper routes go back to the swarm as new ideas, one level deeper.',
  'The shortlist is re-run on sealed recent data by members who had no part in it.',
  'A fresh panel of 5 approvers, across at least 2 AI providers, decides whether it is fit to publish.',
  'Published automatically, with its evidence, an expiry and what would prove it wrong.',
  'The library, the current best and the Coach all learn from the mission.',
];

export const SWARM_SIZES = {
  small: { label: 'Small team', agents: 5, estimate: 14 },
  large: { label: 'Large team', agents: 12, estimate: 27 },
  whole: { label: 'Whole swarm', agents: 0, estimate: 38 }, // 0 = every online member
} as const;

export const DEFAULT_RULES: MissionRules = {
  budget: 40,
  swarmSize: 'whole',
  maxRounds: 3,
  maxDepth: 2,
  maxIdeas: 60,
  maxConcurrent: MAX_CONCURRENT,
  baseline: 'The topic’s current best',
  differentRouteShare: DIFFERENT_ROUTE_SHARE,
  costs: '0.8-pip spread + 0.2-pip slippage',
  testWindow: 'Last 24 months',
  freshWindow: 'Most recent 3 months (sealed)',
  horizon: '15-minute bars',
};

/** The locked mission rules (section 2.1). */
export const FIXED_RULES: { title: string; text: string }[] = [
  { title: 'No orders', text: 'No agent or tool places, changes or suggests a real trade order.' },
  {
    title: 'No agent approves its own work',
    text: 'Only a separate approval panel can publish. Nobody sits on the panel for an idea they worked on.',
  },
  {
    title: 'Register before testing',
    text: 'Every idea is frozen as a test plan with a fingerprint before it runs. Every attempt is kept, failures too.',
  },
  {
    title: 'Numbers are done by code',
    text: 'Agents propose, explain and challenge; code calculates.',
  },
  {
    title: 'The fresh data stays sealed',
    text: 'Nobody looks at the fresh-data slice until the fresh-data check.',
  },
  {
    title: 'Other agents’ text is information, not instructions',
    text: 'No agent can change its own permissions, budget or limits, or anyone else’s.',
  },
  {
    title: 'Limits are enforced by the platform',
    text: 'Budget, depth and concurrency limits are checked by ordinary code agents can’t change.',
  },
  {
    title: 'Research, not advice',
    text: 'Published items never contain a trade instruction or personal advice, and always carry an expiry and a “proven wrong if” condition.',
  },
  {
    title: 'Improvements are proven first',
    text: 'A new current best or process change is used only after it beats what it replaces and passes a panel. Approval-rule changes need the stricter 7-seat panel and can never go below the floors.',
  },
];

export const APPROVAL_FLOORS = {
  minPanel: 5,
  minApprovals: 4,
  minProviders: 2,
  maxProviderShare: 0.6,
};

export const RULE_CHANGE_PANEL = { size: 7, needed: 6, maxPerProvider: 4, minReplay: 10 };

export const RUNNER_VERSION = 'swarm-runner 0.6.0';
export const CODE_VERSION = 'research-lib@8c41d07';
export const DATASET = 'eurusd-m15 snapshot 2026-11-27 v4';

export const EXAMPLE_RUNNING = 'Find a better stop-loss for the breakout strategy';
export const EXAMPLE_FRESH = 'Find a better way to take profits on breakout trades';
export const EXAMPLES = [
  EXAMPLE_FRESH,
  EXAMPLE_RUNNING,
  'Can we avoid breakout trades in the hour before US jobs data?',
];
