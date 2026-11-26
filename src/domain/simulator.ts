/**
 * The timed step plan for a new job. Pure data: the store applies one tick
 * every TICK_MS (2.3 s by default).
 */
export type Tick =
  | { kind: 'check' } // step 1
  | { kind: 'assign'; pass: number } // step 2: pick an online member, set aside the max cost
  | { kind: 'research' } // step 3: checking in starts
  | { kind: 'spend'; pct: number } // spent = pct of the max cost
  | { kind: 'handIn'; pct: number } // step 4: receipt checked
  | { kind: 'recheck' } // step 5: the re-checker starts
  | { kind: 'agree'; agreement: number } // step 6
  | { kind: 'challenge'; agreement: number } // re-check disagreed: back to step 2
  | { kind: 'drop' } // member's computer stops checking in
  | { kind: 'expire' } // lease runs out, late result refused, job reassigned
  | { kind: 'draft' } // step 7
  | { kind: 'human' }; // step 8: waits for a person. Stop.

export interface PlanOptions {
  challenge?: boolean;
  dropped?: boolean;
}

export const FIRST_AGREEMENT = 93;
export const CHALLENGE_AGREEMENT = 74;
export const SECOND_AGREEMENT = 95;

export function planTicks(opts: PlanOptions = {}): Tick[] {
  const plan: Tick[] = [
    { kind: 'check' },
    { kind: 'assign', pass: 1 },
    { kind: 'research' },
    { kind: 'spend', pct: 35 },
  ];
  if (opts.dropped) {
    plan.push(
      { kind: 'drop' },
      { kind: 'expire' },
      { kind: 'research' },
      { kind: 'spend', pct: 48 },
    );
  }
  plan.push({ kind: 'handIn', pct: 62 }, { kind: 'recheck' }, { kind: 'spend', pct: 81 });
  if (opts.challenge) {
    plan.push(
      { kind: 'challenge', agreement: CHALLENGE_AGREEMENT },
      { kind: 'assign', pass: 2 },
      { kind: 'research' },
      { kind: 'spend', pct: 86 },
      { kind: 'handIn', pct: 90 },
      { kind: 'recheck' },
      { kind: 'spend', pct: 96 },
      { kind: 'agree', agreement: SECOND_AGREEMENT },
    );
  } else {
    plan.push({ kind: 'agree', agreement: FIRST_AGREEMENT });
  }
  plan.push({ kind: 'draft' }, { kind: 'human' });
  return plan;
}
