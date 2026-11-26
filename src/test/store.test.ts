import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EXAMPLE_FRESH, EXAMPLE_STUDIED, TICK_MS } from '../data/constants';
import { flushAudit, resetSwarm, useSwarm, type AskInput } from '../store/useSwarm';

const ask = (over: Partial<AskInput> = {}) =>
  useSwarm.getState().submitQuestion({
    question: EXAMPLE_FRESH,
    role: 'Market regime analyst',
    maxCost: 1.5,
    period: 'Last 2 years',
    ...over,
  });

const job = (id: string) => useSwarm.getState().jobs.find((j) => j.id === id)!;
const ticks = (n: number) => vi.advanceTimersByTimeAsync(TICK_MS * n);
const settle = () => flushAudit();

beforeEach(async () => {
  vi.useFakeTimers();
  await resetSwarm();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('asking a question', () => {
  it('answers an already-studied question for free and creates no job', () => {
    const before = useSwarm.getState().jobs.length;
    const r = ask({ question: EXAMPLE_STUDIED });
    expect(r.kind).toBe('studied');
    if (r.kind === 'studied') expect(r.job.id).toBe('J-1039');
    expect(useSwarm.getState().jobs.length).toBe(before);
  });

  it('refuses a job above the free budget', () => {
    const before = useSwarm.getState().jobs.length;
    const r = ask({ maxCost: 50 });
    expect(r.kind).toBe('refused');
    expect(useSwarm.getState().jobs.length).toBe(before);
  });

  it('runs the Friday example to "waiting for a person" in 10 ticks (~23 s)', async () => {
    const r = ask();
    expect(r).toEqual({ kind: 'created', id: 'J-1048' });
    expect(job('J-1048').state).toBe('queued');
    await ticks(1);
    expect(job('J-1048').step).toBe(1);
    await ticks(1);
    expect(job('J-1048').step).toBe(2);
    expect(job('J-1048').agentId).toBeDefined();
    expect(job('J-1048').agentId).not.toBe('dana');
    await ticks(1);
    expect(job('J-1048').state).toBe('researching');
    expect(job('J-1048').heartbeat).toBe(true);
    await ticks(2);
    expect(job('J-1048').step).toBe(4);
    expect(job('J-1048').finding).toMatch(/Fridays/);
    await ticks(1);
    expect(job('J-1048').state).toBe('rechecking');
    expect(job('J-1048').reviewerId).toBe('dana');
    await ticks(2);
    expect(job('J-1048').agreement).toBe(93);
    await ticks(1);
    expect(job('J-1048').draft).toBeDefined();
    await ticks(1);
    const done = job('J-1048');
    expect(done.state).toBe('human');
    expect(done.step).toBe(8);
    expect(done.charged).toBe(true);
    expect(useSwarm.getState().toasts.at(-1)?.text).toMatch(/J-1048 agreed and is waiting for you/);
    expect(done.manifest['Signed with device key']).toMatch(/^ed25519:/);
    await settle();
    const actions = useSwarm
      .getState()
      .audit.filter((e) => e.jobId === 'J-1048')
      .map((e) => e.action);
    expect(actions).toContain('Receipt valid, lease current');
    expect(actions).toContain('Re-check result: agree (93%)');
  });

  it('shows a challenge, goes back to a new member, then agrees', async () => {
    ask({ challenge: true });
    await ticks(8);
    const c = job('J-1048');
    expect(c.state).toBe('challenged');
    expect(c.agreement).toBe(74);
    const firstAgent = c.agentId;
    await ticks(1);
    expect(job('J-1048').agentId).not.toBe(firstAgent);
    await ticks(20);
    expect(job('J-1048').state).toBe('human');
    expect(job('J-1048').agreement).toBe(95);
    await settle();
    const actions = useSwarm.getState().audit.map((e) => e.action);
    expect(actions).toContain('Re-check result: challenge (74%)');
  });

  it('simulates a dropped connection and reassigns', async () => {
    ask({ dropped: true });
    await ticks(4);
    const first = job('J-1048');
    const device = first.manifest.Device;
    await ticks(1);
    expect(job('J-1048').heartbeat).toBe(false);
    await ticks(1);
    expect(job('J-1048').agentId).not.toBe(first.agentId);
    expect(job('J-1048').generation).toBe(2);
    await settle();
    expect(useSwarm.getState().audit.map((e) => e.action)).toContain(
      `Lease expired on ${device}, late result refused`,
    );
    await ticks(20);
    expect(job('J-1048').state).toBe('human');
  });
});

describe('deciding', () => {
  it('approving publishes with all four facts filled', async () => {
    useSwarm.getState().approve('J-1043', 'checked the costs');
    const j = job('J-1043');
    expect(j.state).toBe('published');
    expect(j.step).toBe(9);
    expect(j.observedAt).toBeTruthy();
    expect(j.publishedAt).toBeTruthy();
    expect(j.expiresAt).toBeTruthy();
    expect(j.provenWrongIf).toBeTruthy();
    await settle();
    expect(useSwarm.getState().audit.at(-1)?.action).toMatch(
      /Approved and published.*checked the costs/,
    );
    expect(useSwarm.getState().toasts.at(-1)?.link?.label).toBe('See what viewers see');
  });

  it('rejecting moves the job to Done', () => {
    useSwarm.getState().reject('J-1042');
    expect(job('J-1042').state).toBe('rejected');
  });
});

describe('contributors', () => {
  it('a paused member gets no new jobs', async () => {
    for (const id of ['aroha', 'bjorn', 'chen', 'emeka']) useSwarm.getState().togglePause(id);
    ask();
    await ticks(2);
    expect(job('J-1048').agentId).toBe('gustavo');
    await settle();
    expect(useSwarm.getState().audit.map((e) => e.action)).toContain('Paused member Aroha K.');
  });
});

describe('audit chain demo', () => {
  it('breaks at entry 8 after a quiet change and is intact after undo', async () => {
    const st = useSwarm.getState();
    expect((await st.checkChain()).ok).toBe(true);
    st.tamperOld();
    const broken = await useSwarm.getState().checkChain();
    expect(broken).toEqual({ ok: false, count: 17, brokenAt: 8 });
    await useSwarm.getState().undoTamper();
    expect(useSwarm.getState().chainCheck).toEqual({ ok: true, count: 17 });
    expect(useSwarm.getState().tamper).toBeNull();
  });
});
