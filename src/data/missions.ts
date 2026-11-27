import { buildReceipt, specHashFor } from '../domain/manifest';
import { mulberry32, round1, round2 } from '../domain/rng';
import type {
  CouncilSession,
  Idea,
  IdeaFamily,
  IdeaResult,
  IdeaState,
  Member,
  Mission,
  Objection,
} from '../domain/types';
import { DEFAULT_RULES } from './constants';

const pad = (n: number) => String(n).padStart(2, '0');

interface IdeaSpec {
  n: number;
  title: string;
  summary?: string;
  family: IdeaFamily;
  key: string;
  by: string;
  state: IdeaState;
  net?: number;
  dd?: number;
  trades?: number;
  trials?: number;
  fresh?: number;
  freshBy?: string;
  depth?: number;
  parents?: number[];
  route?: 'refine' | 'different-route';
  round?: number;
  role?: string;
  mergedInto?: number;
  deadEndFrom?: string;
  verdictReason?: string;
}

/** Build an idea with a consistent receipt from a compact spec. */
function makeIdea(
  mission: number,
  sp: IdeaSpec,
  members: Member[],
  rand: () => number,
  time: string,
): Idea {
  const id = `I-${mission}-${pad(sp.n)}`;
  const proposer = members.find((m) => m.id === sp.by);
  const tested = sp.net !== undefined;
  const result: IdeaResult | undefined = tested
    ? {
        netReturnDelta: sp.net!,
        drawdownDelta: sp.dd ?? round1(-sp.net! * 0.4 + (rand() - 0.5)),
        longestLosingStreak: Math.max(3, Math.round(7 - sp.net! + rand() * 2)),
        trades: sp.trades ?? Math.round(220 + rand() * 110),
        trials: sp.trials ?? Math.round(12 + rand() * 34),
        computeCost: round2(0.5 + rand() * 0.6 + (sp.trials ?? 0) / 900),
      }
    : undefined;
  const idea: Idea = {
    id,
    missionId: `M-${pad(mission)}`,
    key: sp.key,
    title: sp.title,
    summary: sp.summary ?? sp.title,
    family: sp.family,
    proposedBy: sp.by,
    agentRole:
      sp.role ??
      (sp.route === 'different-route'
        ? 'Pathfinder'
        : (sp.depth ?? 0) > 0
          ? 'Synthesiser'
          : 'Explorer'),
    model: proposer?.model ?? 'Codex',
    round: sp.round ?? ((sp.depth ?? 0) > 0 ? 2 : 1),
    depth: sp.depth ?? 0,
    parentIds: (sp.parents ?? []).map((p) => `I-${mission}-${pad(p)}`),
    route: sp.route ?? 'refine',
    mergedInto: sp.mergedInto ? `I-${mission}-${pad(sp.mergedInto)}` : undefined,
    deadEndFrom: sp.deadEndFrom,
    state: sp.state,
    specHash: tested || sp.state === 'queued' ? specHashFor(id, sp.title) : undefined,
    registeredAt: tested || sp.state === 'queued' ? time : undefined,
    result,
    freshResult:
      sp.fresh !== undefined && result
        ? { ...result, netReturnDelta: sp.fresh, trades: Math.round(result.trades / 8), trials: 1 }
        : undefined,
    freshCheckedBy: sp.freshBy,
    objections: [],
    verdictReason: sp.verdictReason,
    receipt: {},
  };
  const tester = members.filter((m) => m.roles.includes('Experiment worker'))[sp.n % 5];
  idea.receipt = buildReceipt({
    idea,
    proposer,
    tester: tested ? tester : undefined,
    started: tested ? time : undefined,
    finished: tested ? time : undefined,
    freshSealed: sp.fresh === undefined && sp.state !== 'fresh-check',
  });
  return idea;
}

const rules = (budget: number, baseline: string) => ({ ...DEFAULT_RULES, budget, baseline });
const spend = (e: number, t: number, c: number, f: number, a: number) => ({
  explore: e,
  test: t,
  council: c,
  fresh: f,
  approval: a,
});

/* ------------------------------------------------------------------------ */
/* M-12: the flagship. A challenge to the stop-loss topic's current best.   */

