import { create } from 'zustand';
import { TAMPER_FROM, TAMPER_INDEX, TAMPER_TO, seedAudit } from '../data/audit';
import { AMBIENT_MS, TICK_MS } from '../data/constants';
import { ambientVotes } from '../data/knowledge';
import { seedWorld, type Run } from '../data/seed';
import {
  appendEntry,
  buildChain,
  repairEntry,
  tamperEntry,
  verifyChain,
  type ChainCheck,
  type Tamper,
} from '../domain/auditChain';
import { admitMission } from '../domain/budget';
import { demoSeconds, demoTime, fmtClock } from '../domain/clock';
import { checkLibrary } from '../domain/library';
import type { AuditDraft, AuditEntry, Mission, MissionRules } from '../domain/types';
import {
  applyPanelVote,
  applyTick,
  createMission,
  type Clock,
  type Fx,
  type World,
} from '../domain/world';
import type { SimOptions } from '../domain/simulator';

export interface Toast {
  id: number;
  text: string;
  link?: { to: string; label: string };
  tone?: 'good' | 'warn' | 'bad' | 'info';
}

export type Theme = 'light' | 'dark' | null;

export interface LaunchInput {
  goal: string;
  budget: number;
  swarmSize: MissionRules['swarmSize'];
  rules?: Partial<MissionRules>;
  options?: SimOptions;
}

export type LaunchResult =
  | { kind: 'running'; mission: Mission }
  | { kind: 'refused'; reason: string; fix: string }
  | { kind: 'created'; id: string };

interface SwarmState {
  world: World;
  audit: AuditEntry[];
  auditReady: boolean;
  tamper: Tamper | null;
  chainCheck: ChainCheck | null;
  toasts: Toast[];
  theme: Theme;
  speed: number;
  tourStep: number | null;
  stopped: boolean;
  /** Missions this session is running on the timer (for the "live" badge). */
  live: string[];

