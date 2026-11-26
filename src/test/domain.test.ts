import { describe, expect, it } from 'vitest';
import { admit, eligibleMembers, summariseBudget } from '../domain/budget';
import { findStudied, normaliseQuestion } from '../domain/dedupe';
import { isAgreed, verdict } from '../domain/agreement';
import {
  GENESIS,
  appendEntry,
  buildChain,
  repairEntry,
  tamperEntry,
  verifyChain,
} from '../domain/auditChain';
import { MANIFEST_FIELDS, buildManifest } from '../domain/manifest';
import { planTicks } from '../domain/simulator';
import { seedJobs } from '../data/jobs';
import { seedMembers } from '../data/members';
import { TAMPER_FROM, TAMPER_INDEX, TAMPER_TO, seedAudit } from '../data/audit';
import { EXAMPLE_FRESH, EXAMPLE_STUDIED } from '../data/constants';
import { makePrices } from '../data/prices';

describe('budget', () => {
  const jobs = seedJobs();
  const members = seedMembers;

  it('adds up spent, set aside and free to the daily limit', () => {
    const b = summariseBudget(jobs, members);
    expect(b.cap).toBe(25);
    expect(b.spent + b.setAside + b.free).toBeCloseTo(25, 2);
    expect(b.setAside).toBeGreaterThan(0);
  });

  it('admits a normal job', () => {
    expect(admit(1.5, jobs, members)).toEqual({ ok: true });
  });

  it('refuses a job above the free budget with a reason and a fix', () => {
    const r = admit(20, jobs, members);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.reason).toMatch(/only \$\d+\.\d\d of today's \$25 limit is free/);
      expect(r.fix).toMatch(/Lower the most it may cost/);
    }
  });

  it('refuses zero or negative amounts', () => {
    expect(admit(0, jobs, members).ok).toBe(false);
    expect(admit(-1, jobs, members).ok).toBe(false);
  });

  it('only offers work to online members with room under their own limit', () => {
    const ids = eligibleMembers(members, 1.5).map((m) => m.id);
    expect(ids).not.toContain('freya');
    expect(ids).not.toContain('hana');
    expect(ids).toContain('aroha');
    // Chen has spent $3.15, so a $2 job would pass the $5 member limit
    expect(eligibleMembers(members, 2).map((m) => m.id)).not.toContain('chen');
  });

  it('refuses when no member has room', () => {
    const r = admit(4.9, jobs, members);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/No online member/);
  });
});

describe('already studied?', () => {
  const jobs = seedJobs();
  it('matches published questions regardless of case and spacing', () => {
    expect(findStudied(EXAMPLE_STUDIED, jobs)?.id).toBe('J-1039');
    expect(findStudied('  how did eurusd react to the LAST ecb rate statement ', jobs)?.id).toBe(
      'J-1039',
    );
  });
  it('matches jobs waiting for a person', () => {
    expect(
      findStudied('Which stop-loss distance works best for 15-minute EURUSD trades?', jobs)?.id,
    ).toBe('J-1043');
  });
  it('does not match fresh, withdrawn or running questions', () => {
    expect(findStudied(EXAMPLE_FRESH, jobs)).toBeUndefined();
    expect(
      findStudied('Is the Monday-morning gap in EURUSD usually filled by Tuesday?', jobs),
    ).toBeUndefined();
    expect(
      findStudied('Does the London open move EURUSD more than the New York open?', jobs),
    ).toBeUndefined();
    expect(findStudied('   ', jobs)).toBeUndefined();
  });
  it('normalises', () => {
    expect(normaliseQuestion('  A  b?? ')).toBe('a b');
  });
});

describe('agreement rule', () => {
  it('agrees at the 90% bar and above', () => {
    expect(isAgreed(90)).toBe(true);
    expect(isAgreed(96)).toBe(true);
    expect(isAgreed(89)).toBe(false);
    expect(verdict(74)).toBe('challenged');
    expect(verdict(undefined)).toBe('running');
  });
});

