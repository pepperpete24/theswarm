import type { Pool, PoolIdea } from '../data/pools';
import { mulberry32, round1, round2 } from './rng';
import type { IdeaResult, Member, ObjectionKind } from './types';

export interface SimOptions {
  noWinner?: boolean;
  dropped?: boolean;
  panelRejects?: boolean;
  budgetLimit?: boolean;
}

export type Tick =
  | { k: 'brief' }
  | { k: 'library' }
  | { k: 'propose'; batch: number }
  | { k: 'test'; round: 1 | 2; step: number }
  | { k: 'seat'; round: 1 | 2 }
  | { k: 'objections' }
  | { k: 'verdicts'; round: 1 | 2 }
  | { k: 'synthesise' }
  | { k: 'followups' }
  | { k: 'budget-stop' }
  | { k: 'unseal' }
  | { k: 'fresh-run' }
  | { k: 'fresh-decide' }
  | { k: 'draft'; pass: 1 | 2 }
  | { k: 'votes'; n: number }
  | { k: 'reround' }
  | { k: 'publish' }
  | { k: 'learn-library' }
  | { k: 'learn-improve' }
  | { k: 'close-no-winner' };

/** The timed mission plan (section 7). Pure data: one tick every TICK_MS. */
export function planMission(o: SimOptions = {}): Tick[] {
  const t: Tick[] = [{ k: 'brief' }, { k: 'library' }];
  for (let b = 0; b < 4; b++) t.push({ k: 'propose', batch: b });
  for (let s = 0; s < 4; s++) t.push({ k: 'test', round: 1, step: s });
  t.push({ k: 'seat', round: 1 }, { k: 'objections' }, { k: 'verdicts', round: 1 });
  t.push({ k: 'synthesise' }, { k: 'followups' });
  t.push({ k: 'test', round: 2, step: 0 });
  if (o.budgetLimit) t.push({ k: 'budget-stop' });
  t.push({ k: 'test', round: 2, step: 1 });
  t.push({ k: 'seat', round: 2 }, { k: 'verdicts', round: 2 });
  if (o.noWinner) {
    t.push({ k: 'close-no-winner' }, { k: 'learn-library' }, { k: 'learn-improve' });
    return t;
  }
  t.push({ k: 'unseal' }, { k: 'fresh-run' }, { k: 'fresh-decide' });
  t.push({ k: 'draft', pass: 1 }, { k: 'votes', n: 2 }, { k: 'votes', n: 2 }, { k: 'votes', n: 1 });
  if (o.panelRejects) {
    t.push({ k: 'reround' }, { k: 'draft', pass: 2 }, { k: 'votes', n: 3 }, { k: 'votes', n: 2 });
  }
  t.push({ k: 'publish' }, { k: 'learn-library' }, { k: 'learn-improve' });
  return t;
}

/** Share of the mission budget each tick spends. Adds up to about 83%. */
export function tickSpend(t: Tick): number {
  switch (t.k) {
    case 'propose':
      return 0.01;
    case 'test':
      return t.round === 1 ? 0.09 : 0.08;
    case 'seat':
      return 0.01;
    case 'objections':
    case 'verdicts':
    case 'synthesise':
    case 'fresh-decide':
      return 0.02;
    case 'followups':
    case 'draft':
    case 'votes':
      return 0.01;
    case 'fresh-run':
      return 0.09;
    case 'learn-library':
    case 'learn-improve':
      return 0.005;
    default:
      return 0;
  }
}

export const tickPhase = (t: Tick) => {
  switch (t.k) {
    case 'propose':
    case 'followups':
    case 'synthesise':
      return 'explore' as const;
    case 'test':
      return 'test' as const;
    case 'seat':
    case 'objections':
    case 'verdicts':
    case 'reround':
      return 'council' as const;
    case 'unseal':
    case 'fresh-run':
    case 'fresh-decide':
      return 'fresh' as const;
    default:
      return 'approval' as const;
  }
};

/* ------------------------------------------------------------------------ */
/* Outcome profile. Slots line up with every pool (src/data/pools.ts).        */

