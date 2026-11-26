import type { Job, JobState } from './types';

export type Tone = 'good' | 'warn' | 'bad' | 'grey' | 'run';

export const STATE_LABEL: Record<JobState, string> = {
  queued: 'Waiting for a member',
  researching: 'Researching',
  rechecking: 'Being re-checked',
  challenged: 'Challenged',
  human: 'Waiting for a person',
  published: 'Published',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const STATE_TONE: Record<JobState, Tone> = {
  queued: 'grey',
  researching: 'run',
  rechecking: 'run',
  challenged: 'bad',
  human: 'warn',
  published: 'good',
  rejected: 'bad',
  withdrawn: 'bad',
};

/** Status shown to people: colour plus words, always. */
export function jobStatus(job: Job): { label: string; tone: Tone } {
  if (job.state === 'published' && job.expired) return { label: 'Expired', tone: 'grey' };
  if (job.state === 'published') return { label: 'Current', tone: 'good' };
  return { label: STATE_LABEL[job.state], tone: STATE_TONE[job.state] };
}

export type BoardColumn = 'waiting' | 'researching' | 'rechecking' | 'human' | 'done';

export const BOARD_COLUMNS: { key: BoardColumn; title: string }[] = [
  { key: 'waiting', title: 'Waiting for a member' },
  { key: 'researching', title: 'Researching' },
  { key: 'rechecking', title: 'Being re-checked' },
  { key: 'human', title: 'Waiting for a person' },
  { key: 'done', title: 'Done' },
];

export function boardColumn(state: JobState): BoardColumn {
  switch (state) {
    case 'queued':
      return 'waiting';
    case 'researching':
    case 'challenged':
      return 'researching';
    case 'rechecking':
      return 'rechecking';
    case 'human':
      return 'human';
    default:
      return 'done';
  }
}