describe('audit chain', () => {
  it('links each entry to the one before', async () => {
    const chain = await buildChain(seedAudit);
    expect(chain).toHaveLength(17);
    expect(chain[0].prevHash).toBe(GENESIS);
    expect(chain[0].index).toBe(1);
    for (let i = 1; i < chain.length; i++) expect(chain[i].prevHash).toBe(chain[i - 1].hash);
    expect(chain[0].hash).toMatch(/^[0-9a-f]{64}$/);
    expect(await verifyChain(chain)).toEqual({ ok: true, count: 17 });
  });

  it('appends without changing the chain', async () => {
    const chain = await buildChain(seedAudit);
    const next = await appendEntry(chain, { time: '14:30:00', who: 'You', action: 'Test' });
    expect(next.index).toBe(18);
    expect(next.prevHash).toBe(chain[16].hash);
    expect(chain).toHaveLength(17);
    expect(await verifyChain([...chain, next])).toEqual({ ok: true, count: 18 });
  });

  it('detects a quiet change at entry 8 and repairs it', async () => {
    const chain = await buildChain(seedAudit);
    const t = tamperEntry(chain, TAMPER_INDEX, TAMPER_FROM, TAMPER_TO);
    expect(t).not.toBeNull();
    expect(t!.chain[7].action).toContain('agree (99%)');
    expect(t!.chain[7].hash).toBe(chain[7].hash); // fingerprint NOT recomputed
    expect(await verifyChain(t!.chain)).toEqual({ ok: false, count: 17, brokenAt: 8 });
    const fixed = repairEntry(t!.chain, t!.tamper);
    expect(await verifyChain(fixed)).toEqual({ ok: true, count: 17 });
  });

  it('refuses to tamper when the text is not there', async () => {
    const chain = await buildChain(seedAudit);
    expect(tamperEntry(chain, 1, 'nope', 'x')).toBeNull();
  });
});

describe('run receipt', () => {
  it('has every field in order', () => {
    const r = buildManifest({ jobId: 'J-1', role: 'Short-term analyst', member: seedMembers[0] });
    expect(Object.keys(r)).toEqual([...MANIFEST_FIELDS]);
    expect(r.Device).toBe('DESK-7F2A');
    expect(r['AI provider and model']).toBe('Anthropic · Claude Sonnet 5.5');
    expect(r['Signed with device key']).toMatch(/^ed25519:[0-9a-f]{24}$/);
  });
  it('shows waiting fields before a member is assigned', () => {
    const r = buildManifest({ jobId: 'J-1', role: 'Editor' });
    expect(r['Signed with device key']).toBe('Not signed yet');
  });
});

describe('simulator tick plan', () => {
  it('runs the normal 10 ticks and stops waiting for a person', () => {
    const p = planTicks();
    expect(p).toHaveLength(10);
    expect(p.map((t) => t.kind)).toEqual([
      'check',
      'assign',
      'research',
      'spend',
      'handIn',
      'recheck',
      'spend',
      'agree',
      'draft',
      'human',
    ]);
    expect(p[7]).toEqual({ kind: 'agree', agreement: 93 });
  });

  it('shows a challenge, goes back to a new member, then agrees', () => {
    const p = planTicks({ challenge: true });
    const kinds = p.map((t) => t.kind);
    const c = kinds.indexOf('challenge');
    expect(p[c]).toEqual({ kind: 'challenge', agreement: 74 });
    expect(p[c + 1]).toEqual({ kind: 'assign', pass: 2 });
    expect(p.find((t) => t.kind === 'agree')).toEqual({ kind: 'agree', agreement: 95 });
    expect(kinds[kinds.length - 1]).toBe('human');
  });

  it('simulates a dropped connection after tick 4', () => {
    const p = planTicks({ dropped: true });
    expect(p[4].kind).toBe('drop');
    expect(p[5].kind).toBe('expire');
    expect(p.at(-1)!.kind).toBe('human');
  });

  it('never spends more than the amount set aside', () => {
    for (const opts of [{}, { challenge: true }, { dropped: true, challenge: true }]) {
      for (const t of planTicks(opts)) {
        if (t.kind === 'spend' || t.kind === 'handIn') expect(t.pct).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('prices', () => {
  it('is the same every load and centred on 1.0512', () => {
    const a = makePrices();
    const b = makePrices();
    expect(a).toEqual(b);
    expect(a).toHaveLength(96);
    const mean = a.reduce((s, x) => s + x, 0) / a.length;
    expect(mean).toBeCloseTo(1.0512, 3);
  });
});
