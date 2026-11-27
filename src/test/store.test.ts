import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_FRESH, EXAMPLE_RUNNING, TICK_MS } from '../data/constants';
import { lineageMembers } from '../domain/lineage';
import { currentBest } from '../domain/improvement';
import type { SimOptions } from '../domain/simulator';
import { ambientStep, flushAudit, resetSwarm, useSwarm } from '../store/useSwarm';

const launch = (options: SimOptions = {}, goal = EXAMPLE_FRESH) =>
  useSwarm.getState().launch({ goal, budget: 40, swarmSize: 'whole', options });
const world = () => useSwarm.getState().world;
const mission = (id: string) => world().missions.find((m) => m.id === id)!;
const ideasOf = (id: string) => mission(id).ideaIds.map((i) => world().ideas[i]);
const run = () => vi.advanceTimersByTimeAsync(TICK_MS * 40);

beforeEach(async () => {
  vi.useFakeTimers();
  await resetSwarm();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('launching', () => {
  it('stops a copy of a running mission and spends nothing', () => {
    const before = world().missions.length;
    const r = launch({}, EXAMPLE_RUNNING);
    expect(r.kind).toBe('running');
    if (r.kind === 'running') expect(r.mission.id).toBe('M-12');
    expect(world().missions.length).toBe(before);
  });

  it('refuses a budget above the free amount', () => {
    const r = useSwarm.getState().launch({ goal: EXAMPLE_FRESH, budget: 900, swarmSize: 'whole' });
    expect(r.kind).toBe('refused');
  });
});

describe('the full mission loop, with no clicks after launch', () => {
  it('runs the take-profit example from brief to learned', async () => {
    const r = launch();
    expect(r).toEqual({ kind: 'created', id: 'M-14' });
    await run();
    await flushAudit();
    const m = mission('M-14');
    expect(m.phase).toBe('learned');
    const ideas = ideasOf('M-14');
    expect(new Set(ideas.map((i) => i.proposedBy)).size).toBeGreaterThanOrEqual(8);
    expect(ideas.filter((i) => i.route === 'different-route').length).toBeGreaterThanOrEqual(3);
    expect(ideas.filter((i) => i.state === 'merged')).toHaveLength(3);
    expect(ideas.filter((i) => i.state === 'known-dead-end')).toHaveLength(1);
    expect(ideas.filter((i) => i.state === 'failed-fresh')).toHaveLength(1);
    expect(m.winnerIdeaIds.length).toBe(2);
    const objections = ideas.flatMap((i) => i.objections);
    expect(objections.some((o) => o.status === 'upheld')).toBe(true);
    expect(objections.some((o) => o.status === 'answered')).toBe(true);
    const council = world().councils['C-14-1'];
    expect(council.syntheses.some((x) => x.kind === 'cheaper-route')).toBe(true);
    // Approvers: nobody from the winners' lineage, their fresh checkers or the editor; 2+ providers.
    const panel = world().panels[m.approvalId!];
    expect(panel.outcome).toBe('published');
    const banned = new Set<string>(['dana']);
    for (const id of m.winnerIdeaIds) {
      for (const x of lineageMembers(id, world().ideas)) banned.add(x);
      banned.add(world().ideas[id].freshCheckedBy!);
    }
    for (const a of panel.approvers) expect(banned.has(a.memberId)).toBe(false);
    expect(new Set(panel.approvers.map((a) => a.provider)).size).toBeGreaterThanOrEqual(2);
    // Learning: library, current best, Challenger, Coach, self-start.
    const t4 = world().topics.find((t) => t.id === 'T-4')!;
    expect(currentBest(t4).missionId).toBe('M-14');
    expect(t4.openChallengeMissionId).toBeDefined();
    expect(mission(t4.openChallengeMissionId!).phase).toBe('queued');
    expect(m.coachReview?.proposals).toHaveLength(1);
    expect(world().missions.some((x) => x.createdBy === 'Swarm' && x.spawnedFromLibraryId)).toBe(
      true,
    );
    expect(world().library.some((e) => e.fromMissionId === 'M-14' && e.kind === 'proven')).toBe(
      true,
    );
    const actions = useSwarm.getState().audit.map((e) => e.action);
    expect(actions.some((a) => /published automatically/.test(a))).toBe(true);
    expect(actions.some((a) => /Challenger queued/.test(a))).toBe(true);
  });

  it('“Nothing beats the baseline” closes with no winner and adds dead ends', async () => {
    launch({ noWinner: true });
    await run();
    expect(mission('M-14').phase).toBe('closed-no-winner');
    expect(world().library.some((e) => e.fromMissionId === 'M-14' && e.kind === 'dead-end')).toBe(
      true,
    );
  });

  it('a dropped connection expires the lease and reassigns the test', async () => {
    launch({ dropped: true });
    await run();
    await flushAudit();
    expect(
      useSwarm
        .getState()
        .audit.some((e) => /Lease expired on .*late result refused/.test(e.action)),
    ).toBe(true);
    expect(mission('M-14').phase).toBe('learned');
  });

  it('“Panel rejects” sends it back, then a second panel publishes', async () => {
    launch({ panelRejects: true });
    await run();
    const m = mission('M-14');
    expect(world().panels['A-14'].outcome).toBe('sent-back');
    expect(world().panels['A-14b'].outcome).toBe('published');
    expect(m.phase).toBe('learned');
    expect(world().panels['A-14b'].approvers).toHaveLength(5);
  });

  it('hitting the budget limit cancels the queue and keeps going', async () => {
    launch({ budgetLimit: true });
    await run();
    expect(ideasOf('M-14').filter((i) => i.state === 'cancelled').length).toBeGreaterThan(0);
    expect(mission('M-14').spent).toBeLessThanOrEqual(mission('M-14').reserved);
    expect(mission('M-14').phase).toBe('learned');
  });
});

describe('owner controls', () => {
  it('the emergency stop halts work until it is released', async () => {
    launch();
    await vi.advanceTimersByTimeAsync(TICK_MS * 3);
    useSwarm.getState().emergencyStop();
    const phase = mission('M-14').phase;
    const at = ideasOf('M-14').length;
    await run();
    expect(mission('M-14').phase).toBe(phase);
    expect(ideasOf('M-14').length).toBe(at);
    expect(launch({}, 'Can we avoid breakout trades in the hour before US jobs data?').kind).toBe(
      'refused',
    );
    useSwarm.getState().releaseStop();
    await run();
    expect(mission('M-14').phase).toBe('learned');
  });

  it('a paused member gets no seats or work', async () => {
    useSwarm.getState().togglePause('lars');
    launch();
    await run();
    const ideas = ideasOf('M-14');
    expect(ideas.every((i) => i.proposedBy !== 'lars')).toBe(true);
    const panel = world().panels[mission('M-14').approvalId!];
    expect(panel.approvers.map((a) => a.memberId)).not.toContain('lars');
    for (const c of mission('M-14').councilIds)
      expect(world().councils[c].panel.map((p) => p.memberId)).not.toContain('lars');
  });
});

describe('ambient swarm and cooling-off', () => {
  it('the rule-change panel adopts v3, which only applies to missions started afterwards', async () => {
    const before = launch();
    expect(before.kind).toBe('created');
    for (let i = 0; i < 40; i++) ambientStep();
    const rules = world().rules;
    expect(rules.find((r) => r.version === 3)?.status).toBe('active');
    expect(rules.find((r) => r.version === 2)?.status).toBe('retired');
    expect(world().panels['P-07'].outcome).toBe('adopted');
    expect(world().roleVersions.find((r) => r.role === 'Red team' && r.version === 4)?.status).toBe(
      'active',
    );
    await run();
    expect(mission('M-14').approvalRuleVersion).toBe(2);
    expect(mission('M-11').phase === 'learned' || mission('M-11').phase === 'published').toBe(true);
  });
});
