import { DEFAULT_RULES, MAX_CONCURRENT } from '../data/constants';
import { poolFor } from '../data/pools';
import {
  decidePublish,
  decideRuleChange,
  excludedForPublish,
  seatApprovalPanel,
  tally,
} from './approval';
import { chargeMembers } from './budget';
import { review } from './coach';
import { judgesFor, redTeamFor, seatCouncil } from './council';
import { matchDeadEnds, mergeDuplicates } from './dedupe';
import { trialsOf } from './funnel';
import { heldUp, verdictFor } from './gates';
import { canReplaceBest, currentBest, replaceBest } from './improvement';
import { checkLibrary } from './library';
import { lineageMembers } from './lineage';
import { buildReceipt, specHashFor } from './manifest';
import {
  planMission,
  scriptMission,
  tickPhase,
  tickSpend,
  type MissionScript,
  type ScriptIdea,
  type SimOptions,
  type Tick,
} from './simulator';
import { credit } from './trackRecord';
import type {
  ApprovalPanel,
  ApprovalRule,
  Approver,
  AuditDraft,
  CouncilSession,
  Idea,
  LibraryEntry,
  Member,
  Mission,
  MissionRules,
  Objection,
  ProcessChange,
  RoleVersion,
  Topic,
} from './types';

export interface World {
  missions: Mission[];
  ideas: Record<string, Idea>;
  councils: Record<string, CouncilSession>;
  panels: Record<string, ApprovalPanel>;
  members: Member[];
  library: LibraryEntry[];
  topics: Topic[];
  changes: ProcessChange[];
  rules: ApprovalRule[];
  roleVersions: RoleVersion[];
  seq: { mission: number; library: number; change: number };
}

export interface Clock {
  time: string;
  stamp: string;
  date: string;
}

export interface ToastDraft {
  text: string;
  link?: { to: string; label: string };
  tone?: 'good' | 'warn' | 'bad' | 'info';
}

export interface Fx {
  audit: Omit<AuditDraft, 'time'>[];
  toasts: ToastDraft[];
}

/** Jobs the rest of the swarm is running, so a new mission sees a real queue. */
export const OTHER_JOBS = 14;
export const SLOTS = MAX_CONCURRENT - OTHER_JOBS;
export const EDITOR_ROLE = 'Editor';

const r2 = (n: number) => Math.round(n * 100) / 100;
const pad = (n: number) => String(n).padStart(2, '0');
export const missionNumber = (id: string) => Number(id.replace(/\D/g, ''));
export const activeRule = (w: World) => w.rules.find((r) => r.status === 'active')!;
export const memberName = (w: World, id?: string) =>
  w.members.find((m) => m.id === id)?.name ?? '—';
export const agentOf = (w: World, id?: string) => `${memberName(w, id)}’s agent`;

/** Idea ids follow the script order: round 1, then alternatives, then follow-ups. */
export function refToId(s: MissionScript, ref: string): string {
  const all = [...s.round1, ...s.alternatives, ...s.followups];
  if (ref.startsWith('d') || ref.startsWith('o') || ref.startsWith('p')) {
    const i = s.round1.findIndex((x) => x.ref === ref);
    if (i >= 0) return `I-${s.missionNumber}-${pad(i + 1)}`;
  }
  const i = all.findIndex((x) => x.ref === ref);
  return `I-${s.missionNumber}-${pad(i + 1)}`;
}

export interface NewMissionInput {
  goal: string;
  budget: number;
  swarmSize: MissionRules['swarmSize'];
  rules?: Partial<MissionRules>;
  options?: SimOptions;
  createdBy?: string;
}

/** Create a mission and its script. The first tick of `planMission` starts it. */
export function createMission(
  w: World,
  input: NewMissionInput,
  clk: Clock,
): { world: World; mission: Mission; script: MissionScript; plan: Tick[]; fx: Fx } {
  const num = w.seq.mission;
  const id = `M-${num}`;
  const lib = checkLibrary(input.goal, w.library, w.missions, w.topics);
  const topic = lib.topic;
  const best = topic ? currentBest(topic) : undefined;
  const rules: MissionRules = {
    ...DEFAULT_RULES,
    ...input.rules,
    budget: input.budget,
    swarmSize: input.swarmSize,
    baseline: best ? best.rule : 'The strategy as it trades today',
  };
  const mission: Mission = {
    id,
    title: input.goal.replace(/\?$/, ''),
    goal: input.goal,
    createdBy: input.createdBy ?? 'You',
    kind: topic ? 'challenge' : 'open',
    topicId: topic?.id,
    challengesBest: best?.rule,
    phase: 'brief',
    round: 1,
    rules,
    reserved: r2(input.budget),
    spent: 0,
    ideaIds: [],
    councilIds: [],
    libraryHits: [],
    trialsRun: 0,
    winnerIdeaIds: [],
    history: [{ time: clk.time, text: 'Mission started', who: input.createdBy ?? 'You' }],
    isUserCreated: (input.createdBy ?? 'You') === 'You',
    startRuleVersion: activeRule(w).version,
    spendByPhase: { explore: 0, test: 0, council: 0, fresh: 0, approval: 0 },
  };
  const script = scriptMission(num, poolFor(topic?.id), w.members, input.swarmSize, input.options);
  return {
    world: { ...w, missions: [mission, ...w.missions], seq: { ...w.seq, mission: num + 1 } },
    mission,
    script,
    plan: planMission(input.options),
    fx: {
      audit: [
        {
          who: input.createdBy ?? 'You',
          action: `Mission started: “${input.goal}”`,
          missionId: id,
        },
      ],
      toasts: [],
    },
  };
}

