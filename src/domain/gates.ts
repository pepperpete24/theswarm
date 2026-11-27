import { BAR_BASE, MIN_TRADES } from '../data/constants';
import type { Idea, Verdict } from './types';

/**
 * Minimum net-return improvement (percentage points) an idea must show.
 * Illustrative only: the more ideas tried, the higher the bar.
 */
export const barToBeat = (trials: number, base = BAR_BASE) =>
  +(base * Math.sqrt(1 + Math.log(Math.max(1, trials)))).toFixed(2);

export interface GateCheck {
  n: 1 | 2 | 3 | 4;
  name: string;
  pass: boolean;
  reason: string;
}

/** The four gates in section 1. Code applies them; the council explains and challenges. */
export function applyGates(idea: Idea, trialsRun: number): GateCheck[] {
  const r = idea.result;
  const bar = barToBeat(trialsRun);
  if (!r) {
    return [1, 2, 3, 4].map((n) => ({
      n: n as GateCheck['n'],
      name: GATE_NAMES[n - 1],
      pass: false,
      reason: 'Not tested yet.',
    }));
  }
  const blocking = idea.objections.filter((o) => o.status !== 'answered');
  return [
    {
      n: 1,
      name: GATE_NAMES[0],
      pass: r.netReturnDelta > 0,
      reason:
        r.netReturnDelta > 0
          ? `Beat the baseline by ${fmtPts(r.netReturnDelta)} after costs.`
          : `Did ${fmtPts(Math.abs(r.netReturnDelta))} worse than the baseline after costs.`,
    },
    {
      n: 2,
      name: GATE_NAMES[1],
      pass: r.netReturnDelta >= bar,
      reason:
        r.netReturnDelta >= bar
          ? `Cleared the bar of ${fmtPts(bar)} set by ${trialsRun.toLocaleString('en-GB')} trials.`
          : `Needed ${fmtPts(bar)} after ${trialsRun.toLocaleString('en-GB')} trials; got ${fmtPts(r.netReturnDelta)}.`,
    },
    {
      n: 3,
      name: GATE_NAMES[2],
      pass: r.trades >= MIN_TRADES,
      reason:
        r.trades >= MIN_TRADES
          ? `${r.trades} trades, above the minimum of ${MIN_TRADES}.`
          : `Only ${r.trades} trades; the minimum is ${MIN_TRADES}.`,
    },
    {
      n: 4,
      name: GATE_NAMES[3],
      pass: blocking.length === 0,
      reason:
        blocking.length === 0
          ? idea.objections.length
            ? 'Every objection was answered.'
            : 'No objections raised.'
          : `${blocking.length} objection${blocking.length > 1 ? 's' : ''} ${blocking.some((o) => o.status === 'upheld') ? 'upheld' : 'still open'}.`,
    },
  ];
}

export const GATE_NAMES = [
  'Beats the baseline after costs',
  'Clears the bar to beat',
  'Enough trades',
  'No open or upheld objection',
];

export const fmtPts = (n: number) => `${n.toFixed(2).replace(/\.?0+$/, '') || '0'} pts`;

/** Verdict from the gates: rejected on a hard fail, needs evidence on a soft one. */
export function verdictFor(idea: Idea, trialsRun: number): { verdict: Verdict; reason: string } {
  const g = applyGates(idea, trialsRun);
  const upheld = idea.objections.find((o) => o.status === 'upheld');
  if (upheld) return { verdict: 'rejected', reason: `Objection upheld: ${upheld.text}` };
  if (!g[0].pass) return { verdict: 'rejected', reason: g[0].reason };
  if (!g[1].pass) return { verdict: 'rejected', reason: g[1].reason };
  if (!g[2].pass) return { verdict: 'needs-evidence', reason: g[2].reason };
  if (!g[3].pass) return { verdict: 'needs-evidence', reason: g[3].reason };
  return { verdict: 'promising', reason: 'Passed all four gates.' };
}

/** Held up on fresh data: still beats the baseline after costs and keeps at least half its gain. */
export function heldUp(idea: Idea): boolean {
  const t = idea.result;
  const f = idea.freshResult;
  if (!t || !f) return false;
  return f.netReturnDelta > 0 && f.netReturnDelta >= t.netReturnDelta * 0.5;
}
