import { APPROVAL_FLOORS, RULE_CHANGE_PANEL } from '../data/constants';
import { lineageMembers } from './lineage';
import type { ApprovalPanel, ApprovalRule, Approver, Idea, Member, Mission } from './types';

export const providerOf = (model: string) => (model.startsWith('Claude') ? 'Anthropic' : 'OpenAI');

/** Standing from work that held up, never from volume. */
export const trackScore = (m: Member) =>
  m.heldUpFresh * 2 + m.objectionsUpheld + m.calibration / 20;

/**
 * Pick `size` members across providers, round-robin, with at most `maxPer` from any one.
 * Returns null when it can't be done (too few members or providers).
 */
function pickAcrossProviders(
  pool: Member[],
  size: number,
  minProviders: number,
  maxPer: number,
): Member[] | null {
  const groups = new Map<string, Member[]>();
  for (const m of pool) {
    const p = providerOf(m.model);
    groups.set(p, [...(groups.get(p) ?? []), m]);
  }
  if (groups.size < minProviders) return null;
  const order = [...groups.values()];
  const picked: Member[] = [];
  const count = new Map<string, number>();
  let progress = true;
  while (picked.length < size && progress) {
    progress = false;
    for (const g of order) {
      if (picked.length >= size) break;
      const prov = providerOf(g[0].model);
      if ((count.get(prov) ?? 0) >= maxPer) continue;
      const next = g.find((m) => !picked.includes(m));
      if (!next) continue;
      picked.push(next);
      count.set(prov, (count.get(prov) ?? 0) + 1);
      progress = true;
    }
  }
  return picked.length === size ? picked : null;
}

/** Everyone who may not approve a mission: its winners' lineage, their fresh-data checkers, the editor. */
export function excludedForPublish(
  mission: Mission,
  byId: Record<string, Idea>,
  editorId?: string,
): Set<string> {
  const out = new Set<string>();
  for (const id of mission.winnerIdeaIds) {
    for (const m of lineageMembers(id, byId)) out.add(m);
    const f = byId[id]?.freshCheckedBy;
    if (f) out.add(f);
  }
  if (editorId) out.add(editorId);
  return out;
}

/** A fresh approval panel under the current rule (section 1.1). */
export function seatApprovalPanel(
  members: Member[],
  excluded: Set<string>,
  rule: ApprovalRule,
  turn = 0,
): Approver[] | null {
  const pool = members
    .filter((m) => m.online && m.roles.includes('Approver') && !excluded.has(m.id))
    .sort((a, b) => trackScore(b) - trackScore(a));
  const rotated = pool.map((_, i) => pool[(i + turn) % pool.length]);
  const maxPer = Math.floor(rule.panelSize * rule.maxProviderShare);
  const picked = pickAcrossProviders(rotated, rule.panelSize, rule.minProviders, maxPer);
  return picked?.map((m) => ({ memberId: m.id, provider: providerOf(m.model) })) ?? null;
}

/** The stricter rule-change panel (section 6.5): 7 seats from the strongest track records. */
export function seatRuleChangePanel(members: Member[], excluded: Set<string>): Approver[] | null {
  const pool = members
    .filter((m) => m.online && m.standing !== 'Coach' && !excluded.has(m.id))
    .sort((a, b) => trackScore(b) - trackScore(a));
  const picked = pickAcrossProviders(
    pool,
    RULE_CHANGE_PANEL.size,
    APPROVAL_FLOORS.minProviders,
    RULE_CHANGE_PANEL.maxPerProvider,
  );
  return picked?.map((m) => ({ memberId: m.id, provider: providerOf(m.model) })) ?? null;
}

export interface PanelTally {
  approvals: number;
  rejects: number;
  ruleReject: boolean;
  done: boolean;
}

export function tally(panel: ApprovalPanel): PanelTally {
  const approvals = panel.approvers.filter((a) => a.vote === 'approve').length;
  const rejects = panel.approvers.filter((a) => a.vote === 'reject').length;
  return {
    approvals,
    rejects,
    ruleReject: panel.approvers.some((a) => a.vote === 'reject' && a.citesRule !== undefined),
    done: approvals + rejects === panel.approvers.length,
  };
}

/** Publishing needs the rule's approvals and no reject that cites a broken rule. */
export function decidePublish(panel: ApprovalPanel): 'published' | 'sent-back' | undefined {
  const t = tally(panel);
  if (!t.done) return undefined;
  return t.approvals >= panel.needed && !t.ruleReject ? 'published' : 'sent-back';
}

/** Rule-change panels need 6 of 7 and no rule-citing reject. */
export function decideRuleChange(panel: ApprovalPanel): 'adopted' | 'rejected' | undefined {
  const t = tally(panel);
  if (!t.done) return undefined;
  return t.approvals >= RULE_CHANGE_PANEL.needed && !t.ruleReject ? 'adopted' : 'rejected';
}

type RuleShape = Pick<
  ApprovalRule,
  'panelSize' | 'approvalsNeeded' | 'minProviders' | 'maxProviderShare' | 'scopes'
>;

/** Floors that no approval-rule change can break. Returns the broken ones in plain words. */
export function belowFloor(rule: RuleShape): string[] {
  const out: string[] = [];
  const check = (size: number, needed: number, where: string) => {
    if (size < APPROVAL_FLOORS.minPanel)
      out.push(`${where}: at least ${APPROVAL_FLOORS.minPanel} approvers are required.`);
    if (needed < APPROVAL_FLOORS.minApprovals)
      out.push(`${where}: at least ${APPROVAL_FLOORS.minApprovals} approvals are required.`);
  };
  check(rule.panelSize, rule.approvalsNeeded, 'Every panel');
  for (const s of rule.scopes ?? []) check(s.panelSize, s.approvalsNeeded, `“${s.scope}”`);
  if (rule.minProviders < APPROVAL_FLOORS.minProviders)
    out.push(`At least ${APPROVAL_FLOORS.minProviders} AI providers must sit on every panel.`);
  if (rule.maxProviderShare > APPROVAL_FLOORS.maxProviderShare)
    out.push(
      `No provider may hold more than ${APPROVAL_FLOORS.maxProviderShare * 100}% of the seats.`,
    );
  return out;
}

/** The rule that would result from a change. */
export function applyRuleChange(
  rule: ApprovalRule,
  change: Partial<ApprovalRule>,
  version: number,
): ApprovalRule {
  return { ...rule, ...change, version, status: 'proposed' };
}