/* ------------------------------------------------------------------------ */

/** Apply one tick of a mission's plan. Pure: returns a new world and its effects. */
export function applyTick(
  world: World,
  missionId: string,
  s: MissionScript,
  tick: Tick,
  clk: Clock,
): { world: World; fx: Fx } {
  const w: World = {
    ...world,
    missions: [...world.missions],
    ideas: { ...world.ideas },
    councils: { ...world.councils },
    panels: { ...world.panels },
    library: [...world.library],
    topics: [...world.topics],
    changes: [...world.changes],
    seq: { ...world.seq },
  };
  const fx: Fx = { audit: [], toasts: [] };
  if (!w.missions.some((m) => m.id === missionId)) return { world, fx };
  // Look the mission up by id every time: queued missions can be added in front of it.
  const idx = () => w.missions.findIndex((m) => m.id === missionId);
  const M = () => w.missions[idx()];
  const setM = (p: Partial<Mission>) => {
    const i = idx();
    w.missions[i] = { ...w.missions[i], ...p };
  };
  const hist = (text: string, who = 'Platform') =>
    setM({ history: [...M().history, { time: clk.time, text, who }] });
  const audit = (who: string, action: string, ideaId?: string) =>
    fx.audit.push({ who, action, missionId, ideaId });
  const setIdea = (id: string, p: Partial<Idea>) => (w.ideas[id] = { ...w.ideas[id], ...p });
  const mIdeas = () =>
    M()
      .ideaIds.map((id) => w.ideas[id])
      .filter(Boolean);
  const scriptOf = (id: string): ScriptIdea | undefined =>
    [...s.round1, ...s.alternatives, ...s.followups].find((x) => refToId(s, x.ref) === id);
  const member = (id?: string) => w.members.find((m) => m.id === id);
  const fill = (t: string, winner?: Idea, alt?: Idea) =>
    t
      .replace('{gain}', (winner?.result?.netReturnDelta ?? 0).toFixed(1))
      .replace('{fresh}', (winner?.freshResult?.netReturnDelta ?? 0).toFixed(1))
      .replace('{alt}', alt ? alt.title.charAt(0).toLowerCase() + alt.title.slice(1) : 'none')
      .replace('{altGain}', (alt?.freshResult?.netReturnDelta ?? 0).toFixed(1));
  const session = (round: number) => w.councils[`C-${s.missionNumber}-${round}`];

  // Spend for this tick, charged to the members involved.
  const charge = (involved: string[]) => {
    let amount = r2(M().reserved * tickSpend(tick));
    if (tick.k === 'test' && tick.round === 2 && tick.step === 0 && s.opts.budgetLimit)
      amount = r2(M().reserved * 0.85 - M().spent);
    amount = Math.max(0, Math.min(amount, r2(M().reserved - M().spent)));
    if (amount <= 0) return;
    const phase = tickPhase(tick);
    setM({
      spent: r2(M().spent + amount),
      spendByPhase: { ...M().spendByPhase, [phase]: r2(M().spendByPhase[phase] + amount) },
    });
    w.members = chargeMembers(w.members, amount, [...new Set(involved)]);
  };

  const makeIdea = (x: ScriptIdea, round: number, proposedBy: string): Idea => {
    const id = refToId(s, x.ref);
    const proposer = member(proposedBy);
    const idea: Idea = {
      id,
      missionId,
      key: x.key,
      title: x.title,
      summary: x.summary,
      family: x.family,
      proposedBy,
      agentRole:
        x.route === 'different-route'
          ? 'Pathfinder'
          : x.depth > 0 && !x.ref.startsWith('f')
            ? 'Synthesiser'
            : 'Explorer',
      model: proposer?.model ?? 'Claude Sonnet 5.5',
      round,
      depth: x.depth,
      parentIds: x.parentRefs.map((r) => refToId(s, r)),
      route: x.route,
      state: 'proposed',
      objections: [],
      receipt: {},
    };
    idea.receipt = buildReceipt({ idea, proposer });
    return idea;
  };

  const register = (ids: string[]) => {
    for (const id of ids) {
      const i = w.ideas[id];
      const specHash = specHashFor(id, i.title);
      setIdea(id, {
        state: 'queued',
        specHash,
        registeredAt: clk.time,
        receipt: buildReceipt({ idea: { ...i, specHash }, proposer: member(i.proposedBy) }),
      });
    }
  };

  const start = (n: number) => {
    const queued = mIdeas()
      .filter((i) => i.state === 'queued')
      .slice(0, n);
    for (const i of queued) {
      const tester = scriptOf(i.id)?.tester;
      setIdea(i.id, {
        state: 'testing',
        receipt: { ...i.receipt, Started: clk.time, Device: member(tester)?.device ?? 'hosted' },
      });
    }
    return queued.map((i) => scriptOf(i.id)?.tester ?? '');
  };

  const finish = (skip?: string) => {
    const done: string[] = [];
    for (const i of mIdeas().filter((x) => x.state === 'testing' && x.id !== skip)) {
      const x = scriptOf(i.id)!;
      const tester = w.members.find((m) => m.device === i.receipt.Device) ?? member(x.tester);
      const withResult = { ...i, result: x.result };
      setIdea(i.id, {
        state: 'tested',
        result: x.result,
        receipt: buildReceipt({
          idea: withResult,
          proposer: member(i.proposedBy),
          tester,
          started: i.receipt.Started,
          finished: clk.time,
        }),
      });
      done.push(i.id);
    }
    setM({ trialsRun: trialsOf(mIdeas()) });
    return done;
  };

  const giveVerdicts = (round: 1 | 2) => {
    const sess = session(round);
    const tested = mIdeas().filter((i) => i.state === 'tested' && i.round === round);
    const verdicts: CouncilSession['verdicts'] = [];
    const upheldBy: string[] = [];
    for (const i of tested) {
      const objections = i.objections.map((o) => {
        const plan = scriptOf(i.id)?.objection;
        if (plan?.status === 'upheld') {
          upheldBy.push(o.by);
          return { ...o, status: 'upheld' as const };
        }
        return o;
      });
      const next = { ...i, objections };
      const v = verdictFor(next, M().trialsRun);
      setIdea(i.id, { objections, state: v.verdict, verdictReason: v.reason });
      verdicts.push({ ideaId: i.id, verdict: v.verdict, reason: v.reason });
      if (objections.some((o) => o.status === 'upheld'))
        audit(
          agentOf(w, objections.find((o) => o.status === 'upheld')!.by),
          `Verdict: ${i.id} rejected (${objections.find((o) => o.status === 'upheld')!.kind})`,
          i.id,
        );
    }
    const promising = verdicts.filter((v) => v.verdict === 'promising');
    w.members = credit(
      w.members,
      promising.map((v) => w.ideas[v.ideaId].proposedBy),
      'passedCouncil',
    );
    w.members = credit(w.members, upheldBy, 'objectionsUpheld');
    const needs = verdicts.filter((v) => v.verdict === 'needs-evidence').length;
    const rejected = verdicts.filter((v) => v.verdict === 'rejected').length;
    const summary =
      round === 1
        ? `${tested.length} ideas judged against the evidence. ${promising.length} passed all four gates, ${needs} need more evidence and ${rejected} were rejected${upheldBy.length ? `, ${upheldBy.length} of them on upheld objections` : ''}.`
        : `The alternatives and follow-ups were judged. ${promising.length} passed all four gates.`;
    w.councils[sess.id] = {
      ...sess,
      verdicts: [...sess.verdicts, ...verdicts],
      summary: sess.summary ? `${sess.summary} ${summary}` : summary,
    };
    hist(
      `Council round ${round}: ${promising.length} promising, ${needs} need evidence, ${rejected} rejected`,
      'Council',
    );
    audit(
      'Council',
      `Round ${round} verdicts: ${promising.length} promising, ${needs} need evidence, ${rejected} rejected`,
    );
  };

  const pool = s.pool;
  switch (tick.k) {
    case 'brief': {
      hist(`Mission rules confirmed; $${M().reserved.toFixed(2)} set aside`);
      audit('Platform', `Rules confirmed, $${M().reserved.toFixed(2)} set aside`);
      break;
    }
    case 'library': {
      const lib = checkLibrary(
        M().goal,
        w.library,
        w.missions.filter((m) => m.id !== missionId),
        w.topics,
      );
      const hits = [...lib.reuse, ...lib.deadEnds, ...lib.warnings];
      for (const e of lib.reuse) {
        const li = w.library.findIndex((x) => x.id === e.id);
        w.library[li] = { ...e, reusedCount: e.reusedCount + 1 };
      }
      setM({ phase: 'library', libraryHits: hits.map((e) => e.id) });
      const text = `Found ${hits.length} related ${hits.length === 1 ? 'entry' : 'entries'}: ${lib.reuse.length} reused, ${lib.deadEnds.length} dead end${lib.deadEnds.length === 1 ? '' : 's'}, ${lib.warnings.length} warning${lib.warnings.length === 1 ? '' : 's'}`;
      hist(text);
      audit('Platform', `Library check: ${text.toLowerCase()}`);
      break;
    }
    case 'propose': {
      const refs = s.batches[tick.batch];
      const created = refs.map((ref) => {
        const x = s.round1.find((y) => y.ref === ref)!;
        return makeIdea(x, 1, x.proposedBy);
      });
      for (const i of created) w.ideas[i.id] = i;
      setM({ phase: 'explore', ideaIds: [...M().ideaIds, ...created.map((i) => i.id)] });
      w.members = credit(
        w.members,
        created.map((i) => i.proposedBy),
        'ideasProposed',
      );
      charge(created.map((i) => i.proposedBy));
      const names = [...new Set(created.map((i) => memberName(w, i.proposedBy)))];
      hist(`${created.length} ideas arrived from ${names.join(', ')}`, 'Swarm');
      if (created.some((i) => i.route === 'different-route'))
        audit(
          agentOf(w, created.find((i) => i.route === 'different-route')!.proposedBy),
          'Pathfinder proposed a different route',
        );
      if (tick.batch === 3) {
        const merged = mergeDuplicates(mIdeas());
        for (const [dup, kept] of merged) setIdea(dup, { state: 'merged', mergedInto: kept });
        const dead = matchDeadEnds(
          mIdeas().filter((i) => i.state === 'proposed'),
          w.library,
        );
        for (const [id, e] of dead) setIdea(id, { state: 'known-dead-end', deadEndFrom: e.id });
        const deadText = dead.size
          ? `, ${dead.size} known dead end not re-tested (${[...dead.values()].map((e) => e.id).join(', ')})`
          : '';
        hist(`${merged.size} duplicates merged and counted once${deadText}`);
        audit('Platform', `${merged.size} duplicates merged${deadText}`);
      }
      break;
    }
    case 'test': {
      setM({ phase: 'test', round: tick.round });
      const testers: string[] = [];
      if (tick.step === 0) {
        const toRegister = mIdeas()
          .filter((i) => i.state === 'proposed')
          .map((i) => i.id);
        register(toRegister);
        hist(`${toRegister.length} test plans registered and fingerprinted before testing`);
        audit('Platform', `${toRegister.length} test plans registered before testing`);
        testers.push(...start(SLOTS));
      } else {
        let skip: string | undefined;
        if (s.opts.dropped && tick.round === 1 && tick.step === 1) {
          const victim = mIdeas().find((i) => i.state === 'testing');
          if (victim) {
            skip = victim.id;
            const oldDevice = victim.receipt.Device;
            const other = w.members.find(
              (m) => m.online && m.roles.includes('Experiment worker') && m.device !== oldDevice,
            );
            setIdea(victim.id, {
              receipt: { ...victim.receipt, Device: other?.device ?? 'hosted', Started: clk.time },
            });
            hist(
              `Lease expired on ${oldDevice}; late result refused, test reassigned to ${other?.device ?? 'a hosted worker'}`,
            );
            audit('Platform', `Lease expired on ${oldDevice}, late result refused`, victim.id);
            audit(
              'Platform',
              `Reassigned, 60 s lease to ${other?.device ?? 'hosted worker'}`,
              victim.id,
            );
          }
        }
        const last = tick.round === 2 ? tick.step === 1 : tick.step === 3;
        const done = finish(last ? undefined : skip);
        if (last) {
          // Anything still queued runs now so the round always completes.
          start(99);
          done.push(...finish());
        } else testers.push(...start(SLOTS - (skip ? 1 : 0)));
        hist(
          `${done.length} tests finished; ${mIdeas().filter((i) => i.state === 'queued').length} queued`,
          'Code workers',
        );
        audit(
          'Code workers',
          `${done.length} tests finished, ${M().trialsRun.toLocaleString('en-GB')} trials so far`,
        );
      }
      charge(testers.filter(Boolean));
      break;
    }
    case 'seat': {
      const panel = seatCouncil(w.members, s.missionNumber + tick.round);
      const id = `C-${s.missionNumber}-${tick.round}`;
      w.councils[id] = {
        id,
        missionId,
        round: tick.round,
        panel,
        objections: [],
        syntheses: [],
        verdicts: [],
        summary: '',
      };
      setM({ phase: 'council', councilIds: [...M().councilIds, id] });
      hist(`Council seated: ${panel.length} members`, 'Platform');
      audit(
        'Platform',
        `Council ${id} seated: ${panel.map((p) => memberName(w, p.memberId)).join(', ')}`,
      );
      charge(panel.map((p) => p.memberId));
      break;
    }
    case 'objections': {
      const sess = session(1);
      const made: Objection[] = [];
      let n = 0;
      for (const i of mIdeas().filter((x) => x.state === 'tested')) {
        const plan = scriptOf(i.id)?.objection;
        if (!plan) continue;
        const by = redTeamFor(i.id, sess.panel, w.ideas, n++) ?? sess.panel[0].memberId;
        const texts = pool.objections;
        const text =
          plan.kind === 'costs-ignored'
            ? texts.costs.text
            : plan.kind === 'overfitting'
              ? texts.overfitting
              : plan.kind === 'look-ahead'
                ? texts.lookAhead
                : texts.fewTrades;
        const advocate = judgesFor(i.id, sess.panel, w.ideas).find(
          (p) => p.seat === 'advocate',
        )?.memberId;
        const o: Objection = {
          id: `O-${i.id.slice(2)}`,
          ideaId: i.id,
          by,
          kind: plan.kind,
          text,
          status: plan.status === 'answered' ? 'answered' : 'open',
          answer: plan.status === 'answered' ? texts.costs.answer : undefined,
          answeredBy: plan.status === 'answered' ? advocate : undefined,
        };
        made.push(o);
        setIdea(i.id, { objections: [...i.objections, o] });
      }
      w.councils[sess.id] = { ...sess, objections: made.map((o) => o.id) };
      hist(
        `${made.length} objections raised by the red team; ${made.filter((o) => o.status === 'answered').length} answered with evidence`,
        'Council',
      );
      audit(
        'Council',
        `${made.length} objections raised, ${made.filter((o) => o.status === 'answered').length} answered`,
      );
      charge(sess.panel.map((p) => p.memberId));
      break;
    }
    case 'verdicts': {
      giveVerdicts(tick.round);
      if (tick.round === 2) {
        const pass = mIdeas()
          .filter((i) => i.state === 'promising')
          .sort((a, b) => (b.result?.netReturnDelta ?? 0) - (a.result?.netReturnDelta ?? 0))
          .slice(0, 3);
        for (const i of pass) setIdea(i.id, { state: 'fresh-check' });
        if (pass.length) {
          hist(`Shortlist: ${pass.map((i) => i.id).join(', ')}`, 'Council');
          audit(
            'Council',
            `Shortlisted ${pass.length} for the fresh-data check: ${pass.map((i) => i.id).join(', ')}`,
          );
        }
      }
      charge(session(tick.round).panel.map((p) => p.memberId));
      break;
    }
    case 'synthesise': {
      const sess = session(1);
      const synth =
        sess.panel.find((p) => p.seat === 'synthesiser')?.memberId ?? sess.panel[0].memberId;
      const created = s.alternatives
        .filter((x) => x.depth <= M().rules.maxDepth)
        .map((x) => makeIdea(x, 2, synth));
      for (const i of created) w.ideas[i.id] = i;
      const syntheses = s.alternatives.map((x, k) => ({
        fromIdeaIds: x.parentRefs.map((r) => refToId(s, r)),
        newIdeaId: refToId(s, x.ref),
        why: pool.alternatives[k].why,
        kind: pool.alternatives[k].kind,
      }));
      w.councils[sess.id] = { ...sess, syntheses };
      setM({ phase: 'alternatives', ideaIds: [...M().ideaIds, ...created.map((i) => i.id)] });
      w.members = credit(
        w.members,
        created.map(() => synth),
        'ideasProposed',
      );
      const cheaper = syntheses.find((x) => x.kind === 'cheaper-route');
      hist(
        `Synthesiser proposed ${created.length} alternatives${cheaper ? `, including a cheaper route to ${cheaper.fromIdeaIds[0]}` : ''}`,
        agentOf(w, synth),
      );
      audit(
        agentOf(w, synth),
        `Proposed ${created.length} alternatives${cheaper ? `, one a cheaper route to ${cheaper.fromIdeaIds[0]}` : ''}`,
      );
      charge([synth]);
      break;
    }
    case 'followups': {
      const created = s.followups
        .filter((x) => x.depth <= M().rules.maxDepth)
        .map((x) => makeIdea(x, 2, x.proposedBy));
      for (const i of created) w.ideas[i.id] = i;
      setM({ phase: 'explore', round: 2, ideaIds: [...M().ideaIds, ...created.map((i) => i.id)] });
      w.members = credit(
        w.members,
        created.map((i) => i.proposedBy),
        'ideasProposed',
      );
      hist(`Round 2: ${created.length} follow-up ideas from the swarm`, 'Swarm');
      charge(created.map((i) => i.proposedBy));
      break;
    }
    case 'budget-stop': {
      const cancelled = mIdeas().filter(
        (i) => i.state === 'queued' && s.followups.some((f) => refToId(s, f.ref) === i.id),
      );
      for (const i of cancelled) setIdea(i.id, { state: 'cancelled' });
      for (const i of mIdeas().filter(
        (x) => x.state === 'testing' && s.followups.some((f) => refToId(s, f.ref) === x.id),
      ))
        setIdea(i.id, { state: 'cancelled' });
      hist(
        'Budget limit reached: only the reserve for the fresh-data check and approval is left. Queued ideas cancelled; no new ideas will be spawned.',
      );
      audit(
        'Platform',
        `Budget limit reached: ${s.followups.length} queued ideas cancelled, no more spawning`,
      );
      fx.toasts.push({
        text: `${missionId} hit its budget limit, so the swarm stopped spawning ideas. It carries on with what it has.`,
        tone: 'warn',
      });
      break;
    }
    case 'unseal': {
      const list = mIdeas().filter((i) => i.state === 'fresh-check');
      for (const i of list)
        setIdea(i.id, {
          receipt: { ...i.receipt, 'Fresh data sealed': 'No: opened for the fresh-data check' },
        });
      setM({ phase: 'fresh' });
      hist(`Fresh data unsealed for ${list.length} shortlisted ideas`);
      audit('Platform', `Fresh data unsealed for ${list.length} shortlisted ideas`);
      break;
    }
    case 'fresh-run': {
      const checkers = w.members.filter((m) => m.online && m.roles.includes('Fresh-data checker'));
      const used: string[] = [];
      let k = 0;
      for (const i of mIdeas().filter((x) => x.state === 'fresh-check')) {
        const lineage = lineageMembers(i.id, w.ideas);
        const pick = [...checkers.slice(k), ...checkers.slice(0, k)].find(
          (m) => !lineage.has(m.id),
        );
        k++;
        const x = scriptOf(i.id)!;
        setIdea(i.id, {
          freshCheckedBy: pick?.id,
          freshResult: x.fresh ?? {
            ...x.result,
            netReturnDelta: r2(x.result.netReturnDelta * 0.3),
          },
        });
        if (pick) used.push(pick.id);
        audit(agentOf(w, pick?.id), `Fresh-data check run on ${i.id}`, i.id);
      }
      hist(
        `Fresh-data checks run by ${[...new Set(used.map((u) => memberName(w, u)))].join(', ')}, none of whom worked on the ideas`,
      );
      charge(used);
      break;
    }
    case 'fresh-decide': {
      const list = mIdeas().filter((x) => x.state === 'fresh-check');
      const held: Idea[] = [];
      for (const i of list) {
        const ok = heldUp(i);
        setIdea(i.id, { state: ok ? 'held-up' : 'failed-fresh' });
        if (ok) held.push(w.ideas[i.id]);
        audit(
          'Platform',
          ok ? `${i.id} held up on fresh data` : `${i.id} did not hold up on fresh data`,
          i.id,
        );
        if (!ok) {
          const id = `L-${pad(w.seq.library)}`;
          w.seq.library++;
          w.library.unshift({
            id,
            kind: 'warning',
            title: `Didn’t hold up: ${i.title}`,
            text: pool.warningLesson,
            fromMissionId: missionId,
            fromIdeaId: i.id,
            reusedCount: 0,
            savedUsd: 0,
            addedAt: clk.stamp,
            matchKeys: [i.key],
          });
        }
      }
      held.sort(
        (a, b) => (b.freshResult?.netReturnDelta ?? 0) - (a.freshResult?.netReturnDelta ?? 0),
      );
      setM({ winnerIdeaIds: held.map((i) => i.id) });
      w.members = credit(
        w.members,
        held.map((i) => i.proposedBy),
        'heldUpFresh',
      );
      hist(`${held.length} held up on fresh data, ${list.length - held.length} didn’t`);
      if (!held.length) {
        setM({ phase: 'closed-no-winner' });
        hist(
          'Nothing held up on fresh data. Closed with no winner; the lessons go to the library.',
        );
      }
      charge([]);
      break;
    }
    case 'draft': {
      if (!M().winnerIdeaIds.length) break;
      const editor = w.members.find((m) => m.online && m.roles.includes(EDITOR_ROLE));
      const [win, alt] = M().winnerIdeaIds.map((id) => w.ideas[id]);
      const draft = fill(
        tick.pass === 1 && s.opts.panelRejects ? pool.draft.call : pool.draft.v1,
        win,
        alt,
      );
      const rule = w.rules.find((r) => r.version === M().startRuleVersion) ?? activeRule(w);
      const excluded = excludedForPublish(M(), w.ideas, editor?.id);
      // A second panel prefers approvers who didn't sit on the first; if there aren't
      // enough across two providers, it rotates seats instead.
      const withoutFirst = new Set(excluded);
      if (tick.pass === 2)
        for (const a of w.panels[M().approvalId!]?.approvers ?? []) withoutFirst.add(a.memberId);
      const approvers =
        seatApprovalPanel(w.members, withoutFirst, rule, s.missionNumber + tick.pass) ??
        seatApprovalPanel(w.members, excluded, rule, s.missionNumber + tick.pass + 2);
      setM({ draft, provenWrongIf: pool.provenWrongIf });
      hist('Draft written by the editor agent', agentOf(w, editor?.id));
      audit(agentOf(w, editor?.id), 'Draft written');
      if (!approvers) {
        setM({ phase: 'not-published' });
        hist('Not enough eligible approvers across two providers. Not published.');
        audit('Platform', 'Approval panel could not be seated; not published');
        break;
      }
      const pid = `A-${s.missionNumber}${tick.pass === 2 ? 'b' : ''}`;
      w.panels[pid] = {
        id: pid,
        purpose: 'publish',
        subjectId: missionId,
        ideaIds: M().winnerIdeaIds,
        ruleVersion: rule.version,
        approvers,
        needed: rule.approvalsNeeded,
      };
      setM({ phase: 'approval', approvalId: pid, approvalRuleVersion: rule.version });
      const providers = new Set(approvers.map((a) => a.provider)).size;
      hist(
        `Approval panel seated: ${approvers.length} approvers across ${providers} providers, none of whom worked on it`,
      );
      audit(
        'Platform',
        `Approval panel ${pid} seated under rule v${rule.version}: ${approvers.length} approvers, ${providers} providers`,
      );
      charge([]);
      break;
    }
    case 'votes': {
      const pid = M().approvalId;
      if (!pid || !w.panels[pid] || M().phase !== 'approval') break;
      const panel = w.panels[pid];
      const pass = pid.endsWith('b') ? 2 : 1;
      const plan = s.votePlan.find((v) => v.pass === pass) ?? { pass, rejects: [] };
      const approvers = [...panel.approvers];
      let voted = 0;
      for (let i = 0; i < approvers.length && voted < tick.n; i++) {
        if (approvers[i].vote) continue;
        const rej = plan.rejects.find((r) => r.at === i);
        approvers[i] = rej
          ? { ...approvers[i], vote: 'reject', reason: rej.reason, citesRule: rej.rule }
          : {
              ...approvers[i],
              vote: 'approve',
              reason: s.approveReasons[i % s.approveReasons.length],
            };
        voted++;
        audit(
          agentOf(w, approvers[i].memberId),
          `Approval vote on ${missionId}: ${approvers[i].vote}${rej?.rule ? ` (rule ${rej.rule})` : ''}`,
        );
        if (rej && !rej.rule) {
          const [win, alt] = M().winnerIdeaIds.map((id) => w.ideas[id]);
          setM({ draft: fill(pool.draft.v2, win, alt) });
          hist('Editor tightened the wording after an approver’s note', 'Editor');
        }
      }
      const next: ApprovalPanel = { ...panel, approvers };
      const outcome = decidePublish(next);
      if (outcome) {
        next.outcome = outcome;
        next.decidedAt = clk.time;
        const t = tally(next);
        if (outcome === 'published') {
          hist(`Approved: ${t.approvals} of ${next.approvers.length}`, 'Approval panel');
          audit(
            'Approval panel',
            `${missionId} approved, ${t.approvals} of ${next.approvers.length}`,
          );
        } else {
          setM({ phase: 'council', round: M().round + 1 });
          hist(
            `Sent back: ${t.rejects} approvers cited rule 8 (research, not advice)`,
            'Approval panel',
          );
          audit('Approval panel', `${missionId} sent back: ${t.rejects} rejects citing rule 8`);
          fx.toasts.push({
            text: `The approval panel sent ${missionId} back: the draft read like a trade call.`,
            link: { to: `/missions/${missionId}`, label: 'See why' },
            tone: 'warn',
          });
        }
      }
      w.panels[pid] = next;
      charge(approvers.filter((a) => a.vote).map((a) => a.memberId));
      break;
    }
    case 'reround': {
      const [win, alt] = M().winnerIdeaIds.map((id) => w.ideas[id]);
      setM({ draft: fill(pool.draft.v1, win, alt) });
      hist(
        'Council round 3: findings re-confirmed; the editor rewrote the draft without the instruction',
        'Council',
      );
      audit('Council', 'Re-checked after the panel’s rejection; draft rewritten');
      break;
    }
    case 'publish': {
      const panel = M().approvalId ? w.panels[M().approvalId!] : undefined;
      if (panel?.outcome !== 'published') break;
      setM({
        phase: 'published',
        publishedAt: clk.stamp,
        observedAt: clk.stamp,
        expiresAt: `${addDays(clk.date, 14)}`,
      });
      hist(`Published automatically under approval rule v${panel.ruleVersion}`, 'Council');
      audit('Council', `${missionId} published automatically (rule v${panel.ruleVersion})`);
      fx.toasts.push({
        text: `${missionId} was approved by the council and published.`,
        link: { to: '/published', label: 'See what viewers see' },
        tone: 'good',
      });
      break;
    }
    case 'close-no-winner': {
      setM({ phase: 'closed-no-winner' });
      hist(
        `Nothing cleared the bar to beat after ${M().trialsRun.toLocaleString('en-GB')} trials. Closed with no winner: a useful answer.`,
        'Council',
      );
      audit('Council', `${missionId} closed: no winner`);
      fx.toasts.push({
        text: `${missionId} closed with no winner. That is a real answer, and the dead ends go to the library.`,
        link: { to: `/missions/${missionId}`, label: 'See the mission' },
        tone: 'info',
      });
      break;
    }
    case 'learn-library': {
      const added: LibraryEntry[] = [];
      const add = (
        e: Omit<LibraryEntry, 'id' | 'reusedCount' | 'savedUsd' | 'addedAt' | 'fromMissionId'>,
      ) => {
        const entry: LibraryEntry = {
          ...e,
          id: `L-${pad(w.seq.library)}`,
          reusedCount: 0,
          savedUsd: 0,
          addedAt: clk.stamp,
          fromMissionId: missionId,
        };
        w.seq.library++;
        added.push(entry);
      };
      const win = M().winnerIdeaIds[0] ? w.ideas[M().winnerIdeaIds[0]] : undefined;
      if (win)
        add({
          kind: 'proven',
          title: win.title,
          text: M().draft ?? win.summary,
          fromIdeaId: win.id,
          matchKeys: [win.key],
        });
      const overfit = mIdeas().find((i) =>
        i.objections.some((o) => o.kind === 'overfitting' && o.status === 'upheld'),
      );
      if (overfit)
        add({
          kind: 'dead-end',
          title: overfit.title,
          text: pool.deadEndLesson,
          fromIdeaId: overfit.id,
          matchKeys: [overfit.key],
        });
      if (!win) {
        add({
          kind: 'dead-end',
          title: `Nothing beat “${M().rules.baseline}”`,
          text: `${mIdeas().filter((i) => i.result).length} ideas and ${M().trialsRun.toLocaleString('en-GB')} trials, and none cleared the bar to beat after costs.`,
        });
      }
      add({ kind: 'open-question', title: pool.openQuestion, text: `Raised by ${missionId}.` });
      w.library.unshift(...added.reverse());
      hist(`Library: ${added.length} entries added`, 'Platform');
      audit('Platform', `Library: ${added.map((e) => e.id).join(', ')} added`);
      break;
    }
    case 'learn-improve': {
      const m = M();
      const win = m.winnerIdeaIds[0] ? w.ideas[m.winnerIdeaIds[0]] : undefined;
      const ti = m.topicId ? w.topics.findIndex((t) => t.id === m.topicId) : -1;
      if (ti >= 0) {
        const t0 = w.topics[ti];
        let topic: Topic = {
          ...t0,
          totalTrials: t0.totalTrials + m.trialsRun,
          challenges: t0.challenges + 1,
          openChallengeMissionId:
            t0.openChallengeMissionId === m.id ? undefined : t0.openChallengeMissionId,
          lastFreshWindow: t0.nextFreshWindow ?? t0.lastFreshWindow,
          nextFreshWindow: undefined,
        };
        if (win && canReplaceBest(win, topic, m.phase === 'published').ok) {
          topic = replaceBest(topic, {
            rule: win.title,
            missionId: m.id,
            ideaId: win.id,
            gain: win.freshResult?.netReturnDelta ?? 0,
            when: clk.stamp,
            date: clk.date,
          });
          hist(`Became the current best for “${topic.title}”`, 'Platform');
          audit('Platform', `Current best for ${topic.title} is now “${win.title}”`);
        }
        w.topics[ti] = topic;
      }
      // The Coach reviews the process and proposes one change.
      const cid = `PC-${pad(w.seq.change)}`;
      w.seq.change++;
      const sessions = m.councilIds.map((id) => w.councils[id]).filter(Boolean);
      const coach = review(m, mIdeas(), sessions, [cid]);
      const coachMember = w.members.find((x) => x.standing === 'Coach');
      w.changes.unshift({
        id: cid,
        change: win
          ? 'Give the Pathfinder 25% of the budget on missions like this one'
          : 'Use a Large team instead of the whole swarm for missions like this one',
        why: win
          ? `A different-route idea fed the winner in ${m.id}. ${coach.differentRouteResult}`
          : `${m.id} found nothing with the whole swarm; the Coach thinks it was ${coach.sizeVerdict}.`,
        kind: win ? 'defaults' : 'swarm-size',
        learnedFrom: [m.id],
        replayedOn: [],
        replayTarget: 6,
        status: 'replaying',
      });
      setM({ coachReview: coach });
      audit(agentOf(w, coachMember?.id), `Coach review of ${m.id}; proposed ${cid}, replay queued`);
      if (win && ti >= 0 && m.phase === 'published') {
        const topic = w.topics[ti];
        const best = currentBest(topic);
        const chId = `M-${w.seq.mission}`;
        w.seq.mission++;
        const challenger = w.members.find((x) => x.standing === 'Challenger');
        w.missions.unshift(
          queuedMission(
            chId,
            `Beat the new best for ${topic.title.toLowerCase()}: ${best.rule}`,
            'challenge',
            topic.id,
            best.rule,
            m.rules,
            clk,
            `Waiting for a fresh window newer than ${topic.lastFreshWindow}`,
          ),
        );
        w.topics[ti] = { ...topic, openChallengeMissionId: chId };
        audit(
          agentOf(w, challenger?.id),
          `Challenger queued ${chId} to beat the new best; waiting for fresh data`,
          undefined,
        );
      }
      const q = w.library.find((e) => e.kind === 'open-question' && e.fromMissionId === m.id);
      if (q) {
        const sid = `M-${w.seq.mission}`;
        w.seq.mission++;
        const qm = queuedMission(
          sid,
          q.title,
          'open',
          undefined,
          undefined,
          m.rules,
          clk,
          'Waiting for the self-start budget',
        );
        w.missions.unshift({ ...qm, spawnedFromLibraryId: q.id });
        audit('Swarm', `Self-started ${sid} from open question ${q.id}`);
      }
      if (m.phase === 'published') setM({ phase: 'learned' });
      fx.toasts.push({
        text: win
          ? `${m.id} is done. The swarm has already queued a challenge to beat it.`
          : `${m.id} is done. The Coach is looking at how to do it better next time.`,
        link: { to: '/improvement', label: 'See how it improves' },
        tone: 'info',
      });
      break;
    }
  }
  return { world: w, fx };
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCDate()} ${d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' })}, 14:00`;
}

