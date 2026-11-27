import { barToBeat, heldUp } from './gates';
import type { BestEntry, Idea, MissionRules, Topic } from './types';

export const CHALLENGE_AFTER_DAYS = 30;

export function currentBest(topic: Topic): BestEntry {
  const c = topic.history.find((h) => h.status === 'current');
  if (!c) throw new Error(`${topic.id} has no current best`);
  return c;
}

/** The bar a challenger must clear: it counts every trial ever run on the topic. */
export const topicBar = (topic: Topic) => barToBeat(topic.totalTrials);

/**
 * The four conditions in section 6.3. `idea.result` is measured against the
 * current best, so a positive delta means it beat it.
 */
export function canReplaceBest(
  idea: Idea,
  topic: Topic,
  approved: boolean,
): { ok: boolean; reasons: string[] } {
  const r = idea.result;
  const bar = topicBar(topic);
  const reasons: string[] = [];
  if (!r || r.netReturnDelta <= 0) reasons.push('It did not beat the current best after costs.');
  if (!r || r.netReturnDelta < bar)
    reasons.push(
      `It did not clear the topic’s bar of ${bar} pts (${topic.totalTrials.toLocaleString('en-GB')} trials so far).`,
    );
  if (!heldUp(idea)) reasons.push('It did not hold up on fresh data.');
  if (!approved) reasons.push('No approval panel has passed it.');
  return { ok: reasons.length === 0, reasons };
}

/** Retire the current best and put the new one in its place. The old one is kept. */
export function replaceBest(
  topic: Topic,
  next: {
    rule: string;
    missionId: string;
    ideaId: string;
    gain: number;
    when: string;
    date: string;
  },
): Topic {
  const cur = currentBest(topic);
  return {
    ...topic,
    beaten: topic.beaten + 1,
    openChallengeMissionId: undefined,
    history: [
      ...topic.history.map((h) =>
        h === cur
          ? {
              ...h,
              status: 'retired' as const,
              until: next.when,
              why: `Beaten by ${next.missionId}`,
            }
          : h,
      ),
      {
        rule: next.rule,
        missionId: next.missionId,
        ideaId: next.ideaId,
        since: next.when,
        sinceDate: next.date,
        netReturnVsStart: +(cur.netReturnVsStart + next.gain).toFixed(2),
        status: 'current',
        why: `Beat “${cur.rule}” by ${next.gain} pts after costs and held up on fresh data.`,
      },
    ],
  };
}

/** If the current best is withdrawn, the previous best comes back automatically. */
export function restorePrevious(topic: Topic, when: string, date: string, reason: string): Topic {
  const cur = currentBest(topic);
  const prev = [...topic.history].reverse().find((h) => h !== cur && h.status === 'retired');
  if (!prev) return topic;
  return {
    ...topic,
    history: [
      ...topic.history.map((h) =>
        h === cur ? { ...h, status: 'withdrawn' as const, until: when, why: reason } : h,
      ),
      {
        ...prev,
        since: when,
        sinceDate: date,
        until: undefined,
        status: 'current',
        why: `Restored automatically when “${cur.rule}” was withdrawn.`,
      },
    ],
  };
}

export type ChallengeTrigger = 'age' | 'regime-change' | 'new-library' | 'paper-drift';

export const TRIGGER_LABEL: Record<ChallengeTrigger, string> = {
  age: `Older than ${CHALLENGE_AFTER_DAYS} days`,
  'regime-change': 'Market conditions changed',
  'new-library': 'New related finding in the library',
  'paper-drift': 'Paper results drifting below its test',
};

export interface DueChallenge {
  topicId: string;
  trigger: ChallengeTrigger;
  waitingForFresh: boolean;
}

const daysBetween = (a: string, b: string) =>
  Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);

/** Which topics the Challenger should challenge now. At most one open challenge per topic. */
export function dueChallenges(
  topics: Topic[],
  today: string,
  signals: Partial<Record<Exclude<ChallengeTrigger, 'age'>, string[]>> = {},
): DueChallenge[] {
  const out: DueChallenge[] = [];
  for (const t of topics) {
    if (t.openChallengeMissionId) continue;
    const best = currentBest(t);
    let trigger: ChallengeTrigger | undefined;
    if (daysBetween(best.sinceDate, today) > CHALLENGE_AFTER_DAYS) trigger = 'age';
    for (const k of ['regime-change', 'new-library', 'paper-drift'] as const)
      if (!trigger && signals[k]?.includes(t.id)) trigger = k;
    if (trigger) out.push({ topicId: t.id, trigger, waitingForFresh: !t.nextFreshWindow });
  }
  return out;
}

/** The part of a mission's budget kept for the Pathfinder's different routes. */
export const differentRouteBudget = (rules: MissionRules) =>
  +(rules.budget * rules.differentRouteShare).toFixed(2);
