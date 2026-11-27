import { describe, expect, it } from 'vitest';
import { TAMPER_FROM, TAMPER_INDEX, TAMPER_TO, seedAudit } from '../data/audit';
import { EXAMPLE_FRESH, EXAMPLE_RUNNING, RULE_CHANGE_PANEL } from '../data/constants';
import { seedRules } from '../data/knowledge';
import { makePrices } from '../data/prices';
import { seedWorld } from '../data/seed';
import {
  belowFloor,
  decidePublish,
  decideRuleChange,
  providerOf,
  seatApprovalPanel,
  seatRuleChangePanel,
} from '../domain/approval';
import { GENESIS, buildChain, repairEntry, tamperEntry, verifyChain } from '../domain/auditChain';
import { admitMission, summariseBudget } from '../domain/budget';
import { adopt, followUp, meetsRuleChangeRule, replayable, screen } from '../domain/coach';
import { judgesFor, redTeamFor, seatCouncil } from '../domain/council';
import { matchDeadEnds, mergeDuplicates } from '../domain/dedupe';
import { missionFunnel } from '../domain/funnel';
import { applyGates, barToBeat, heldUp, verdictFor } from '../domain/gates';
import {
  canReplaceBest,
  currentBest,
  dueChallenges,
  replaceBest,
  restorePrevious,
} from '../domain/improvement';
import { checkLibrary } from '../domain/library';
import { canSpawn, lineageMembers } from '../domain/lineage';
import { RECEIPT_FIELDS, buildReceipt } from '../domain/manifest';
import { planMission } from '../domain/simulator';
import type { ApprovalPanel, Idea, ProcessChange } from '../domain/types';

const { world } = seedWorld();
const idea = (id: string) => world.ideas[id];
const active = seedRules.find((r) => r.status === 'active')!;

describe('seed consistency', () => {
  it('funnel counts always equal the idea states for M-12', () => {
    const m = world.missions.find((x) => x.id === 'M-12')!;
    const f = missionFunnel(m.ideaIds.map((id) => world.ideas[id]));
    expect(f).toMatchObject({
      proposed: 47,
      removed: 8,
      tested: 38,
      passed: 9,
      shortlisted: 3,
      heldUp: 2,
    });
  });

  it('every objection references a real idea and every library entry a real mission', () => {
    for (const i of Object.values(world.ideas))
      for (const o of i.objections) expect(world.ideas[o.ideaId]).toBeDefined();
    const ids = new Set(world.missions.map((m) => m.id));
    for (const e of world.library) expect(ids.has(e.fromMissionId)).toBe(true);
  });

  it('each topic has exactly one current best', () => {
    for (const t of world.topics)
      expect(t.history.filter((h) => h.status === 'current')).toHaveLength(1);
  });

  it('leaves enough free budget for a $40 mission', () => {
    expect(summariseBudget(world.missions, world.members).free).toBeGreaterThanOrEqual(40);
  });

  it('prices are seeded', () => {
    expect(makePrices()).toEqual(makePrices());
  });
});

describe('budget', () => {
  it('admits a normal mission and refuses one above the free budget with a fix', () => {
    expect(admitMission(40, world.missions, world.members)).toEqual({ ok: true });
    const r = admitMission(500, world.missions, world.members);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fix).toMatch(/Lower the budget/);
  });
});

describe('library check', () => {
  it('finds a running mission with the same goal', () => {
    expect(
      checkLibrary(EXAMPLE_RUNNING, world.library, world.missions, world.topics).running?.id,
    ).toBe('M-12');
  });

  it('finds the take-profit topic, a dead end and a reusable method for the fresh example', () => {
    const c = checkLibrary(EXAMPLE_FRESH, world.library, world.missions, world.topics);
    expect(c.running).toBeUndefined();
    expect(c.topic?.id).toBe('T-4');
    expect(c.deadEnds.map((e) => e.id)).toContain('L-022');
    expect(c.reuse.length).toBeGreaterThan(0);
  });
});