export function queuedMission(
  id: string,
  title: string,
  kind: Mission['kind'],
  topicId: string | undefined,
  best: string | undefined,
  rules: MissionRules,
  clk: Clock,
  why: string,
): Mission {
  return {
    id,
    title,
    goal: title,
    createdBy: 'Swarm',
    kind,
    topicId,
    challengesBest: best,
    phase: 'queued',
    round: 0,
    rules: { ...rules, baseline: best ?? 'The strategy as it trades today' },
    reserved: 0,
    spent: 0,
    ideaIds: [],
    councilIds: [],
    libraryHits: [],
    trialsRun: 0,
    winnerIdeaIds: [],
    history: [{ time: clk.time, text: `Queued by the swarm. ${why}.`, who: 'Swarm' }],
    waitingFor: why,
    spendByPhase: { explore: 0, test: 0, council: 0, fresh: 0, approval: 0 },
  };
}

/**
 * One vote on a promotion or rule-change panel. When the panel is complete the
 * decision is applied: a role version becomes active, or a new approval rule
 * version replaces the old one (cooling-off: it only affects missions that start later).
 */
export function applyPanelVote(
  world: World,
  panelId: string,
  vote: Pick<Approver, 'vote' | 'reason' | 'citesRule'>,
  clk: Clock,
): { world: World; fx: Fx } {
  const fx: Fx = { audit: [], toasts: [] };
  const panel = world.panels[panelId];
  if (!panel || panel.outcome) return { world, fx };
  const i = panel.approvers.findIndex((a) => !a.vote);
  if (i < 0) return { world, fx };
  const approvers = panel.approvers.map((a, k) => (k === i ? { ...a, ...vote } : a));
  const w: World = { ...world, panels: { ...world.panels }, changes: [...world.changes] };
  const next: ApprovalPanel = { ...panel, approvers };
  const changeIdx = w.changes.findIndex((c) => c.id === panel.subjectId);
  const change = w.changes[changeIdx];
  fx.audit.push({
    who: agentOf(w, approvers[i].memberId),
    action: `${panel.purpose === 'rule-change' ? 'Rule-change' : 'Promotion'} vote on ${panel.subjectId}: ${vote.vote}`,
  });
  const t = tally(next);
  if (t.done) {
    const ok =
      panel.purpose === 'rule-change'
        ? decideRuleChange(next) === 'adopted'
        : t.approvals >= panel.needed && !t.ruleReject;
    next.outcome = ok ? 'adopted' : 'rejected';
    next.decidedAt = clk.time;
    if (change)
      w.changes[changeIdx] = {
        ...change,
        status: ok ? 'adopted' : 'rejected',
        outcome: `${ok ? 'Adopted' : 'Rejected'}, ${t.approvals} of ${next.approvers.length}`,
        reviewAfterMissions: ok ? 5 : undefined,
      };
    if (ok && panel.purpose === 'rule-change') {
      const proposed = w.rules.find(
        (r) => r.status === 'proposed' && r.fromChange === panel.subjectId,
      );
      if (proposed) {
        w.rules = w.rules.map((r) =>
          r === proposed
            ? { ...r, status: 'active', adoptedAt: clk.stamp }
            : r.status === 'active'
              ? { ...r, status: 'retired' }
              : r,
        );
        fx.audit.push({
          who: 'Rule-change panel',
          action: `Approval rule v${proposed.version} adopted, ${t.approvals} of 7; applies to missions that start from now`,
        });
        fx.toasts.push({
          text: `The council adopted approval rule v${proposed.version}. It applies only to missions that start from now, and is on probation for 5 missions.`,
          link: { to: '/improvement', label: 'See the rule' },
          tone: 'info',
        });
      }
    }
    if (ok && panel.purpose === 'promotion' && change?.kind === 'role-version') {
      const role = change.change.split(' v')[0];
      w.roleVersions = w.roleVersions.map((r) =>
        r.role === role
          ? {
              ...r,
              status:
                r.status === 'candidate' ? 'active' : r.status === 'active' ? 'retired' : r.status,
            }
          : r,
      );
      fx.audit.push({
        who: 'Approval panel',
        action: `${change.change.split(':')[0]} promoted to active, ${t.approvals} of ${next.approvers.length}`,
      });
      fx.toasts.push({
        text: `The council promoted ${change.change.split(':')[0]} to active.`,
        link: { to: '/library', label: 'See role versions' },
        tone: 'good',
      });
    }
  }
  w.panels[panelId] = next;
  return { world: w, fx };
}
