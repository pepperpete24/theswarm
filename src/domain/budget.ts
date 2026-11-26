import { DAILY_SWARM_CAP, MAX_ACTIVE_JOBS, MEMBER_DAILY_CAP } from '../data/constants';
import type { Job, Member } from './types';

export const ACTIVE_STATES = ['queued', 'researching', 'rechecking', 'challenged'] as const;

export function isActive(job: Job): boolean {
  return (ACTIVE_STATES as readonly string[]).includes(job.state);
}

export interface BudgetSummary {
  /** Money already used today: charged member spend plus live spend on running jobs. */
  spent: number;
  /** Money set aside for running jobs but not yet used. */
  setAside: number;
  /** What is left for new jobs today. */
  free: number;
  cap: number;
}

export const money = (n: number) => `$${n.toFixed(2)}`;
const round = (n: number) => Math.round(n * 100) / 100;

export function summariseBudget(
  jobs: Job[],
  members: Member[],
  cap = DAILY_SWARM_CAP,
): BudgetSummary {
  const charged = members.reduce((s, m) => s + m.spentToday, 0);
  const live = jobs.filter((j) => !j.charged && isActive(j));
  const liveSpent = live.reduce((s, j) => s + j.spent, 0);
  const setAside = live.reduce((s, j) => s + Math.max(0, j.reserved - j.spent), 0);
  const spent = charged + liveSpent;
  return {
    spent: round(spent),
    setAside: round(setAside),
    free: round(Math.max(0, cap - spent - setAside)),
    cap,
  };
}

/** Members who could take a job of this size right now. */
export function eligibleMembers(
  members: Member[],
  maxCost: number,
  exclude: string[] = [],
): Member[] {
  return members.filter(
    (m) => m.online && !exclude.includes(m.id) && m.spentToday + maxCost <= m.dailyCap,
  );
}

export type Admission = { ok: true } | { ok: false; reason: string; fix: string };

/** The platform's admission check for a new job, with plain-language reasons on refusal. */
export function admit(
  maxCost: number,
  jobs: Job[],
  members: Member[],
  exclude: string[] = [],
): Admission {
  if (!Number.isFinite(maxCost) || maxCost <= 0) {
    return {
      ok: false,
      reason: 'The most it may cost has to be more than $0.',
      fix: 'Enter an amount such as $1.50.',
    };
  }
  const budget = summariseBudget(jobs, members);
  if (maxCost > budget.free) {
    return {
      ok: false,
      reason: `This job could cost up to ${money(maxCost)}, but only ${money(budget.free)} of today's $${budget.cap} limit is free. The rest is spent or set aside for jobs that are running.`,
      fix: `Lower the most it may cost to ${money(budget.free)} or less, or wait for running jobs to finish and hand back what they didn't use.`,
    };
  }
  if (jobs.filter(isActive).length >= MAX_ACTIVE_JOBS) {
    return {
      ok: false,
      reason: `The swarm is already running ${MAX_ACTIVE_JOBS} jobs, which is the pilot's limit.`,
      fix: 'Try again when one finishes.',
    };
  }
  if (eligibleMembers(members, maxCost, exclude).length === 0) {
    return {
      ok: false,
      reason: `No online member has ${money(maxCost)} left under their own $${MEMBER_DAILY_CAP}-a-day limit.`,
      fix: 'Lower the most it may cost, or resume a paused member on the Contributors page.',
    };
  }
  return { ok: true };
}