describe('dedupe and dead ends', () => {
  const base = idea('I-12-01');
  const mk = (id: string, key: string): Idea => ({ ...base, id, key, state: 'proposed' });
  it('merges near-duplicates into the first proposer', () => {
    const m = mergeDuplicates([mk('a', 'k1'), mk('b', 'k2'), mk('c', 'k1')]);
    expect([...m.entries()]).toEqual([['c', 'a']]);
  });
  it('flags ideas that match a library dead end', () => {
    expect(matchDeadEnds([mk('x', 'sl-fixed-25')], world.library).get('x')?.id).toBe('L-014');
  });
});

describe('gates', () => {
  it('the bar to beat rises with the number of trials', () => {
    expect(barToBeat(1)).toBe(0.6);
    expect(barToBeat(100)).toBeLessThan(barToBeat(1000));
    expect(barToBeat(2900)).toBeCloseTo(1.8, 1);
  });

  it('gives the brief’s verdicts on the named M-12 ideas', () => {
    const t = world.missions.find((m) => m.id === 'M-12')!.trialsRun;
    expect(verdictFor(idea('I-12-01'), t).verdict).toBe('promising');
    expect(verdictFor(idea('I-12-03'), t).verdict).toBe('needs-evidence');
    expect(verdictFor(idea('I-12-07'), t).verdict).toBe('rejected');
    expect(verdictFor(idea('I-12-08'), t).verdict).toBe('rejected');
    expect(verdictFor(idea('I-12-14'), t).reason).toMatch(/Objection upheld/);
    expect(applyGates(idea('I-12-40'), t).every((g) => g.pass)).toBe(true);
  });

  it('held up means it still beats the baseline and keeps half its gain', () => {
    expect(heldUp(idea('I-12-40'))).toBe(true);
    expect(heldUp(idea('I-12-42'))).toBe(false);
  });
});

describe('council', () => {
  it('seats seven different members and nobody judges their own lineage', () => {
    const panel = seatCouncil(world.members, 3);
    expect(new Set(panel.map((p) => p.memberId)).size).toBe(panel.length);
    for (const id of ['I-12-40', 'I-12-41', 'I-12-07']) {
      const lineage = lineageMembers(id, world.ideas);
      for (const j of judgesFor(id, panel, world.ideas))
        expect(lineage.has(j.memberId)).toBe(false);
      const red = redTeamFor(id, panel, world.ideas);
      if (red) expect(lineage.has(red)).toBe(false);
    }
  });

  it('lineage includes every ancestor’s proposer; spawning stops at the depth limit', () => {
    expect([...lineageMembers('I-12-40', world.ideas)].sort()).toEqual([
      'aroha',
      'emeka',
      'gustavo',
    ]);
    expect(canSpawn(1, 2)).toBe(true);
    expect(canSpawn(2, 2)).toBe(false);
  });
});

