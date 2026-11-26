import { create } from 'zustand';
import { answerFor, type CannedAnswer } from '../data/answers';
import { TAMPER_FROM, TAMPER_INDEX, TAMPER_TO, seedAudit } from '../data/audit';
import { EDITOR_NAME, RECHECKER_ID, TICK_MS } from '../data/constants';
import { FIRST_NEW_JOB_NUMBER, seedJobs } from '../data/jobs';
import { seedMembers } from '../data/members';
import { admit, eligibleMembers, money } from '../domain/budget';
import {
  appendEntry,
  buildChain,
  repairEntry,
  tamperEntry,
  verifyChain,
  type ChainCheck,
  type Tamper,
} from '../domain/auditChain';
import { demoSeconds, demoTime, fmtClock } from '../domain/clock';
import { findStudied } from '../domain/dedupe';
import { buildManifest } from '../domain/manifest';
import { planTicks, type PlanOptions, type Tick } from '../domain/simulator';
import type { AuditDraft, AuditEntry, Job, Member } from '../domain/types';

export interface Toast {
  id: number;
  text: string;
  link?: { to: string; label: string };
  tone?: 'good' | 'warn' | 'bad' | 'info';
}

export type Theme = 'light' | 'dark' | null;

export interface AskInput {
  question: string;
  role: string;
  maxCost: number;
  period: string;
  challenge?: boolean;
  dropped?: boolean;
}

export type AskResult =
  | { kind: 'studied'; job: Job }
  | { kind: 'refused'; reason: string; fix: string }
  | { kind: 'created'; id: string };

interface SwarmState {
  members: Member[];
  jobs: Job[];
  audit: AuditEntry[];
  auditReady: boolean;
  tamper: Tamper | null;
  chainCheck: ChainCheck | null;
  toasts: Toast[];
  theme: Theme;
  /** 1 = normal speed. The tour can run the simulation faster. */
  speed: number;
  tourStep: number | null;
  nextJobNumber: number;

  submitQuestion: (input: AskInput) => AskResult;
  approve: (id: string, note?: string) => void;
  reject: (id: string, note?: string) => void;
  togglePause: (memberId: string) => void;
  checkChain: () => Promise<ChainCheck>;
  tamperOld: () => void;
  undoTamper: () => Promise<void>;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
  setTheme: (t: Theme) => void;
  setSpeed: (s: number) => void;
  setTourStep: (n: number | null) => void;
}

// ---------------------------------------------------------------------------
// Audit writes are async (real SHA-256), so they run one after another in a queue.
let auditQueue: Promise<void> = Promise.resolve();
let toastId = 1;

interface SimRun {
  plan: Tick[];
  at: number;
  timer?: ReturnType<typeof setTimeout>;
  answer: CannedAnswer;
  pastAgents: string[];
}
const runs = new Map<string, SimRun>();

const name = (members: Member[], id?: string) => members.find((m) => m.id === id)?.name ?? '—';
const aiOf = (members: Member[], id?: string) => `${name(members, id)}’s AI`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const dayStamp = (extraDays = 0) => {
  const day = 26 + extraDays;
  const label = day > 30 ? `${day - 30} Dec` : `${day} Nov`;
  return `${label}, ${fmtClock(demoSeconds(), false)}`;
};

function freshState() {
  return {
    members: seedMembers.map((m) => ({ ...m, roles: [...m.roles] })),
    jobs: seedJobs(),
    audit: [] as AuditEntry[],
    auditReady: false,
    tamper: null as Tamper | null,
    chainCheck: null as ChainCheck | null,
    toasts: [] as Toast[],
    theme: null as Theme,
    speed: 1,
    tourStep: null as number | null,
    nextJobNumber: FIRST_NEW_JOB_NUMBER,
  };
}

