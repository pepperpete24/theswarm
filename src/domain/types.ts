/* Domain model for the council swarm (BUILD-BRIEF.md section 4). Pure data, no React. */

export type MissionPhase =
  | 'queued' // self-started, waiting for the self-start budget
  | 'brief'
  | 'library'
  | 'explore'
  | 'test'
  | 'council'
  | 'alternatives'
  | 'fresh'
  | 'approval'
  | 'published'
  | 'learned'
  | 'withdrawn'
  | 'not-published'
  | 'closed-no-winner'
  | 'stopped';

export type SwarmSize = 'small' | 'large' | 'whole';

export interface MissionRules {
  budget: number;
  swarmSize: SwarmSize;
  maxRounds: number;
  maxDepth: number;
  maxIdeas: number;
  maxConcurrent: number;
  baseline: string;
  differentRouteShare: number;
  costs: string;
  testWindow: string;
  freshWindow: string;
  horizon: string;
}

export interface HistoryLine {
  time: string;
  text: string;
  who: string;
}

export type MissionKind = 'open' | 'challenge' | 'different-route' | 'descriptive';

export interface Mission {
  id: string;
  title: string;
  goal: string;
  createdBy: string;
  kind: MissionKind;
  topicId?: string;
  challengesBest?: string;
  coachReview?: CoachReview;
  spawnedFromLibraryId?: string;
  approvalId?: string;
  approvalRuleVersion?: number;
  /** Cooling-off: a mission is approved under the rule active when it started. */
  startRuleVersion?: number;
  /** Why a queued mission is waiting. */
  waitingFor?: string;
  phase: MissionPhase;
  round: number;
  rules: MissionRules;
  reserved: number;
  spent: number;
  ideaIds: string[];
  councilIds: string[];
  libraryHits: string[];
  trialsRun: number;
  winnerIdeaIds: string[];
  draft?: string;
  observedAt?: string;
  publishedAt?: string;
  expiresAt?: string;
  provenWrongIf?: string;
  withdrawnNote?: string;
  expired?: boolean;
  history: HistoryLine[];
  isUserCreated?: boolean;
  /** Spend split by phase, for the Spend tab and Budgets. */
  spendByPhase: Record<SpendPhase, number>;
}

export type SpendPhase = 'explore' | 'test' | 'council' | 'fresh' | 'approval';

export type IdeaState =
  | 'proposed'
  | 'merged'
  | 'known-dead-end'
  | 'queued'
  | 'testing'
  | 'tested'
  | 'promising'
  | 'needs-evidence'
  | 'rejected'
  | 'fresh-check'
  | 'held-up'
  | 'failed-fresh'
  | 'cancelled';

export type IdeaFamily =
  | 'volatility'
  | 'time'
  | 'structure'
  | 'trailing'
  | 'session'
  | 'model'
  | 'combined'
  | 'target';

export interface IdeaResult {
  netReturnDelta: number;
  drawdownDelta: number;
  longestLosingStreak: number;
  trades: number;
  trials: number;
  computeCost: number;
}

export interface Idea {
  id: string;
  missionId: string;
  /** Near-identical ideas share a key; used for merging and dead-end matching. */
  key: string;
  title: string;
  summary: string;
  family: IdeaFamily;
  proposedBy: string;
  agentRole: string;
  model: string;
  round: number;
  depth: number;
  parentIds: string[];
  route: 'refine' | 'different-route';
  mergedInto?: string;
  deadEndFrom?: string;
  state: IdeaState;
  specHash?: string;
  registeredAt?: string;
  result?: IdeaResult;
  freshResult?: IdeaResult;
  freshCheckedBy?: string;
  objections: Objection[];
  verdictReason?: string;
  receipt: Record<string, string>;
}

export type ObjectionKind =
  | 'look-ahead'
  | 'overfitting'
  | 'too-few-trades'
  | 'costs-ignored'
  | 'one-period-only'
  | 'duplicate'
  | 'too-complex-for-gain';

export interface Objection {
  id: string;
  ideaId: string;
  by: string;
  kind: ObjectionKind;
  text: string;
  status: 'open' | 'answered' | 'upheld';
  answer?: string;
  answeredBy?: string;
}

export type Seat = 'chair' | 'advocate' | 'red-team' | 'synthesiser' | 'specialist';

export interface Synthesis {
  fromIdeaIds: string[];
  newIdeaId: string;
  why: string;
  kind: 'combination' | 'cheaper-route' | 'follow-up';
}

export type Verdict = 'promising' | 'needs-evidence' | 'rejected';