const STOP_FILLERS: { title: string; family: IdeaFamily; key: string }[] = [
  { title: 'Stop at 2× ATR', family: 'volatility', key: 'sl-atr-2' },
  { title: 'Stop at 1× ATR', family: 'volatility', key: 'sl-atr-1' },
  { title: 'Time stop after 10 bars', family: 'time', key: 'sl-time-10' },
  { title: 'Time stop after 4 bars', family: 'time', key: 'sl-time-4' },
  { title: 'Trail the stop from +1.5× risk', family: 'trailing', key: 'sl-trail-1.5' },
  { title: 'Chandelier stop, 3× ATR from the high', family: 'trailing', key: 'sl-chandelier' },
  { title: 'Stop below the breakout bar’s low', family: 'structure', key: 'sl-bar-low' },
  { title: 'Stop at the middle of the breakout range', family: 'structure', key: 'sl-range-mid' },
  { title: 'Tighter stops in the Asian session', family: 'session', key: 'sl-asia-tight' },
  { title: 'Wider stops on Mondays', family: 'session', key: 'sl-monday-wide' },
  { title: 'Stop from the 20-bar standard deviation', family: 'volatility', key: 'sl-stdev' },
  { title: 'Parabolic trailing stop', family: 'trailing', key: 'sl-parabolic' },
  { title: 'Stop at the previous day’s low', family: 'structure', key: 'sl-prev-day' },
  { title: 'Fixed 18-pip stop', family: 'structure', key: 'sl-fixed-18' },
  { title: 'Fixed 22-pip stop', family: 'structure', key: 'sl-fixed-22' },
  { title: 'Volatility-scaled time stop', family: 'time', key: 'sl-vol-time' },
  { title: 'Stop beyond the round number', family: 'structure', key: 'sl-round' },
  { title: 'Session-close stop', family: 'session', key: 'sl-session-close' },
  { title: 'Stop from the 1-hour ATR', family: 'volatility', key: 'sl-atr-1h' },
  { title: 'Step trailing stop every 10 pips', family: 'trailing', key: 'sl-step-trail' },
  { title: 'Stop at 1.25× ATR', family: 'volatility', key: 'sl-atr-1.25' },
  { title: 'Stop that widens after the first hour', family: 'session', key: 'sl-widen-1h' },
  { title: 'Model-picked stop per weekday', family: 'model', key: 'sl-ml-weekday' },
  { title: 'Stop at 3× ATR', family: 'volatility', key: 'sl-atr-3' },
  { title: 'Trail on the 10-bar low', family: 'trailing', key: 'sl-trail-10low' },
];

