import type { MissionScript, Tick } from '../domain/simulator';
import type { Idea } from '../domain/types';
import { applyTick, createMission, type Clock, type World } from '../domain/world';
import {
  seedChanges,
  seedLibrary,
  seedPanels,
  seedRoleVersions,
  seedRules,
  seedTopics,
} from './knowledge';
import { seedMembers } from './members';
import { buildFinished, buildM12 } from './missions';

export interface Run {
  script: MissionScript;
  plan: Tick[];
  at: number;
}

const clockAt = (h: number, m: number, s = 0): Clock => {
  const p = (n: number) => String(n).padStart(2, '0');
  return {
    time: `${p(h)}:${p(m)}:${p(s)}`,
    stamp: `27 Nov, ${p(h)}:${p(m)}`,
    date: '2026-11-27',
  };
};

/** Run a seeded mission forward through its first `n` ticks, minutes apart. */
function runAhead(w: World, run: Run, id: string, n: number, h: number, m: number, step: number) {
  let world = w;
  for (let i = 0; i < n; i++) {
    const t = m + i * step;
    world = applyTick(
      world,
      id,
      run.script,
      run.plan[i],
      clockAt(h + Math.floor(t / 60), t % 60, (7 * i) % 60),
    ).world;
    run.at = i + 1;
  }
  return world;
}

/** The whole demo world at the start, plus the runs the ambient swarm continues. */
export function seedWorld(): { world: World; runs: Record<string, Run> } {
  const members = seedMembers.map((m) => ({ ...m, roles: [...m.roles] }));
  const m12 = buildM12(members);
  const done = buildFinished(members);
  const ideas: Record<string, Idea> = {};
  for (const i of [...m12.ideas, ...done.ideas]) ideas[i.id] = i;
  let world: World = {
    missions: [m12.mission, ...done.missions],
    ideas,
    councils: Object.fromEntries(m12.councils.map((c) => [c.id, c])),
    panels: Object.fromEntries(seedPanels.map((p) => [p.id, structuredClone(p)])),
    members,
    library: seedLibrary.map((e) => ({ ...e })),
    topics: structuredClone(seedTopics),
    changes: structuredClone(seedChanges),
    rules: structuredClone(seedRules),
    roleVersions: structuredClone(seedRoleVersions),
    seq: { mission: 11, library: 32, change: 11 },
  };
  const runs: Record<string, Run> = {};

  // M-11: started by the Challenger at 12:40, now with its approval panel in session.
  const c11 = createMission(
    world,
    {
      goal: 'Is there a calmer time of day to enter breakout trades?',
      budget: 38,
      swarmSize: 'whole',
      createdBy: 'Omar S. (Challenger)',
    },
    clockAt(12, 40),
  );
  world = c11.world;
  runs['M-11'] = { script: c11.script, plan: c11.plan, at: 0 };
  world = runAhead(world, runs['M-11'], 'M-11', 24, 12, 40, 3);

  // M-10: started by Chen W. at 14:02, still exploring.
  world = { ...world, seq: { ...world.seq, mission: 10 } };
  const c10 = createMission(
    world,
    {
      goal: 'Can we spot a volatile week before it starts?',
      budget: 20,
      swarmSize: 'large',
      createdBy: 'Chen W.',
    },
    clockAt(14, 2),
  );
  world = c10.world;
  runs['M-10'] = { script: c10.script, plan: c10.plan, at: 0 };
  world = runAhead(world, runs['M-10'], 'M-10', 5, 14, 2, 4);

  world = {
    ...world,
    seq: { ...world.seq, mission: 14 },
    missions: [...world.missions].sort((a, b) => Number(b.id.slice(2)) - Number(a.id.slice(2))),
  };
  return { world, runs };
}