interface Slot {
  net: number;
  dd: number;
  trades?: number;
  trials?: number;
  fresh?: number;
  objection?: { kind: ObjectionKind; status: 'open' | 'answered' | 'upheld' };
}

const ORIGINALS: Slot[] = [
  { net: 2.3, dd: -1.1, trades: 312, objection: { kind: 'costs-ignored', status: 'answered' } },
  { net: 2.05, dd: -0.8, trades: 296 },
  { net: 1.9, dd: -0.4, trades: 281 },
  { net: 1.85, dd: -0.6, trades: 264 },
  {
    net: 2.7,
    dd: -0.9,
    trades: 301,
    trials: 600,
    objection: { kind: 'overfitting', status: 'upheld' },
  },
  { net: 3.1, dd: -1.4, trades: 288, objection: { kind: 'look-ahead', status: 'upheld' } },
  { net: 2.1, dd: -0.5, trades: 84, objection: { kind: 'too-few-trades', status: 'open' } },
  { net: 0.4, dd: 0.3, trades: 305 },
  { net: -0.7, dd: 0.6, trades: 330 },
  { net: 0.9, dd: 0.1, trades: 271 },
  { net: 1.1, dd: -0.2, trades: 259 },
  { net: 0.2, dd: 0.4, trades: 244 },
  { net: 1.5, dd: -0.3, trades: 268 },
  { net: 0, dd: 0 }, // known dead end, never tested
];
const PATHFINDER: Slot[] = [
  { net: 2.2, dd: -1.6, trades: 236 },
  { net: 1.0, dd: -2.1, trades: 318 },
  { net: 1.2, dd: -0.2, trades: 229 },
];
const ALTERNATIVES: Slot[] = [
  { net: 2.8, dd: -1.5, trades: 307, fresh: 2.1 },
  { net: 2.65, dd: -1.0, trades: 296, fresh: 1.9 },
  { net: 2.5, dd: -1.7, trades: 241, fresh: 0.4 },
];
const FOLLOWUPS: Slot[] = [
  { net: 2.6, dd: -1.4, trades: 289, fresh: 0.3 },
  { net: 1.55, dd: -0.7, trades: 290 },
  { net: 1.6, dd: -0.5, trades: 262 },
];

/** Duplicates proposed by other members: two of o0, one of o1. */
const DUPLICATE_OF = [0, 0, 1];

export interface ScriptIdea extends PoolIdea {
  ref: string;
  proposedBy: string;
  route: 'refine' | 'different-route';
  depth: number;
  parentRefs: string[];
  result: IdeaResult;
  fresh?: IdeaResult;
  objection?: Slot['objection'];
  duplicateOfRef?: string;
  deadEnd?: boolean;
  tester: string;
}

export interface MissionScript {
  missionNumber: number;
  opts: SimOptions;
  pool: Pool;
  round1: ScriptIdea[];
  batches: string[][];
  alternatives: ScriptIdea[];
  followups: ScriptIdea[];
  /** Index of the approver who rejects, and whether citing rule 8. */
  votePlan: { pass: 1 | 2; rejects: { at: number; rule?: number; reason: string }[] }[];
  approveReasons: string[];
}

/**
 * Build the whole mission ahead of time from a pool, the online members and the
 * options. Ticks then reveal it bit by bit. Deterministic for a given seed.
 */