export interface CouncilSession {
  id: string;
  missionId: string;
  round: number;
  panel: { memberId: string; seat: Seat }[];
  objections: string[];
  syntheses: Synthesis[];
  verdicts: { ideaId: string; verdict: Verdict; reason: string }[];
  summary: string;
}

export type LibraryKind = 'proven' | 'dead-end' | 'warning' | 'method' | 'open-question';

export interface LibraryEntry {
  id: string;
  kind: LibraryKind;
  title: string;
  text: string;
  fromMissionId: string;
  fromIdeaId?: string;
  reusedCount: number;
  savedUsd: number;
  addedAt: string;
  /** Idea keys this entry rules out (dead ends) or answers (proven). */
  matchKeys?: string[];
}

export interface RoleVersion {
  role: string;
  version: number;
  status: 'active' | 'candidate' | 'retired';
  change: string;
  learnedFrom: string[];
  evaluation?: { missions: number; caught: number; falseAlarms: number; costDelta: string };
}

export interface Member {
  id: string;
  name: string;
  device: string;
  model: string;
  roles: string[];
  hours: string;
  online: boolean;
  spentToday: number;
  dailyCap: number;
  ideasProposed: number;
  passedCouncil: number;
  heldUpFresh: number;
  objectionsUpheld: number;
  calibration: number;
  /** A standing role this member's agent runs, if any. */
  standing?: 'Challenger' | 'Pathfinder' | 'Coach';
}

export interface BestEntry {
  rule: string;
  missionId?: string;
  ideaId?: string;
  since: string;
  /** ISO date, used for the 30-day challenge trigger and the chart. */
  sinceDate: string;
  until?: string;
  netReturnVsStart: number;
  status: 'current' | 'retired' | 'withdrawn';
  why: string;
}

export interface Topic {
  id: string;
  title: string;
  startingRule: string;
  history: BestEntry[];
  totalTrials: number;
  challenges: number;
  beaten: number;
  openChallengeMissionId?: string;
  lastFreshWindow: string;
  /** The next fresh window, if one exists yet. */
  nextFreshWindow?: string;
  /** Words that tie a goal to this topic. */
  keywords: string[];
}

export interface CoachReview {
  missionId: string;
  heldUpBy: string[];
  objectionsRight: number;
  falseAlarms: number;
  wastedUsd: number;
  sizeVerdict: 'too small' | 'about right' | 'too big';
  differentRouteResult: string;
  proposals: string[];
  sessions: number;
}

export interface ApprovalRule {
  version: number;
  panelSize: number;
  approvalsNeeded: number;
  minProviders: number;
  maxProviderShare: number;
  extraChecks: string[];
  scopes?: {
    scope: string;
    panelSize: number;
    approvalsNeeded: number;
    skipsExtraChecks?: boolean;
  }[];
  status: 'active' | 'retired' | 'proposed';
  adoptedAt?: string;
  fromChange?: string;
}

export type ProcessChangeKind =
  | 'role-version'
  | 'model-choice'
  | 'swarm-size'
  | 'defaults'
  | 'queue'
  | 'approval-rule';

export interface ReplayResult {
  heldUp: [number, number];
  falseWins: [number, number];
  costUsd: [number, number];
}

export interface ProcessChange {
  id: string;
  change: string;
  why: string;
  kind: ProcessChangeKind;
  ruleChange?: Partial<Omit<ApprovalRule, 'status' | 'version'>>;
  /** True if this change would alter one of the locked rules in section 2.1. */
  touchesFixedRule?: boolean;
  learnedFrom: string[];
  replayedOn: string[];
  replayTarget?: number;
  replay?: ReplayResult;
  status: 'replaying' | 'in-approval' | 'adopted' | 'rejected' | 'refused' | 'rolled-back';
  outcome?: string;
  panelId?: string;
  reviewAfterMissions?: number;
}

export type PanelPurpose = 'publish' | 'promotion' | 'rule-change';

export interface Approver {
  memberId: string;
  provider: string;
  vote?: 'approve' | 'reject';
  reason?: string;
  citesRule?: number;
}

export interface ApprovalPanel {
  id: string;
  purpose: PanelPurpose;
  /** Mission id for publish panels, process change id otherwise. */
  subjectId: string;
  ideaIds: string[];
  ruleVersion: number;
  approvers: Approver[];
  needed: number;
  outcome?: 'published' | 'sent-back' | 'not-published' | 'adopted' | 'rejected';
  decidedAt?: string;
}

export interface AuditEntry {
  index: number;
  time: string;
  who: string;
  action: string;
  missionId?: string;
  ideaId?: string;
  prevHash: string;
  hash: string;
}

export type AuditDraft = Pick<AuditEntry, 'time' | 'who' | 'action' | 'missionId' | 'ideaId'>;
