/**
 * Does the swarm earn its keep? Four set-ups on the same 6 past missions.
 * Made-up, deliberately honest numbers: the whole swarm finds and catches the most
 * but costs the most; at the same budget it only narrowly beats the small team,
 * and on one mission the simple baseline matches it.
 */
export const SETUPS = ['Simple baseline', 'One agent', 'Small team', 'Whole swarm'] as const;
export type Setup = (typeof SETUPS)[number];

export const SETUP_EXPLAIN: Record<Setup, string> = {
  'Simple baseline': 'Code only, no AI: a standard sweep of rule settings.',
  'One agent': 'A single agent working alone, no council.',
  'Small team': '5 specialists plus a council.',
  'Whole swarm': 'Every online member plus a council.',
};

export const SCORE_MISSIONS = ['M-05', 'M-06', 'M-07', 'M-08', 'M-09', 'M-10'];

export type View = 'same-budget' | 'full-capacity';

export interface ScoreRow {
  setup: Setup;
  heldUp: number[]; // per mission
  falseWinsCaught: number;
  bestHeldUp: number; // pts
  costUsd: number;
  hours: number;
  withdrawn: number;
}

export const SCORES: Record<View, ScoreRow[]> = {
  'same-budget': [
    {
      setup: 'Simple baseline',
      heldUp: [1, 0, 0, 0, 1, 0],
      falseWinsCaught: 0,
      bestHeldUp: 1.1,
      costUsd: 120,
      hours: 3.1,
      withdrawn: 1,
    },
    {
      setup: 'One agent',
      heldUp: [1, 0, 0, 0, 1, 1],
      falseWinsCaught: 1,
      bestHeldUp: 1.2,
      costUsd: 120,
      hours: 6.4,
      withdrawn: 1,
    },
    {
      setup: 'Small team',
      heldUp: [2, 1, 0, 1, 1, 1],
      falseWinsCaught: 4,
      bestHeldUp: 1.9,
      costUsd: 120,
      hours: 9.2,
      withdrawn: 1,
    },
    {
      setup: 'Whole swarm',
      heldUp: [2, 1, 0, 1, 1, 2],
      falseWinsCaught: 5,
      bestHeldUp: 2.0,
      costUsd: 120,
      hours: 7.8,
      withdrawn: 0,
    },
  ],
  'full-capacity': [
    {
      setup: 'Simple baseline',
      heldUp: [1, 0, 0, 0, 1, 0],
      falseWinsCaught: 0,
      bestHeldUp: 1.1,
      costUsd: 19,
      hours: 2.2,
      withdrawn: 1,
    },
    {
      setup: 'One agent',
      heldUp: [1, 0, 0, 0, 1, 1],
      falseWinsCaught: 1,
      bestHeldUp: 1.2,
      costUsd: 41,
      hours: 5.9,
      withdrawn: 1,
    },
    {
      setup: 'Small team',
      heldUp: [2, 1, 0, 1, 1, 1],
      falseWinsCaught: 4,
      bestHeldUp: 1.9,
      costUsd: 96,
      hours: 8.6,
      withdrawn: 1,
    },
    {
      setup: 'Whole swarm',
      heldUp: [3, 1, 0, 1, 2, 2],
      falseWinsCaught: 7,
      bestHeldUp: 2.1,
      costUsd: 214,
      hours: 5.1,
      withdrawn: 0,
    },
  ],
};

export const total = (r: ScoreRow) => r.heldUp.reduce((s, x) => s + x, 0);
export const costPerFinding = (r: ScoreRow) => r.costUsd / Math.max(1, total(r));
