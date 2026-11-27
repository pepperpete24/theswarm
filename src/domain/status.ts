import type { IdeaState, LibraryKind, Mission, MissionPhase } from './types';

export type Tone = 'good' | 'warn' | 'bad' | 'grey' | 'run' | 'info' | 'dead';

const PHASE: Record<MissionPhase, [string, Tone]> = {
  queued: ['Queued', 'grey'],
  brief: ['Brief', 'run'],
  library: ['Library check', 'run'],
  explore: ['Exploring', 'run'],
  test: ['Testing', 'run'],
  council: ['Council in session', 'run'],
  alternatives: ['Alternatives', 'run'],
  fresh: ['Fresh-data check', 'run'],
  approval: ['In approval', 'warn'],
  published: ['Published', 'good'],
  learned: ['Published', 'good'],
  withdrawn: ['Withdrawn', 'bad'],
  'not-published': ['Not published', 'bad'],
  'closed-no-winner': ['Closed: no winner', 'grey'],
  stopped: ['Stopped', 'grey'],
};

/** Status shown to people: colour plus words, always. */
export function missionStatus(m: Mission): { label: string; tone: Tone } {
  if ((m.phase === 'published' || m.phase === 'learned') && m.expired)
    return { label: 'Expired', tone: 'grey' };
  const [label, tone] = PHASE[m.phase];
  return { label, tone };
}

/** Index into PHASES for the phase bar. */
export function phaseIndex(p: MissionPhase): number {
  const order: MissionPhase[] = [
    'brief',
    'library',
    'explore',
    'test',
    'council',
    'alternatives',
    'fresh',
    'approval',
    'published',
    'learned',
  ];
  if (p === 'queued') return -1;
  if (p === 'withdrawn') return 8;
  if (p === 'not-published') return 7;
  if (p === 'closed-no-winner' || p === 'stopped') return 4;
  return order.indexOf(p);
}

export const IDEA_STATE: Record<IdeaState, [string, Tone]> = {
  proposed: ['Proposed', 'grey'],
  merged: ['Merged', 'grey'],
  'known-dead-end': ['Known dead end', 'dead'],
  queued: ['Queued', 'grey'],
  testing: ['Testing', 'run'],
  tested: ['Tested', 'info'],
  promising: ['Promising', 'good'],
  'needs-evidence': ['Needs evidence', 'warn'],
  rejected: ['Rejected', 'bad'],
  'fresh-check': ['Fresh-data check', 'warn'],
  'held-up': ['Held up', 'good'],
  'failed-fresh': ['Didn’t hold up', 'bad'],
  cancelled: ['Cancelled', 'grey'],
};

export const ideaStatus = (s: IdeaState) => ({ label: IDEA_STATE[s][0], tone: IDEA_STATE[s][1] });

export const LIBRARY_KIND: Record<LibraryKind, [string, Tone]> = {
  proven: ['Proven', 'good'],
  'dead-end': ['Dead end', 'bad'],
  warning: ['Warning', 'warn'],
  method: ['Method', 'info'],
  'open-question': ['Open question', 'run'],
};

export const FAMILY_LABEL: Record<string, string> = {
  volatility: 'Volatility',
  time: 'Time',
  structure: 'Price structure',
  trailing: 'Trailing',
  session: 'Session',
  model: 'Model',
  combined: 'Combined',
  target: 'Target',
};