export function scriptMission(
  missionNumber: number,
  pool: Pool,
  members: Member[],
  swarmSize: 'small' | 'large' | 'whole',
  opts: SimOptions = {},
): MissionScript {
  const rand = mulberry32(missionNumber * 7919);
  const online = members.filter((m) => m.online);
  const explorers = online.filter(
    (m) => m.roles.includes('Explorer') && m.standing !== 'Pathfinder',
  );
  const cap = swarmSize === 'small' ? 5 : swarmSize === 'large' ? 12 : explorers.length;
  const crew = explorers.slice(0, Math.max(3, cap));
  const pathfinder = online.find((m) => m.standing === 'Pathfinder') ?? crew[0];
  const testers = online.filter((m) => m.roles.includes('Experiment worker'));
  const jitter = () => round2((rand() - 0.5) * 0.12);
  const scale = (net: number) => (opts.noWinner ? round2(net * 0.35 - 0.2) : net);
  let t = 0;
  const nextTester = () => (testers.length ? testers[t++ % testers.length].id : crew[0].id);

  const result = (s: Slot, cost: number): IdeaResult => ({
    netReturnDelta: round2(scale(s.net) + jitter()),
    drawdownDelta: round1(s.dd + jitter()),
    longestLosingStreak: Math.max(3, Math.round(7 - s.net + rand() * 2)),
    trades: s.trades ?? 250,
    trials: s.trials ?? Math.round(14 + rand() * 30),
    computeCost: round2(cost + rand() * 0.25),
  });
  const freshOf = (s: Slot, r: IdeaResult): IdeaResult | undefined =>
    s.fresh === undefined
      ? undefined
      : {
          ...r,
          netReturnDelta: round2(s.fresh + jitter()),
          trades: Math.round(r.trades / 8),
          trials: 1,
        };

  const mk = (
    p: PoolIdea,
    ref: string,
    s: Slot,
    by: string,
    extra: Partial<ScriptIdea> = {},
  ): ScriptIdea => {
    const r = result(s, ref.startsWith('o4') ? 1.6 : 0.55);
    return {
      ...p,
      ref,
      proposedBy: by,
      route: 'refine',
      depth: 0,
      parentRefs: [],
      result: r,
      fresh: freshOf(s, r),
      objection: s.objection,
      tester: nextTester(),
      ...extra,
    };
  };

  const originals = pool.originals.map((p, i) =>
    mk(p, `o${i}`, ORIGINALS[i], crew[i % crew.length].id, { deadEnd: i === 13 }),
  );
  const pfs = pool.pathfinder.map((p, i) =>
    mk(p, `p${i}`, PATHFINDER[i], pathfinder.id, { route: 'different-route' }),
  );
  const dups = DUPLICATE_OF.map((o, i) =>
    mk(pool.originals[o], `d${i}`, ORIGINALS[o], crew[(o + 3 + i * 2) % crew.length].id, {
      duplicateOfRef: `o${o}`,
    }),
  );
  // Interleave so batches mix members, providers and the Pathfinder.
  const order = [
    originals[0],
    originals[7],
    pfs[0],
    originals[4],
    originals[1],
    originals[8],
    originals[2],
    dups[0],
    originals[9],
    originals[5],
    pfs[1],
    originals[3],
    originals[10],
    originals[13],
    originals[6],
    dups[1],
    originals[11],
    pfs[2],
    originals[12],
    dups[2],
  ];
  const batches = [0, 1, 2, 3].map((b) => order.slice(b * 5, b * 5 + 5).map((x) => x.ref));

  const alternatives = pool.alternatives.map((p, i) =>
    mk(p, `a${i}`, ALTERNATIVES[i], '', { depth: 1, parentRefs: p.parents }),
  );
  const followups = pool.followups.map((p, i) =>
    mk(p, `f${i}`, FOLLOWUPS[i], crew[(i * 3 + 1) % crew.length].id, {
      depth: p.parent.startsWith('a') ? 2 : 1,
      parentRefs: [p.parent],
    }),
  );

  const nonRule =
    'The wording is a little stronger than the evidence: “beat” should be “did better than”, with a note that results may differ.';
  const rule8 =
    'This reads like a trade call: “set your target at…” is an instruction to trade (rule 8).';
  return {
    missionNumber,
    opts,
    pool,
    round1: order,
    batches,
    alternatives,
    followups,
    votePlan: opts.panelRejects
      ? [
          {
            pass: 1,
            rejects: [
              { at: 1, rule: 8, reason: rule8 },
              { at: 3, rule: 8, reason: rule8 },
            ],
          },
          { pass: 2, rejects: [] },
        ]
      : [{ pass: 1, rejects: [{ at: 3, reason: nonRule }] }],
    approveReasons: [
      'The claims match the test and fresh-data numbers.',
      'Expiry and “proven wrong if” are set, and there is no trade instruction.',
      'Every objection on the winning ideas is closed.',
      'The fresh data is newer than any window used before on this topic.',
      'Says “research on past data”; the cheaper variant is reported honestly.',
    ],
  };
}