export const useSwarm = create<SwarmState>()((set, get) => {
  const writeAudit = (...drafts: Omit<AuditDraft, 'time'>[]) => {
    const time = demoTime();
    auditQueue = auditQueue.then(async () => {
      for (const d of drafts) {
        const entry = await appendEntry(get().audit, { time, ...d });
        set({ audit: [...get().audit, entry] });
      }
      // Keep a shown check result honest as new entries arrive.
      if (get().chainCheck) set({ chainCheck: await verifyChain(get().audit) });
    });
    return auditQueue;
  };

  const patchJob = (id: string, fn: (j: Job) => Partial<Job>) =>
    set({ jobs: get().jobs.map((j) => (j.id === id ? { ...j, ...fn(j) } : j)) });

  const addHistory = (id: string, text: string, who: string) =>
    patchJob(id, (j) => ({ history: [...j.history, { time: demoTime(), text, who }] }));

  const pickMember = (job: Job, exclude: string[]): Member | undefined => {
    const pool = eligibleMembers(get().members, 0, [RECHECKER_ID, ...exclude]);
    const withRoom = pool.filter((m) => m.spentToday + job.reserved <= m.dailyCap);
    const list = withRoom.length ? withRoom : pool;
    return list[Math.floor(Math.random() * list.length)];
  };

  const assignTo = (job: Job, member: Member, run: SimRun) => {
    run.pastAgents.push(member.id);
    patchJob(job.id, (j) => ({
      agentId: member.id,
      generation: (j.generation ?? 0) + 1,
      manifest: buildManifest({
        jobId: j.id,
        role: j.role,
        member,
        started: demoTime(),
      }),
    }));
  };

  const applyTick = (jobId: string, tick: Tick, run: SimRun) => {
    const job = get().jobs.find((j) => j.id === jobId);
    if (!job) return;
    const { members } = get();
    switch (tick.kind) {
      case 'check':
        patchJob(jobId, () => ({ step: 1 }));
        addHistory(jobId, 'Checked: not studied before, within budget', 'Platform');
        writeAudit({
          who: 'Platform',
          action: 'Checked: not studied before, within budget',
          jobId,
        });
        break;
      case 'assign': {
        const m = pickMember(job, run.pastAgents);
        if (!m) {
          addHistory(jobId, 'No member is free right now. Waiting for one.', 'Platform');
          stopRun(jobId);
          return;
        }
        assignTo(job, m, run);
        if (tick.pass === 1) {
          patchJob(jobId, () => ({ step: 2 }));
          addHistory(
            jobId,
            `${money(job.reserved)} set aside, assigned to ${m.name}’s AI`,
            'Platform',
          );
          writeAudit({
            who: 'Platform',
            action: `${money(job.reserved)} set aside, 60 s lease to ${m.device}`,
            jobId,
          });
        } else {
          patchJob(jobId, () => ({
            step: 2,
            agreement: undefined,
            recheck: undefined,
            recheckTable: undefined,
          }));
          addHistory(jobId, `Sent back for another try, assigned to ${m.name}’s AI`, 'Platform');
          writeAudit({
            who: 'Platform',
            action: `Sent back for another try, 60 s lease to ${m.device}`,
            jobId,
          });
        }
        break;
      }
      case 'research':
        patchJob(jobId, () => ({ step: 3, state: 'researching', heartbeat: true }));
        addHistory(jobId, 'Researching, checking in every 15 s', aiOf(members, job.agentId));
        break;
      case 'spend':
        patchJob(jobId, (j) => ({ spent: round2((j.reserved * tick.pct) / 100) }));
        break;
      case 'handIn': {
        const member = members.find((m) => m.id === job.agentId);
        const spent = round2((job.reserved * tick.pct) / 100);
        patchJob(jobId, (j) => ({
          step: 4,
          spent,
          heartbeat: false,
          finding: run.answer.finding,
          resultTable: run.answer.resultTable,
          observedAt: dayStamp(),
          provenWrongIf: run.answer.provenWrongIf,
          manifest: buildManifest({
            jobId,
            role: j.role,
            member,
            started: j.manifest.Started,
            finished: demoTime(),
            tokens: Math.round(spent * 52000 + 3100),
            cost: spent,
            toolCalls: Math.round(spent * 28 + 4),
          }),
        }));
        addHistory(jobId, 'Handed in with signed run receipt', aiOf(members, job.agentId));
        writeAudit(
          {
            who: aiOf(members, job.agentId),
            action: 'Handed in finding with signed run receipt',
            jobId,
          },
          { who: 'Platform', action: 'Receipt valid, lease current', jobId },
        );
        break;
      }
      case 'recheck':
        patchJob(jobId, () => ({ step: 5, state: 'rechecking', reviewerId: RECHECKER_ID }));
        addHistory(jobId, `Re-check started by ${aiOf(members, RECHECKER_ID)}`, 'Platform');
        writeAudit({
          who: 'Platform',
          action: `Re-check task given to ${aiOf(members, RECHECKER_ID)}`,
          jobId,
        });
        break;
      case 'agree':
        patchJob(jobId, () => ({
          step: 6,
          agreement: tick.agreement,
          recheck: run.answer.recheck,
          recheckTable: run.answer.recheckTable,
        }));
        addHistory(jobId, `Agreed: answers ${tick.agreement}% alike`, aiOf(members, RECHECKER_ID));
        writeAudit({
          who: aiOf(members, RECHECKER_ID),
          action: `Re-check result: agree (${tick.agreement}%)`,
          jobId,
        });
        break;
      case 'challenge':
        patchJob(jobId, () => ({
          step: 2,
          state: 'challenged',
          agreement: tick.agreement,
          recheck: run.answer.challengeRecheck,
          recheckTable: undefined,
        }));
        addHistory(
          jobId,
          `Challenged: answers only ${tick.agreement}% alike. Going back for another try`,
          aiOf(members, RECHECKER_ID),
        );
        writeAudit({
          who: aiOf(members, RECHECKER_ID),
          action: `Re-check result: challenge (${tick.agreement}%)`,
          jobId,
        });
        break;
      case 'drop':
        patchJob(jobId, () => ({ heartbeat: false }));
        addHistory(jobId, `Stopped checking in. ${job.manifest.Device} has gone quiet`, 'Platform');
        break;
      case 'expire': {
        const old = members.find((m) => m.id === job.agentId);
        const device = old?.device ?? 'device';
        addHistory(jobId, `Lease expired on ${device}, late result refused`, 'Platform');
        const m = pickMember(job, run.pastAgents);
        if (!m) {
          writeAudit({
            who: 'Platform',
            action: `Lease expired on ${device}, late result refused`,
            jobId,
          });
          patchJob(jobId, () => ({ state: 'queued', step: 2 }));
          stopRun(jobId);
          return;
        }
        assignTo(job, m, run);
        patchJob(jobId, () => ({ step: 2 }));
        addHistory(jobId, `Reassigned to ${m.name}’s AI`, 'Platform');
        writeAudit(
          { who: 'Platform', action: `Lease expired on ${device}, late result refused`, jobId },
          { who: 'Platform', action: `Reassigned, 60 s lease to ${m.device}`, jobId },
        );
        break;
      }
      case 'draft':
        patchJob(jobId, () => ({ step: 7, draft: run.answer.draft }));
        addHistory(jobId, 'Draft written by editor AI', EDITOR_NAME);
        writeAudit({ who: EDITOR_NAME, action: 'Draft written, waiting for a person', jobId });
        break;
      case 'human': {
        const fresh = get().jobs.find((j) => j.id === jobId)!;
        const agentShare = round2(fresh.spent * 0.7);
        const reviewShare = round2(fresh.spent - agentShare);
        set({
          members: get().members.map((m) =>
            m.id === fresh.agentId
              ? { ...m, spentToday: round2(m.spentToday + agentShare) }
              : m.id === fresh.reviewerId
                ? { ...m, spentToday: round2(m.spentToday + reviewShare) }
                : m,
          ),
        });
        patchJob(jobId, () => ({ step: 8, state: 'human', charged: true, heartbeat: false }));
        addHistory(jobId, 'Waiting for a person', 'Platform');
        get().pushToast({
          text: `${jobId} agreed and is waiting for you.`,
          link: { to: '/review', label: 'Open the review desk' },
          tone: 'warn',
        });
        break;
      }
    }
  };

  const stopRun = (jobId: string) => {
    const r = runs.get(jobId);
    if (r?.timer) clearTimeout(r.timer);
    runs.delete(jobId);
  };

  const scheduleNext = (jobId: string) => {
    const run = runs.get(jobId);
    if (!run) return;
    run.timer = setTimeout(() => {
      const tick = run.plan[run.at];
      run.at += 1;
      applyTick(jobId, tick, run);
      if (run.at < run.plan.length && runs.has(jobId)) scheduleNext(jobId);
      else runs.delete(jobId);
    }, TICK_MS / get().speed);
  };

  const startSimulation = (jobId: string, answer: CannedAnswer, opts: PlanOptions) => {
    runs.set(jobId, { plan: planTicks(opts), at: 0, answer, pastAgents: [] });
    scheduleNext(jobId);
  };

  return {
    ...freshState(),

    submitQuestion: (input) => {
      const question = input.question.trim();
      const { jobs, members } = get();
      const studied = findStudied(question, jobs);
      if (studied) return { kind: 'studied', job: studied };
      const a = admit(input.maxCost, jobs, members);
      if (!a.ok) return { kind: 'refused', reason: a.reason, fix: a.fix };

      const id = `J-${get().nextJobNumber}`;
      const job: Job = {
        id,
        question,
        role: input.role,
        state: 'queued',
        step: 0,
        reserved: round2(input.maxCost),
        spent: 0,
        period: input.period,
        isUserCreated: true,
        askedBy: 'You',
        history: [{ time: demoTime(), text: 'Asked', who: 'You' }],
        manifest: buildManifest({ jobId: id, role: input.role }),
      };
      set({ jobs: [job, ...jobs], nextJobNumber: get().nextJobNumber + 1 });
      writeAudit({ who: 'You', action: `Asked: “${question}”`, jobId: id });
      startSimulation(id, answerFor(question, input.role, input.period), {
        challenge: input.challenge,
        dropped: input.dropped,
      });
      return { kind: 'created', id };
    },

    approve: (id, note) => {
      const job = get().jobs.find((j) => j.id === id);
      if (!job || job.state !== 'human') return;
      patchJob(id, (j) => ({
        state: 'published',
        step: 9,
        publishedAt: dayStamp(),
        expiresAt: dayStamp(7),
        observedAt: j.observedAt ?? dayStamp(),
        provenWrongIf:
          j.provenWrongIf ?? 'A fresh run on next month’s data gives a different answer.',
      }));
      addHistory(
        id,
        note ? `Approved and published. Note: ${note}` : 'Approved and published',
        'You',
      );
      writeAudit({
        who: 'You',
        action: note ? `Approved and published. Note: “${note}”` : 'Approved and published',
        jobId: id,
      });
      get().pushToast({
        text: `${id} is now published.`,
        link: { to: '/published', label: 'See what viewers see' },
        tone: 'good',
      });
    },

    reject: (id, note) => {
      const job = get().jobs.find((j) => j.id === id);
      if (!job || job.state !== 'human') return;
      patchJob(id, () => ({ state: 'rejected' }));
      addHistory(id, note ? `Rejected. Note: ${note}` : 'Rejected', 'You');
      writeAudit({
        who: 'You',
        action: note ? `Rejected. Note: “${note}”` : 'Rejected',
        jobId: id,
      });
      get().pushToast({
        text: `${id} was rejected. It stays on the board under Done, and nothing was published.`,
        link: { to: `/jobs/${id}`, label: 'See the job' },
        tone: 'bad',
      });
    },

    togglePause: (memberId) => {
      const m = get().members.find((x) => x.id === memberId);
      if (!m) return;
      const online = !m.online;
      set({ members: get().members.map((x) => (x.id === memberId ? { ...x, online } : x)) });
      writeAudit({ who: 'You', action: `${online ? 'Resumed' : 'Paused'} member ${m.name}` });
      get().pushToast({
        text: online
          ? `${m.name} is back. Their AI can be given new jobs again.`
          : `${m.name} is paused. Their AI gets no new jobs until you resume it.`,
        tone: online ? 'good' : 'info',
      });
    },

    checkChain: async () => {
      await auditQueue;
      const result = await verifyChain(get().audit);
      set({ chainCheck: result });
      return result;
    },

    tamperOld: () => {
      const t = tamperEntry(get().audit, TAMPER_INDEX, TAMPER_FROM, TAMPER_TO);
      if (!t) return;
      set({ audit: t.chain, tamper: t.tamper, chainCheck: null });
      get().pushToast({
        text: `Entry ${TAMPER_INDEX} now says “${TAMPER_TO}” instead of “${TAMPER_FROM}”. Its fingerprint was not updated, the way a quiet edit would go. Now press Check the chain.`,
        tone: 'warn',
      });
    },

    undoTamper: async () => {
      const t = get().tamper;
      if (!t) return;
      set({ audit: repairEntry(get().audit, t), tamper: null });
      await get().checkChain();
    },

    pushToast: (t) => set({ toasts: [...get().toasts, { ...t, id: toastId++ }].slice(-4) }),
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    setTheme: (theme) => set({ theme }),
    setSpeed: (speed) => set({ speed }),
    setTourStep: (tourStep) => set({ tourStep }),
  };
});

/** Build the seed audit chain (async because hashing is async). */
export function initAudit() {
  auditQueue = auditQueue.then(async () => {
    const chain = await buildChain(seedAudit);
    useSwarm.setState({ audit: chain, auditReady: true });
  });
  return auditQueue;
}

/** Reset everything to the seed (used by tests). */
export async function resetSwarm() {
  for (const id of [...runs.keys()]) {
    const r = runs.get(id);
    if (r?.timer) clearTimeout(r.timer);
    runs.delete(id);
  }
  await auditQueue;
  useSwarm.setState(freshState());
  await initAudit();
}

/** Wait until every queued audit write has finished (used by tests). */
export function flushAudit() {
  return auditQueue;
}

export function isSimulating(jobId: string) {
  return runs.has(jobId);
}

initAudit();
