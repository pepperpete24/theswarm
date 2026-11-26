export type JobState =
  | 'queued' // waiting for a member
  | 'researching'
  | 'rechecking'
  | 'challenged' // re-check disagreed; running again
  | 'human' // waiting for a person
  | 'published'
  | 'rejected'
  | 'withdrawn';

export type ResultRow = [string, string, string];

export interface Member {
  id: string;
  name: string;
  device: string;
  model: string;
  roles: string[];
  hours: string;
  acceptedFindings: number;
  confirmedRate: number;
  spentToday: number;
  dailyCap: number;
  online: boolean;
}

export interface HistoryLine {
  time: string;
  text: string;
  who: string;
}

export interface Job {
  id: string;
  question: string;
  role: string;
  state: JobState;
  step: number;
  agentId?: string;
  reviewerId?: string;
  reserved: number;
  spent: number;
  agreement?: number;
  finding?: string;
  recheck?: string;
  resultTable?: ResultRow[];
  recheckTable?: ResultRow[];
  draft?: string;
  observedAt?: string;
  publishedAt?: string;
  expiresAt?: string;
  provenWrongIf?: string;
  expired?: boolean;
  withdrawnNote?: string;
  history: HistoryLine[];
  manifest: Record<string, string>;
  isUserCreated?: boolean;
  /** Who asked: a person, or one of the swarm's own AI roles. */
  askedBy?: string;
  period?: string;
  /** True once the job's spend has been added to its members' daily totals. */
  charged?: boolean;
  /** True while the member's AI is checking in. */
  heartbeat?: boolean;
  /** Lease generation: goes up each time the job is (re)assigned. */
  generation?: number;
}

export interface AuditEntry {
  index: number;
  time: string;
  who: string;
  action: string;
  jobId?: string;
  prevHash: string;
  hash: string;
}

export type AuditDraft = Pick<AuditEntry, 'time' | 'who' | 'action' | 'jobId'>;