export function buildM12(members: Member[]) {
  const rand = mulberry32(1212);
  const T = '09:41:10';
  const named: IdeaSpec[] = [
    {
      n: 1,
      title: 'Stop at 1.5× average true range (ATR)',
      summary: 'Set the stop from recent volatility instead of a fixed 20 pips.',
      family: 'volatility',
      key: 'sl-atr-1.5',
      by: 'aroha',
      state: 'promising',
      net: 1.95,
      dd: -0.9,
      trades: 288,
    },
    {
      n: 2,
      title: 'Time stop: exit after 6 bars if not in profit',
      summary: 'Close a trade that hasn’t moved into profit within 90 minutes.',
      family: 'time',
      key: 'sl-time-6',
      by: 'emeka',
      state: 'promising',
      net: 1.85,
      dd: -0.6,
      trades: 301,
    },
    {
      n: 3,
      title: 'Trail the stop once the trade is up 1× its risk',
      summary: 'Move the stop up behind the price after +1R.',
      family: 'trailing',
      key: 'sl-trail-1r',
      by: 'bjorn',
      state: 'needs-evidence',
      net: 2.2,
      dd: -0.7,
      trades: 74,
      verdictReason: 'Only 74 trades; the minimum is 120.',
    },
    {
      n: 4,
      title: 'Wider fixed stop, 25 pips',
      summary: 'A wider fixed stop.',
      family: 'structure',
      key: 'sl-fixed-25',
      by: 'mei',
      state: 'known-dead-end',
      deadEndFrom: 'L-014',
    },
    {
      n: 5,
      title: 'Stop just beyond the last swing low or high',
      summary: 'Put the stop where the market last turned.',
      family: 'structure',
      key: 'sl-swing',
      by: 'jonah',
      state: 'promising',
      net: 2.05,
      dd: -1.0,
      trades: 246,
    },
    {
      n: 6,
      title: 'Wider stops for the first hour after the London open',
      summary: 'Give trades more room during the opening burst.',
      family: 'session',
      key: 'sl-london-wide',
      by: 'priya',
      state: 'needs-evidence',
      net: 1.9,
      dd: -0.3,
      trades: 212,
      verdictReason: '1 objection still open.',
    },
    {
      n: 7,
      title: 'Machine-learned stop distance (gradient boosting)',
      summary: 'A model picks the stop for each trade from 40 inputs.',
      family: 'model',
      key: 'sl-ml',
      by: 'lars',
      state: 'rejected',
      net: 2.9,
      dd: -1.1,
      trades: 297,
      trials: 1200,
      verdictReason:
        'Objection upheld: 1,200 parameter sets on 40 inputs; the gain is likely fitted to the past.',
    },
    {
      n: 8,
      title: 'Move the stop to break-even at +0.5× risk',
      summary: 'Protect the trade early.',
      family: 'trailing',
      key: 'sl-breakeven-0.5',
      by: 'bjorn',
      state: 'rejected',
      net: -0.6,
      dd: 0.4,
      trades: 318,
      verdictReason: 'Did 0.6 pts worse than the baseline after costs.',
    },
    {
      n: 14,
      title: 'Stop set from the Friday close',
      summary: 'Use Friday’s closing price to place the week’s stops.',
      family: 'structure',
      key: 'sl-friday-close',
      by: 'omar',
      state: 'rejected',
      net: 3.4,
      dd: -1.6,
      trades: 270,
      verdictReason:
        'Objection upheld: used Friday’s close on trades placed before Friday had closed.',
    },
    {
      n: 15,
      title: 'No stop at all: size each trade by volatility instead',
      summary: 'A different route: keep every trade, but make it smaller when the market is wild.',
      family: 'volatility',
      key: 'sl-pf-no-stop',
      by: 'kiri',
      route: 'different-route',
      state: 'needs-evidence',
      net: 2.0,
      dd: -2.2,
      trades: 240,
      verdictReason: '1 objection still open.',
    },
    {
      n: 16,
      title: 'Exit when the breakout falls back inside its range, instead of a price stop',
      summary: 'A different route: the failed breakout is the stop.',
      family: 'structure',
      key: 'sl-pf-fail',
      by: 'kiri',
      route: 'different-route',
      state: 'promising',
      net: 1.9,
      dd: -1.3,
      trades: 251,
    },
    {
      n: 40,
      title: 'ATR stop + time stop combined',
      summary:
        'Built from I-12-01 and I-12-02: a 1.5× ATR stop, plus an exit after 6 bars if not in profit.',
      family: 'combined',
      key: 'sl-alt-atr-time',
      by: 'gustavo',
      depth: 1,
      parents: [1, 2],
      state: 'held-up',
      net: 2.6,
      dd: -1.4,
      trades: 279,
      fresh: 2.0,
      freshBy: 'ines',
    },
    {
      n: 41,
      title: 'Simple ATR rule instead of the ML model',
      summary:
        'A cheaper route to I-12-07: about 90% of its gain at a tenth of the cost, with nothing to overfit.',
      family: 'volatility',
      key: 'sl-alt-simple',
      by: 'gustavo',
      depth: 1,
      parents: [7],
      state: 'held-up',
      net: 2.2,
      dd: -1.0,
      trades: 290,
      fresh: 1.5,
      freshBy: 'priya',
    },
    {
      n: 42,
      title: 'Swing stop, switching to ATR in volatile weeks',
      summary: 'Built from I-12-05 and the regime analyst’s volatile-week flag.',
      family: 'combined',
      key: 'sl-alt-swing-atr',
      by: 'gustavo',
      depth: 1,
      parents: [5],
      state: 'fresh-check',
      net: 2.4,
      dd: -1.2,
      trades: 238,
      freshBy: 'lars',
    },
    {
      n: 43,
      title: 'I-12-42 with a time stop added',
      summary: 'Alternative of an alternative: at the depth limit.',
      family: 'combined',
      key: 'sl-fu-swing-atr-time',
      by: 'kiri',
      depth: 2,
      parents: [42],
      state: 'queued',
      round: 2,
    },
  ];
  // Fillers to reach 47 ideas: 6 merged, 1 dead end, 2 promising, 3 need evidence, 20 rejected.
  const fillerNs = [
    9,
    10,
    11,
    12,
    13,
    ...Array.from({ length: 23 }, (_, i) => 17 + i),
    44,
    45,
    46,
    47,
  ];
  const crew = [
    'aroha',
    'bjorn',
    'emeka',
    'gustavo',
    'ines',
    'jonah',
    'lars',
    'mei',
    'omar',
    'priya',
    'kiri',
  ];
  const plan: (Partial<IdeaSpec> & { state: IdeaState })[] = [
    ...Array.from({ length: 6 }, (_, i) => ({
      state: 'merged' as const,
      mergedInto: [1, 2, 5, 1, 7, 2][i],
    })),
    { state: 'known-dead-end', deadEndFrom: 'L-018' },
    { state: 'promising', net: 1.82 },
    { state: 'promising', net: 1.88 },
    ...[1.6, 2.1, 1.95].map((net, i) => ({
      state: 'needs-evidence' as const,
      net,
      trades: i === 1 ? 96 : undefined,
      verdictReason: i === 1 ? 'Only 96 trades; the minimum is 120.' : '1 objection still open.',
    })),
    ...Array.from({ length: 20 }, (_, i) => ({
      state: 'rejected' as const,
      net: round2(-0.9 + ((i * 37) % 23) / 9),
    })),
  ];
  const fillers: IdeaSpec[] = fillerNs.map((n, i) => {
    const p = plan[i];
    const f = STOP_FILLERS[i % STOP_FILLERS.length];
    const merged = p.state === 'merged' ? named.find((x) => x.n === p.mergedInto) : undefined;
    return {
      n,
      title: merged
        ? merged.title
        : p.state === 'known-dead-end'
          ? 'Break-even stop at +0.5× risk, but only on Mondays'
          : f.title,
      family: merged ? merged.family : f.family,
      key: merged ? merged.key : p.state === 'known-dead-end' ? 'sl-breakeven-0.5' : f.key,
      by: crew[(i * 5 + 3) % crew.length],
      ...p,
      verdictReason:
        p.verdictReason ??
        (p.state === 'rejected' && p.net !== undefined
          ? p.net <= 0
            ? `Did ${Math.abs(p.net).toFixed(2)} pts worse than the baseline after costs.`
            : `Needed 1.77 pts after the trials so far; got ${p.net.toFixed(2)} pts.`
          : undefined),
    } as IdeaSpec;
  });
  const ideas = [...named, ...fillers]
    .sort((a, b) => a.n - b.n)
    .map((sp) => makeIdea(12, sp, members, rand, T));
  const byN = (n: number) => ideas.find((i) => i.id === `I-12-${pad(n)}`)!;

  const obj = (
    n: number,
    by: string,
    kind: Objection['kind'],
    text: string,
    status: Objection['status'],
    answer?: string,
    answeredBy?: string,
  ): Objection => ({
    id: `O-12-${pad(n)}-${kind.slice(0, 2)}`,
    ideaId: `I-12-${pad(n)}`,
    by,
    kind,
    text,
    status,
    answer,
    answeredBy,
  });
  const objections: Objection[] = [
    obj(
      7,
      'ines',
      'overfitting',
      'The model tried 1,200 parameter sets on 40 inputs. A gain this size after that much tuning is likely fitted to the past.',
      'upheld',
    ),
    obj(
      14,
      'dana',
      'look-ahead',
      'Friday’s close is used to place stops on trades opened before Friday had closed. That price wasn’t known yet.',
      'upheld',
    ),
    obj(
      3,
      'dana',
      'too-few-trades',
      'Only 74 trades reached +1R. Too few to tell skill from luck.',
      'open',
    ),
    obj(
      6,
      'ines',
      'one-period-only',
      'Almost all of the gain comes from March to May. It may only work in one kind of market.',
      'open',
    ),
    obj(
      15,
      'dana',
      'one-period-only',
      'Without a stop, two weeks in March carry most of the result. Check other periods.',
      'open',
    ),
    obj(
      1,
      'ines',
      'costs-ignored',
      'Wider ATR stops mean smaller positions. Were the costs scaled to match?',
      'answered',
      'Yes: the test plan charges spread and slippage per trade at the actual size. The result is after costs.',
      'jonah',
    ),
    obj(
      40,
      'lars',
      'duplicate',
      'Isn’t this just I-12-01 again?',
      'answered',
      'No: the time stop removes 31% of the losing trades the ATR stop alone keeps. The results differ by 0.65 pts.',
      'bjorn',
    ),
  ];
  for (const o of objections) {
    const i = byN(Number(o.ideaId.slice(-2)));
    i.objections = [...i.objections, o];
  }
  // Two filler needs-evidence ideas carry open objections too.
  const needFillers = ideas.filter(
    (i) => i.state === 'needs-evidence' && !i.objections.length && (i.result?.trades ?? 0) >= 120,
  );
  needFillers.forEach((i, k) => {
    i.objections = [
      {
        id: `O-${i.id.slice(2)}-op`,
        ideaId: i.id,
        by: k ? 'dana' : 'ines',
        kind: 'one-period-only',
        text: 'The gain sits almost entirely in one quarter.',
        status: 'open',
      },
    ];
  });
  // Upheld objections on two rejected fillers (model and look-ahead style).
  const mlFiller = ideas.find((i) => i.key === 'sl-ml-weekday');
  if (mlFiller && mlFiller.state === 'rejected') {
    mlFiller.objections = [
      {
        id: `O-${mlFiller.id.slice(2)}-ov`,
        ideaId: mlFiller.id,
        by: 'ines',
        kind: 'overfitting',
        text: 'Picked per weekday from 300 settings: fitted to the past.',
        status: 'upheld',
      },
    ];
    mlFiller.verdictReason =
      'Objection upheld: picked per weekday from 300 settings, fitted to the past.';
  }

  const councils: CouncilSession[] = [
    {
      id: 'C-12-1',
      missionId: 'M-12',
      round: 1,
      panel: [
        { memberId: 'omar', seat: 'chair' },
        { memberId: 'dana', seat: 'red-team' },
        { memberId: 'ines', seat: 'red-team' },
        { memberId: 'gustavo', seat: 'synthesiser' },
        { memberId: 'jonah', seat: 'advocate' },
        { memberId: 'aroha', seat: 'advocate' },
        { memberId: 'priya', seat: 'specialist' },
      ],
      objections: objections.filter((o) => o.ideaId !== 'I-12-40').map((o) => o.id),
      syntheses: [
        {
          fromIdeaIds: ['I-12-01', 'I-12-02'],
          newIdeaId: 'I-12-40',
          kind: 'combination',
          why: 'The ATR stop and the time stop fix different losers: one adapts to volatility, the other cuts trades that go nowhere.',
        },
        {
          fromIdeaIds: ['I-12-07'],
          newIdeaId: 'I-12-41',
          kind: 'cheaper-route',
          why: 'The model leaned almost entirely on recent ATR. A simple ATR rule gets about 90% of its gain at a tenth of the cost, with nothing to overfit.',
        },
        {
          fromIdeaIds: ['I-12-05'],
          newIdeaId: 'I-12-42',
          kind: 'combination',
          why: 'Swing stops work in calm weeks but get run over in volatile ones; the regime analyst’s volatile-week flag switches to ATR when it matters.',
        },
      ],
      verdicts: ideas
        .filter((i) => i.round === 1 && i.result)
        .map((i) => ({
          ideaId: i.id,
          verdict: (i.state === 'promising' ||
          i.state === 'needs-evidence' ||
          i.state === 'rejected'
            ? i.state
            : 'promising') as 'promising' | 'needs-evidence' | 'rejected',
          reason: i.verdictReason ?? 'Passed all four gates.',
        })),
      summary:
        '35 ideas judged against the evidence. The red team upheld two serious objections: the machine-learned stop was overfitted and the Friday-close stop used a price that wasn’t known yet. The synthesiser turned the overfitted model into a cheaper, simpler rule.',
    },
    {
      id: 'C-12-2',
      missionId: 'M-12',
      round: 2,
      panel: [
        { memberId: 'chen', seat: 'chair' },
        { memberId: 'lars', seat: 'red-team' },
        { memberId: 'dana', seat: 'red-team' },
        { memberId: 'kiri', seat: 'synthesiser' },
        { memberId: 'bjorn', seat: 'advocate' },
        { memberId: 'mei', seat: 'advocate' },
        { memberId: 'priya', seat: 'specialist' },
      ],
      objections: ['O-12-40-du'],
      syntheses: [
        {
          fromIdeaIds: ['I-12-42'],
          newIdeaId: 'I-12-43',
          kind: 'combination',
          why: 'Adding a time stop to the swing/ATR switch is the last step the depth limit allows.',
        },
      ],
      verdicts: [40, 41, 42].map((n) => ({
        ideaId: `I-12-${n}`,
        verdict: 'promising' as const,
        reason: 'Passed all four gates.',
      })),
      summary:
        'The three alternatives all passed the gates and were shortlisted for the fresh-data check. One answered objection: I-12-40 is not a duplicate of I-12-01. I-12-43 waits in the queue at the depth limit.',
    },
  ];

  const mission: Mission = {
    id: 'M-12',
    title: 'Find a better way to handle stop-losses for the breakout strategy',
    goal: 'Find a better way to handle stop-losses for the breakout strategy',
    createdBy: 'Omar S. (Challenger)',
    kind: 'challenge',
    topicId: 'T-1',
    challengesBest: 'Fixed 20-pip stop',
    phase: 'fresh',
    round: 2,
    rules: rules(55, 'Fixed 20-pip stop'),
    reserved: 55,
    spent: 51.2,
    ideaIds: ideas.map((i) => i.id),
    councilIds: ['C-12-1', 'C-12-2'],
    libraryHits: ['L-024', 'L-030', 'L-014', 'L-015'],
    trialsRun: ideas.reduce((s, i) => s + (i.result?.trials ?? 0), 0),
    winnerIdeaIds: [],
    startRuleVersion: 2,
    spendByPhase: spend(4.1, 28.4, 7.6, 11.1, 0),
    history: [
      {
        time: '08:58:02',
        text: 'Queued by the Challenger: the current best is more than 30 days old',
        who: 'Omar S.’s agent',
      },
      { time: '09:01:15', text: 'Mission rules confirmed; $55.00 set aside', who: 'Platform' },
      {
        time: '09:01:20',
        text: 'Found 4 related entries: 2 reused, 1 dead end, 1 warning',
        who: 'Platform',
      },
      { time: '09:14:51', text: '43 ideas arrived from 11 members', who: 'Swarm' },
      {
        time: '09:15:02',
        text: '6 duplicates merged and counted once, 2 known dead ends not re-tested (L-014, L-018)',
        who: 'Platform',
      },
      {
        time: '09:41:10',
        text: '35 test plans registered and fingerprinted before testing',
        who: 'Platform',
      },
      {
        time: '10:22:47',
        text: 'Council round 1: 6 promising, 6 need evidence, 23 rejected',
        who: 'Council',
      },
      {
        time: '10:24:05',
        text: 'Synthesiser proposed 3 alternatives, including a cheaper route to I-12-07',
        who: 'Gustavo R.’s agent',
      },
      {
        time: '10:58:31',
        text: 'Council round 2: 3 shortlisted for the fresh-data check',
        who: 'Council',
      },
      { time: '11:02:00', text: 'Fresh data unsealed for 3 shortlisted ideas', who: 'Platform' },
      { time: '11:36:12', text: 'I-12-40 held up on fresh data', who: 'Platform' },
      { time: '11:52:40', text: 'I-12-41 held up on fresh data', who: 'Platform' },
      { time: '12:04:18', text: 'Fresh-data check running on I-12-42', who: 'Lars E.’s agent' },
    ],
  };
  return { mission, ideas, councils };
}

