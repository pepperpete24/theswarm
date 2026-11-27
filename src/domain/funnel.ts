import type { Idea, IdeaState } from './types';

export const PASSED: IdeaState[] = ['promising', 'fresh-check', 'held-up', 'failed-fresh'];
export const SHORTLISTED: IdeaState[] = ['fresh-check', 'held-up', 'failed-fresh'];
export const ACTIVE_IDEA: IdeaState[] = ['queued', 'testing'];

export interface Funnel {
  proposed: number;
  removed: number;
  tested: number;
  passed: number;
  shortlisted: number;
  heldUp: number;
  waiting: number;
  checking: number;
}

/** Counts that always equal the idea states. */
export function missionFunnel(ideas: Idea[]): Funnel {
  const n = (states: IdeaState[]) => ideas.filter((i) => states.includes(i.state)).length;
  return {
    proposed: ideas.length,
    removed: n(['merged', 'known-dead-end']),
    tested: ideas.filter((i) => i.result).length,
    passed: n(PASSED),
    shortlisted: n(SHORTLISTED),
    heldUp: n(['held-up']),
    waiting: n(['proposed', 'queued', 'testing']),
    checking: n(['fresh-check']),
  };
}

/** Total parameter sets tried across a mission's ideas. */
export const trialsOf = (ideas: Idea[]) => ideas.reduce((s, i) => s + (i.result?.trials ?? 0), 0);