describe('approval panels', () => {
  it('seats 5 approvers across at least 2 providers, none excluded, none over 60%', () => {
    const excluded = new Set(['aroha', 'gustavo', 'ines', 'dana']);
    const a = seatApprovalPanel(world.members, excluded, active)!;
    expect(a).toHaveLength(5);
    expect(new Set(a.map((x) => x.provider)).size).toBeGreaterThanOrEqual(2);
    for (const x of a) expect(excluded.has(x.memberId)).toBe(false);
    const per = new Map<string, number>();
    for (const x of a) per.set(x.provider, (per.get(x.provider) ?? 0) + 1);
    for (const n of per.values()) expect(n).toBeLessThanOrEqual(3);
  });

  it('fails clearly when two providers can’t be seated', () => {
    const claudeOnly = world.members.map((m) =>
      providerOf(m.model) === 'OpenAI' ? { ...m, online: false } : m,
    );
    expect(seatApprovalPanel(claudeOnly, new Set(), active)).toBeNull();
  });

  const panel = (votes: ('approve' | 'reject' | 'rule')[], needed = 4): ApprovalPanel => ({
    id: 'X',
    purpose: 'publish',
    subjectId: 'M-1',
    ideaIds: [],
    ruleVersion: 2,
    needed,
    approvers: votes.map((v, i) => ({
      memberId: String(i),
      provider: 'A',
      vote: v === 'rule' ? 'reject' : v,
      citesRule: v === 'rule' ? 8 : undefined,
    })),
  });

  it('publishes on 4 of 5 with no rule-citing reject', () => {
    expect(decidePublish(panel(['approve', 'approve', 'reject', 'approve', 'approve']))).toBe(
      'published',
    );
    expect(decidePublish(panel(['approve', 'approve', 'rule', 'approve', 'approve']))).toBe(
      'sent-back',
    );
    expect(decidePublish(panel(['approve', 'reject', 'reject', 'approve', 'approve']))).toBe(
      'sent-back',
    );
  });

  it('rule-change panels: 7 seats, no Coach, at most 4 per provider, 6 of 7 needed', () => {
    const excluded = new Set(['omar']);
    const a = seatRuleChangePanel(world.members, excluded)!;
    expect(a).toHaveLength(RULE_CHANGE_PANEL.size);
    expect(a.map((x) => x.memberId)).not.toContain('chen');
    expect(a.map((x) => x.memberId)).not.toContain('omar');
    const per = new Map<string, number>();
    for (const x of a) per.set(x.provider, (per.get(x.provider) ?? 0) + 1);
    expect(per.size).toBeGreaterThanOrEqual(2);
    for (const n of per.values()) expect(n).toBeLessThanOrEqual(4);
    const p = (n: number): ApprovalPanel => ({
      ...panel(Array.from({ length: 7 }, (_, i) => (i < n ? 'approve' : 'reject'))),
      purpose: 'rule-change',
      needed: 6,
    });
    expect(decideRuleChange(p(6))).toBe('adopted');
    expect(decideRuleChange(p(5))).toBe('rejected');
  });
});

describe('approval-rule changes (section 6.5)', () => {
  const change = (over: Partial<ProcessChange>): ProcessChange => ({
    id: 'PC-99',
    change: 'x',
    why: 'y',
    kind: 'approval-rule',
    learnedFrom: ['M-09'],
    replayedOn: [],
    status: 'replaying',
    ...over,
  });

  it('refuses anything below the floors', () => {
    expect(belowFloor({ ...active, approvalsNeeded: 3 })).not.toHaveLength(0);
    expect(belowFloor({ ...active, minProviders: 1 })).not.toHaveLength(0);
    expect(belowFloor(active)).toHaveLength(0);
    const r = screen(
      change({ ruleChange: { scopes: [{ scope: 'D', panelSize: 5, approvalsNeeded: 3 }] } }),
      active,
    );
    expect(r.ok).toBe(false);
  });

  it('refuses any change that touches a fixed rule', () => {
    expect(screen(change({ kind: 'defaults', touchesFixedRule: true }), active).ok).toBe(false);
  });

  it('needs at least 10 replayed missions and never more false wins', () => {
    const r = {
      heldUp: [14, 14] as [number, number],
      falseWins: [1, 0] as [number, number],
      costUsd: [200, 205] as [number, number],
    };
    expect(meetsRuleChangeRule(r, 10)).toBe(true);
    expect(meetsRuleChangeRule(r, 9)).toBe(false);
    expect(meetsRuleChangeRule({ ...r, falseWins: [0, 1] }, 12)).toBe(false);
    expect(meetsRuleChangeRule({ ...r, heldUp: [14, 12] }, 12)).toBe(false);
  });

  it('replays never use the missions a change was learned from', () => {
    expect(replayable(change({ learnedFrom: ['M-09'] }), ['M-08', 'M-09', 'M-10'])).toEqual([
      'M-08',
      'M-10',
    ]);
  });

  it('ordinary changes need no loss and a 10% saving or more findings; probation rolls back', () => {
    const c = change({
      kind: 'model-choice',
      replay: { heldUp: [9, 9], falseWins: [2, 2], costUsd: [212, 131] },
    });
    expect(adopt(c)).toBe(true);
    expect(
      adopt({ ...c, replay: { heldUp: [9, 9], falseWins: [2, 2], costUsd: [212, 205] } }),
    ).toBe(false);
    expect(followUp({ heldUp: 4, falseWins: 0 }, { heldUp: 4, falseWins: 1 })).toBe('roll back');
    expect(followUp({ heldUp: 4, falseWins: 0 }, { heldUp: 5, falseWins: 0 })).toBe('keep');
  });
});