/* ------------------------------------------------------------------------ */
/* Finished missions: enough ideas for honest counts, plus their winners.   */

function bulk(
  mission: number,
  count: number,
  members: Member[],
  winners: IdeaSpec[],
  mix: { merged: number; passed: number; rejected: number },
): Idea[] {
  const rand = mulberry32(mission * 101);
  const crew = members.filter((m) => m.roles.includes('Explorer')).map((m) => m.id);
  const specs: IdeaSpec[] = [...winners];
  let n = 1;
  const used = new Set(winners.map((w) => w.n));
  const nextN = () => {
    while (used.has(n)) n++;
    used.add(n);
    return n;
  };
  const left = count - winners.length;
  for (let i = 0; i < left; i++) {
    const f = STOP_FILLERS[(i * 7 + mission) % STOP_FILLERS.length];
    const state: IdeaState =
      i < mix.merged ? 'merged' : i < mix.merged + mix.passed ? 'promising' : 'rejected';
    specs.push({
      n: nextN(),
      title: f.title,
      family: f.family,
      key: `${f.key}-${mission}-${i}`,
      by: crew[(i * 3 + mission) % crew.length],
      state,
      net:
        state === 'merged'
          ? undefined
          : state === 'promising'
            ? round2(1.7 + rand() * 0.4)
            : round2(-0.8 + rand() * 2.2),
    });
  }
  return specs
    .sort((a, b) => a.n - b.n)
    .map((sp) => makeIdea(mission, sp, members, rand, '10:00:00'));
}

