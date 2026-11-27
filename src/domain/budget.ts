import { DAILY_SWARM_CAP } from '../data/constants';
import { isRunning } from './library';
import type { Member, Mission } from './types';

export interface BudgetSummary {
  spent: number;
  setAside: number;
  free: number;
  cap: number;
}

export const money = (n: number) => `$${n.toFixed(2)}`;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Today: what members have been charged, what running missions still hold, and what is free. */
export function summariseBudget(
  missions: Mission[],
  members: Member[],
  cap = DAILY_SWARM_CAP,
): BudgetSummary {
  const spent = members.reduce((s, m) => s + m.spentToday, 0);
  const setAside = missions
    .filter(isRunning)
    .reduce((s, m) => s + Math.max(0, m.reserved - m.spent), 0);
  return {
    spent: r2(spent),
    setAside: r2(setAside),
    free: r2(Math.max(0, cap - spent - setAside)),
    cap,
  };
}

export type Admission = { ok: true } | { ok: false; reason: string; fix: string };

/** Admission check for a new mission, with plain-language reasons on refusal. */
export function admitMission(budget: number, missions: Mission[], members: Member[]): Admission {
  if (!Number.isFinite(budget) || budget <= 0)
    return {
      ok: false,
      reason: 'The budget has to be more than $0.',
      fix: 'Enter an amount such as $40.',
    };
  const b = summariseBudget(missions, members);
  if (budget > b.free)
    return {
      ok: false,
      reason: `This mission could cost up to ${money(budget)}, but only ${money(b.free)} of today’s $${b.cap} limit is free. The rest is spent or set aside for missions that are running.`,
      fix: `Lower the budget to ${money(b.free)} or less, or wait for a running mission to finish and hand back what it didn’t use.`,
    };
  if (members.filter((m) => m.online).length < 5)
    return {
      ok: false,
      reason:
        'Fewer than 5 members are online, so the council and approval panels can’t be seated.',
      fix: 'Resume a paused member on the Contributors page.',
    };
  return { ok: true };
}

/**
 * Charge an amount to members, starting with the preferred ones, never past
 * anyone's own daily limit. Anything left over is carried by hosted workers.
 */
export function chargeMembers(members: Member[], amount: number, preferred: string[]): Member[] {
  let left = amount;
  const order = [
    ...preferred,
    ...members.filter((m) => m.online && !preferred.includes(m.id)).map((m) => m.id),
  ];
  const add = new Map<string, number>();
  const share = amount / Math.max(1, preferred.length || 1);
  for (const id of order) {
    if (left <= 0.0001) break;
    const m = members.find((x) => x.id === id);
    if (!m) continue;
    const room = m.dailyCap - m.spentToday - (add.get(id) ?? 0);
    const take = Math.min(room, preferred.includes(id) ? share : left, left);
    if (take <= 0) continue;
    add.set(id, (add.get(id) ?? 0) + take);
    left -= take;
  }
  return members.map((m) =>
    add.has(m.id) ? { ...m, spentToday: r2(m.spentToday + add.get(m.id)!) } : m,
  );
}