describe('current best', () => {
  const t1 = world.topics.find((t) => t.id === 'T-1')!;
  const t3 = world.topics.find((t) => t.id === 'T-3')!;

  it('replaces the best only with all four conditions, and keeps the old one', () => {
    expect(canReplaceBest(idea('I-12-40'), t1, true).ok).toBe(true);
    expect(canReplaceBest(idea('I-12-40'), t1, false).ok).toBe(false);
    expect(canReplaceBest(idea('I-12-42'), t1, true).ok).toBe(false);
    const next = replaceBest(t1, {
      rule: 'ATR + time',
      missionId: 'M-12',
      ideaId: 'I-12-40',
      gain: 2,
      when: 'now',
      date: '2026-11-27',
    });
    expect(currentBest(next).rule).toBe('ATR + time');
    expect(next.history.find((h) => h.rule === 'Fixed 20-pip stop')?.status).toBe('retired');
  });

  it('restores the previous best when the current one is withdrawn', () => {
    const t = replaceBest(t3, {
      rule: 'New',
      missionId: 'M-99',
      ideaId: 'I',
      gain: 1,
      when: 'a',
      date: '2026-11-20',
    });
    const r = restorePrevious(t, 'b', '2026-11-27', 'Withdrawn');
    expect(currentBest(r).rule).toBe('No gap rule');
    expect(r.history.some((h) => h.rule === 'New' && h.status === 'withdrawn')).toBe(true);
  });

  it('challenges old bests, skips topics with an open challenge, and waits for fresh data', () => {
    const due = dueChallenges(world.topics, '2026-11-27');
    const ids = due.map((d) => d.topicId);
    expect(ids).not.toContain('T-1');
    expect(ids).not.toContain('T-2');
    expect(ids).toContain('T-4');
    expect(due.find((d) => d.topicId === 'T-3')?.waitingForFresh).toBe(true);
  });
});

describe('plan and receipts', () => {
  it('runs about 30 ticks, with extra ticks for each option', () => {
    expect(planMission()).toHaveLength(29);
    expect(planMission({ panelRejects: true })).toHaveLength(33);
    expect(planMission({ budgetLimit: true })).toHaveLength(30);
    expect(planMission({ noWinner: true }).at(-3)?.k).toBe('close-no-winner');
  });

  it('every receipt has every field, in order', () => {
    const r = buildReceipt({ idea: idea('I-12-40') });
    expect(Object.keys(r)).toEqual([...RECEIPT_FIELDS]);
  });
});

describe('audit chain', () => {
  it('verifies, breaks at the tampered entry and repairs', async () => {
    const chain = await buildChain(seedAudit);
    expect(chain[0].prevHash).toBe(GENESIS);
    expect(await verifyChain(chain)).toEqual({ ok: true, count: seedAudit.length });
    const t = tamperEntry(chain, TAMPER_INDEX, TAMPER_FROM, TAMPER_TO)!;
    expect(t.tamper.changed).toBe('Verdict: I-12-14 promising');
    expect(await verifyChain(t.chain)).toEqual({ ok: false, count: seedAudit.length, brokenAt: 8 });
    expect((await verifyChain(repairEntry(t.chain, t.tamper))).ok).toBe(true);
  });
});