  launch: (input: LaunchInput) => LaunchResult;
  togglePause: (memberId: string) => void;
  emergencyStop: () => void;
  releaseStop: () => void;
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
let auditQueue: Promise<void> = Promise.resolve();
let toastId = 1;

interface LiveRun extends Run {
  timer?: ReturnType<typeof setTimeout>;
}
/** Missions started in this session; they tick every TICK_MS / speed. */
const userRuns = new Map<string, LiveRun>();
/** Seeded missions the rest of the swarm carries on with, slowly. */
let ambientRuns: Record<string, Run> = {};
let ambientVoteAt = 0;
let ambientTurn = 0;
let ambientTimer: ReturnType<typeof setTimeout> | undefined;
let ambientEnabled = false;

export function clockNow(): Clock {
  const t = demoSeconds();
  return { time: demoTime(), stamp: `27 Nov, ${fmtClock(t, false)}`, date: '2026-11-27' };
}

function freshState() {
  const { world, runs } = seedWorld();
  ambientRuns = runs;
  ambientVoteAt = 0;
  ambientTurn = 0;
  return {
    world,
    audit: [] as AuditEntry[],
    auditReady: false,
    tamper: null as Tamper | null,
    chainCheck: null as ChainCheck | null,
    toasts: [] as Toast[],
    theme: null as Theme,
    speed: 1,
    tourStep: null as number | null,
    stopped: false,
    live: [] as string[],
  };
}

export const useSwarm = create<SwarmState>()((set, get) => {
  const writeAudit = (drafts: Omit<AuditDraft, 'time'>[]) => {
    if (!drafts.length) return auditQueue;
    const time = demoTime();
    auditQueue = auditQueue.then(async () => {
      for (const d of drafts) {
        const entry = await appendEntry(get().audit, { time, ...d });
        set({ audit: [...get().audit, entry] });
      }
      if (get().chainCheck) set({ chainCheck: await verifyChain(get().audit) });
    });
    return auditQueue;
  };

  const applyFx = (fx: Fx) => {
    writeAudit(fx.audit);
    for (const t of fx.toasts) get().pushToast(t);
  };

  const step = (id: string, run: Run) => {
    const tick = run.plan[run.at];
    if (!tick) return false;
    run.at += 1;
    const r = applyTick(get().world, id, run.script, tick, clockNow());
    set({ world: r.world });
    applyFx(r.fx);
    return run.at < run.plan.length;
  };

  const scheduleUser = (id: string) => {
    const run = userRuns.get(id);
    if (!run || get().stopped) return;
    run.timer = setTimeout(() => {
      const more = step(id, run);
      if (more) scheduleUser(id);
      else {
        userRuns.delete(id);
        set({ live: get().live.filter((x) => x !== id) });
      }
    }, TICK_MS / get().speed);
  };

  const stopTimers = () => {
    for (const r of userRuns.values()) if (r.timer) clearTimeout(r.timer);
    if (ambientTimer) clearTimeout(ambientTimer);
  };

  return {
    ...freshState(),

    launch: (input) => {
      const goal = input.goal.trim();
      const { world } = get();
      const lib = checkLibrary(goal, world.library, world.missions, world.topics);
      if (lib.running) return { kind: 'running', mission: lib.running };
      const a = admitMission(input.budget, world.missions, world.members);
      if (!a.ok) return { kind: 'refused', reason: a.reason, fix: a.fix };
      if (get().stopped)
        return {
          kind: 'refused',
          reason: 'The emergency stop is on, so no new work can start.',
          fix: 'Release the emergency stop at the bottom of the side bar.',
        };
      const c = createMission(world, { ...input, goal }, clockNow());
      set({ world: c.world, live: [...get().live, c.mission.id] });
      applyFx(c.fx);
      userRuns.set(c.mission.id, { script: c.script, plan: c.plan, at: 0 });
      scheduleUser(c.mission.id);
      return { kind: 'created', id: c.mission.id };
    },

    togglePause: (memberId) => {
      const w = get().world;
      const m = w.members.find((x) => x.id === memberId);
      if (!m) return;
      const online = !m.online;
      set({
        world: { ...w, members: w.members.map((x) => (x.id === memberId ? { ...x, online } : x)) },
      });
      writeAudit([{ who: 'You', action: `${online ? 'Resumed' : 'Paused'} member ${m.name}` }]);
      get().pushToast({
        text: online
          ? `${m.name} is back. Their agent can take seats and new work again.`
          : `${m.name} is paused. Their agent gets no new seats or work until resumed.`,
        tone: online ? 'good' : 'info',
      });
    },

    emergencyStop: () => {
      if (get().stopped) return;
      stopTimers();
      set({ stopped: true });
      writeAudit([
        { who: 'You (owner)', action: 'Emergency stop: all new work and publishing halted' },
      ]);
      get().pushToast({
        text: 'Emergency stop is on. No new work starts and nothing is published until you release it.',
        tone: 'bad',
      });
    },

    releaseStop: () => {
      if (!get().stopped) return;
      set({ stopped: false });
      writeAudit([{ who: 'You (owner)', action: 'Emergency stop released; work resumes' }]);
      for (const id of userRuns.keys()) scheduleUser(id);
      if (ambientEnabled) scheduleAmbientLoop();
      get().pushToast({
        text: 'Emergency stop released. The swarm carries on where it left off.',
        tone: 'good',
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
        text: `Entry ${TAMPER_INDEX} now says “${t.tamper.changed}”. Its fingerprint was not updated, the way a quiet edit would go. Now press Check the chain.`,
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

/** Start the rest of the swarm carrying on by itself (not in tests). */
export function startAmbient() {
  if (ambientEnabled) return;
  ambientEnabled = true;
  scheduleAmbientLoop();
}

function scheduleAmbientLoop() {
  if (ambientTimer) clearTimeout(ambientTimer);
  if (!ambientEnabled || useSwarm.getState().stopped) return;
  ambientTimer = setTimeout(
    () => {
      if (!ambientEnabled || useSwarm.getState().stopped) return;
      ambientStep();
      scheduleAmbientLoop();
    },
    AMBIENT_MS / Math.max(1, useSwarm.getState().speed / 2),
  );
}

/** One ambient beat; exported for tests. */
export function ambientStep() {
  const get = useSwarm.getState;
  const tasks: (() => void)[] = [];
  for (const [id, run] of Object.entries(ambientRuns)) {
    if (run.at < run.plan.length)
      tasks.push(() => {
        const tick = run.plan[run.at++];
        const r = applyTick(get().world, id, run.script, tick, clockNow());
        useSwarm.setState({ world: r.world });
        applyFxExternal(r.fx);
      });
  }
  if (ambientVoteAt < ambientVotes.length)
    tasks.push(() => {
      const v = ambientVotes[ambientVoteAt++];
      const r = applyPanelVote(
        get().world,
        v.panelId,
        { vote: v.vote, reason: v.reason },
        clockNow(),
      );
      useSwarm.setState({ world: r.world });
      applyFxExternal(r.fx);
    });
  if (tasks.length) tasks[ambientTurn++ % tasks.length]();
}

function applyFxExternal(fx: Fx) {
  const st = useSwarm.getState();
  if (fx.audit.length) {
    const time = demoTime();
    auditQueue = auditQueue.then(async () => {
      for (const d of fx.audit) {
        const entry = await appendEntry(useSwarm.getState().audit, { time, ...d });
        useSwarm.setState({ audit: [...useSwarm.getState().audit, entry] });
      }
      if (useSwarm.getState().chainCheck)
        useSwarm.setState({ chainCheck: await verifyChain(useSwarm.getState().audit) });
    });
  }
  for (const t of fx.toasts) st.pushToast(t);
}

/** Reset everything to the seed (used by tests). */
export async function resetSwarm() {
  for (const r of userRuns.values()) if (r.timer) clearTimeout(r.timer);
  userRuns.clear();
  ambientEnabled = false;
  if (ambientTimer) clearTimeout(ambientTimer);
  await auditQueue;
  useSwarm.setState(freshState());
  await initAudit();
}

export function flushAudit() {
  return auditQueue;
}

export function isLive(id: string) {
  return userRuns.has(id);
}

initAudit();