export function buildFinished(members: Member[]) {
  const m5ideas = bulk(
    5,
    20,
    members,
    [
      {
        n: 4,
        title: 'Fixed 20-pip stop',
        summary: 'A slightly wider fixed stop than today’s 15 pips.',
        family: 'structure',
        key: 'sl-fixed-20',
        by: 'gustavo',
        state: 'held-up',
        net: 1.3,
        dd: -1.2,
        trades: 331,
        fresh: 1.1,
        freshBy: 'priya',
      },
    ],
    { merged: 3, passed: 3, rejected: 13 },
  );
  const m9ideas = bulk(
    9,
    18,
    members,
    [
      {
        n: 3,
        title: 'Compare the first hour after each open, 12 months',
        summary:
          'Average range in the first hour after the London open and after the New York open.',
        family: 'session',
        key: 'london-vs-ny',
        by: 'priya',
        state: 'held-up',
        net: 2.4,
        trades: 4100,
        fresh: 2.2,
        freshBy: 'lars',
      },
    ],
    { merged: 4, passed: 2, rejected: 11 },
  );
  const m8ideas = bulk(
    8,
    22,
    members,
    [
      {
        n: 6,
        title: 'Fade the Monday-morning gap',
        summary: 'Trade against the weekend gap, expecting it to fill by Tuesday.',
        family: 'structure',
        key: 'gap-fade',
        by: 'bjorn',
        state: 'held-up',
        net: 1.9,
        trades: 210,
        fresh: 1.4,
        freshBy: 'emeka',
      },
    ],
    { merged: 4, passed: 2, rejected: 15 },
  );
  const m7ideas = bulk(7, 24, members, [], { merged: 5, passed: 0, rejected: 19 });

  const base = (
    id: string,
    title: string,
    phase: Mission['phase'],
    extra: Partial<Mission>,
  ): Mission => ({
    id,
    title,
    goal: title,
    createdBy: 'Swarm',
    kind: 'open',
    phase,
    round: 2,
    rules: rules(40, 'The strategy as it trades today'),
    reserved: 40,
    spent: 34,
    ideaIds: [],
    councilIds: [],
    libraryHits: [],
    trialsRun: 0,
    winnerIdeaIds: [],
    history: [],
    spendByPhase: spend(2.4, 18.9, 5.1, 6.2, 1.4),
    ...extra,
  });
  const trials = (ideas: Idea[]) => ideas.reduce((s, i) => s + (i.result?.trials ?? 0), 0);

  const missions: Mission[] = [
    base(
      'M-13',
      'Does the ATR + time stop combination work in the week before an ECB meeting?',
      'queued',
      {
        kind: 'open',
        round: 0,
        reserved: 0,
        spent: 0,
        spawnedFromLibraryId: 'L-027',
        waitingFor: 'Waiting for the self-start budget',
        spendByPhase: spend(0, 0, 0, 0, 0),
        history: [
          {
            time: '11:41:00',
            text: 'Queued by the swarm from open question L-027. Waiting for the self-start budget.',
            who: 'Swarm',
          },
        ],
      },
    ),
    base('M-09', 'Does the London open move EURUSD more than the New York open?', 'learned', {
      kind: 'descriptive',
      createdBy: 'You',
      ideaIds: m9ideas.map((i) => i.id),
      trialsRun: trials(m9ideas),
      winnerIdeaIds: ['I-9-03'],
      approvalId: 'A-9',
      approvalRuleVersion: 1,
      startRuleVersion: 1,
      spent: 29.6,
      draft:
        'Over the last 12 months, the first hour after the London open moved EURUSD about 18% more than the first hour after the New York open (average range 21 pips against 18). It held up on the sealed recent 3 months. A description of past behaviour, not a trade instruction.',
      observedAt: '23 Nov, 09:40',
      publishedAt: '23 Nov, 10:02',
      expiresAt: '23 Dec, 10:00',
      provenWrongIf: 'The gap between the two opens falls below 5% over the next 3 months.',
      history: [
        { time: '08:10:00', text: 'Mission started', who: 'You' },
        {
          time: '10:02:11',
          text: 'Published automatically under approval rule v1',
          who: 'Council',
        },
      ],
    }),
    base('M-08', 'Is the Monday-morning gap in EURUSD usually filled by Tuesday?', 'withdrawn', {
      topicId: 'T-3',
      kind: 'challenge',
      challengesBest: 'No gap rule',
      ideaIds: m8ideas.map((i) => i.id),
      trialsRun: trials(m8ideas),
      winnerIdeaIds: ['I-8-06'],
      approvalId: 'A-8',
      approvalRuleVersion: 1,
      startRuleVersion: 1,
      spent: 36.2,
      draft:
        'Over the last 24 months, fading the Monday-morning gap on EURUSD did better than having no gap rule by 1.4 points after costs on the sealed recent 3 months. Research on past data, not a trade instruction.',
      observedAt: '12 Oct, 15:10',
      publishedAt: '12 Oct, 15:40',
      expiresAt: '12 Nov, 15:40',
      provenWrongIf:
        'The data behind it turns out to be incomplete, or paper results show no gain.',
      withdrawnNote:
        'Withdrawn automatically by the council on 19 Oct: the data feed reported missing weekend quotes, so the gaps it measured were partly not real. The previous best (no gap rule) was restored, and the lesson became library warning L-019, Red team v4 and approval rule v2.',
      history: [
        {
          time: '15:40:02',
          text: 'Published automatically under approval rule v1',
          who: 'Council',
        },
        {
          time: '09:12:30',
          text: 'Withdrawn: the data feed reported missing weekend quotes',
          who: 'Council',
        },
      ],
    }),
    base('M-07', 'Do wider fixed stops cut losing streaks?', 'closed-no-winner', {
      topicId: 'T-1',
      kind: 'challenge',
      challengesBest: 'Fixed 20-pip stop',
      ideaIds: m7ideas.map((i) => i.id),
      trialsRun: trials(m7ideas),
      spent: 31.4,
      history: [
        { time: '14:02:00', text: 'Queued by the Challenger', who: 'Omar S.’s agent' },
        {
          time: '15:00:40',
          text: 'Nothing cleared the bar to beat. Closed with no winner: a useful answer.',
          who: 'Council',
        },
      ],
      coachReview: {
        missionId: 'M-07',
        heldUpBy: [],
        objectionsRight: 3,
        falseAlarms: 1,
        wastedUsd: 9.4,
        sizeVerdict: 'too big',
        differentRouteResult: '2 tried, 0 passed the council.',
        proposals: ['PC-06'],
        sessions: 2,
      },
    }),
    base('M-05', 'Which fixed stop distance works best for 15-minute breakout trades?', 'learned', {
      topicId: 'T-1',
      kind: 'challenge',
      challengesBest: 'Fixed 15-pip stop',
      ideaIds: m5ideas.map((i) => i.id),
      trialsRun: trials(m5ideas),
      winnerIdeaIds: ['I-5-04'],
      approvalId: 'A-5',
      approvalRuleVersion: 1,
      startRuleVersion: 1,
      spent: 33.8,
      expired: true,
      draft:
        'On 15-minute EURUSD breakout trades, a fixed 20-pip stop did better than the 15-pip stop by 1.3 points after costs over 24 months, and by 1.1 points on the sealed recent 3 months, with a shorter longest losing streak (6 trades against 9). Research on past data, not a trade instruction.',
      observedAt: '14 Sep, 15:50',
      publishedAt: '14 Sep, 16:20',
      expiresAt: '14 Oct, 16:20',
      provenWrongIf: 'Paper results over the next 3 months show no gain over 15 pips.',
      history: [
        {
          time: '16:20:30',
          text: 'Published automatically under approval rule v1. Became the current best for “Breakout stop-loss”.',
          who: 'Council',
        },
      ],
      coachReview: {
        missionId: 'M-05',
        heldUpBy: ['Explorer · Claude Sonnet 5.5'],
        objectionsRight: 2,
        falseAlarms: 1,
        wastedUsd: 4.6,
        sizeVerdict: 'about right',
        differentRouteResult: '3 tried, 1 passed the council.',
        proposals: ['PC-06'],
        sessions: 2,
      },
    }),
  ];
  return { missions, ideas: [...m5ideas, ...m9ideas, ...m8ideas, ...m7ideas] };
}
