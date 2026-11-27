import { MIN_SAVING, RULE_CHANGE_PANEL } from '../data/constants';
import { applyRuleChange, belowFloor } from './approval';
import type {
  ApprovalRule,
  CoachReview,
  CouncilSession,
  Idea,
  Mission,
  ProcessChange,
  ReplayResult,
} from './types';

/** The Coach's review of how a mission went: its process, not its market result. */
export function review(
  mission: Mission,
  ideas: Idea[],
  sessions: CouncilSession[],
  proposals: string[] = [],
): CoachReview {
  const held = ideas.filter((i) => i.state === 'held-up');
  const objections = ideas.flatMap((i) => i.objections);
  const wasted = ideas
    .filter((i) => i.result && i.result.netReturnDelta <= 0)
    .reduce((s, i) => s + (i.result?.computeCost ?? 0), 0);
  const different = ideas.filter((i) => i.route === 'different-route');
  const passed = different.filter((i) =>
    ['promising', 'fresh-check', 'held-up', 'failed-fresh'].includes(i.state),
  );
  const childOfDifferent = ideas.some(
    (i) => i.state === 'held-up' && i.parentIds.some((p) => different.some((d) => d.id === p)),
  );
  const sizeVerdict: CoachReview['sizeVerdict'] =
    held.length === 0 && ideas.length > 20
      ? 'too big'
      : ideas.length < 8
        ? 'too small'
        : 'about right';
  return {
    missionId: mission.id,
    heldUpBy: [...new Set(held.map((i) => `${i.agentRole} · ${i.model}`))],
    objectionsRight: objections.filter((o) => o.status === 'upheld').length,
    falseAlarms: objections.filter((o) => o.status === 'answered').length,
    wastedUsd: +wasted.toFixed(2),
    sizeVerdict,
    differentRouteResult: different.length
      ? `${different.length} tried, ${passed.length} passed the council${childOfDifferent ? ', and one led to a winner' : ''}.`
      : 'None tried.',
    proposals,
    sessions: sessions.length,
  };
}

/** Replays may never use the missions a change was learned from. */
export const replayable = (change: ProcessChange, missionIds: string[]) =>
  missionIds.filter((id) => !change.learnedFrom.includes(id));

const costPerFinding = (r: ReplayResult, i: 0 | 1) => r.costUsd[i] / Math.max(1, r.heldUp[i]);

/** Section 6.4 adoption rule for ordinary process changes. */
export function meetsAdoptionRule(r: ReplayResult): boolean {
  const saving = 1 - r.costUsd[1] / r.costUsd[0];
  return (
    r.heldUp[1] >= r.heldUp[0] &&
    r.falseWins[1] <= r.falseWins[0] &&
    (saving >= MIN_SAVING || r.heldUp[1] > r.heldUp[0])
  );
}

/** Section 6.5 adoption rule for approval-rule changes: stricter, and false wins are non-negotiable. */
export function meetsRuleChangeRule(r: ReplayResult, replayedOn: number): boolean {
  if (replayedOn < RULE_CHANGE_PANEL.minReplay) return false;
  if (r.falseWins[1] > r.falseWins[0]) return false;
  if (r.heldUp[1] < r.heldUp[0] - 1) return false;
  return (
    r.falseWins[1] < r.falseWins[0] ||
    r.heldUp[1] > r.heldUp[0] ||
    costPerFinding(r, 1) < costPerFinding(r, 0)
  );
}

export type Screening = { ok: true } | { ok: false; reason: string };

/**
 * First check on any Coach proposal, before replay. Fixed rules are always refused,
 * and approval-rule changes may not go below the floors.
 */
export function screen(change: ProcessChange, current: ApprovalRule): Screening {
  if (change.touchesFixedRule)
    return { ok: false, reason: 'It would change a fixed rule. No agent can change those.' };
  if (change.kind === 'approval-rule' && change.ruleChange) {
    const broken = belowFloor(applyRuleChange(current, change.ruleChange, current.version + 1));
    if (broken.length) return { ok: false, reason: `Below the floor. ${broken.join(' ')}` };
  }
  return { ok: true };
}

/** Whether a change passes its adoption rule (before any panel). */
export function adopt(change: ProcessChange): boolean {
  if (!change.replay) return false;
  return change.kind === 'approval-rule'
    ? meetsRuleChangeRule(change.replay, change.replayedOn.length)
    : meetsAdoptionRule(change.replay);
}

/** Follow-up review after 5 real missions: roll back if it did worse. */
export function followUp(
  before: { heldUp: number; falseWins: number },
  after: { heldUp: number; falseWins: number },
): 'keep' | 'roll back' {
  return after.heldUp < before.heldUp || after.falseWins > before.falseWins ? 'roll back' : 'keep';
}
