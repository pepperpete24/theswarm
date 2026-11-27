import type { AuditDraft } from '../domain/types';

/**
 * Seed audit trail for today. It tells the same story as the mission histories.
 * Entry 8 is the one the tamper demo changes.
 */
export const TAMPER_INDEX = 8;
export const TAMPER_FROM = 'rejected (look-ahead)';
export const TAMPER_TO = 'promising';

export const seedAudit: AuditDraft[] = [
  {
    time: '08:00:04',
    who: 'Platform',
    action: 'Daily budget opened: $120.00 for the swarm, $10.00 per member, $30.00 self-start',
  },
  {
    time: '08:58:02',
    who: 'Omar S.’s agent',
    action: 'Challenger: current best for Breakout stop-loss is over 30 days old; queued M-12',
    missionId: 'M-12',
  },
  {
    time: '09:01:15',
    who: 'Platform',
    action: 'Rules confirmed, $55.00 set aside',
    missionId: 'M-12',
  },
  {
    time: '09:15:02',
    who: 'Platform',
    action: '6 duplicates merged, 2 known dead ends not re-tested (L-014, L-018)',
    missionId: 'M-12',
  },
  {
    time: '09:41:10',
    who: 'Platform',
    action: '35 test plans registered before testing',
    missionId: 'M-12',
  },
  {
    time: '09:52:40',
    who: 'Platform',
    action: 'Lease expired on WS-HT-11, late result refused',
    missionId: 'M-12',
    ideaId: 'I-12-19',
  },
  { time: '09:53:05', who: 'You', action: 'Paused member Hana T.' },
  {
    time: '10:22:31',
    who: 'Dana M.’s agent',
    action: 'Verdict: I-12-14 rejected (look-ahead)',
    missionId: 'M-12',
    ideaId: 'I-12-14',
  },
  {
    time: '10:22:35',
    who: 'Ines P.’s agent',
    action: 'Verdict: I-12-07 rejected (overfitting)',
    missionId: 'M-12',
    ideaId: 'I-12-07',
  },
  {
    time: '10:22:47',
    who: 'Council',
    action: 'Round 1 verdicts: 6 promising, 6 need evidence, 23 rejected',
    missionId: 'M-12',
  },
  {
    time: '10:24:05',
    who: 'Gustavo R.’s agent',
    action: 'Proposed 3 alternatives, one a cheaper route to I-12-07',
    missionId: 'M-12',
  },
  {
    time: '10:58:31',
    who: 'Council',
    action: 'Shortlisted 3 for the fresh-data check: I-12-40, I-12-41, I-12-42',
    missionId: 'M-12',
  },
  {
    time: '11:02:00',
    who: 'Platform',
    action: 'Fresh data unsealed for 3 shortlisted ideas',
    missionId: 'M-12',
  },
  {
    time: '11:36:12',
    who: 'Platform',
    action: 'I-12-40 held up on fresh data',
    missionId: 'M-12',
    ideaId: 'I-12-40',
  },
  {
    time: '11:41:00',
    who: 'Swarm',
    action: 'Self-started M-13 from open question L-027',
    missionId: 'M-13',
  },
  {
    time: '11:52:40',
    who: 'Platform',
    action: 'I-12-41 held up on fresh data',
    missionId: 'M-12',
    ideaId: 'I-12-41',
  },
  { time: '12:10:22', who: 'Ines P.’s agent', action: 'Rule-change vote on PC-10: approve' },
  { time: '12:14:08', who: 'Lars E.’s agent', action: 'Promotion vote on PC-07: approve' },
  {
    time: '12:40:00',
    who: 'Omar S. (Challenger)',
    action: 'Mission started: “Is there a calmer time of day to enter breakout trades?”',
    missionId: 'M-11',
  },
  { time: '13:31:40', who: 'Council', action: 'Round 1 verdicts on M-11 given', missionId: 'M-11' },
  {
    time: '13:52:15',
    who: 'Platform',
    action: 'Fresh data unsealed for 3 shortlisted ideas',
    missionId: 'M-11',
  },
  {
    time: '14:01:30',
    who: 'Platform',
    action: 'Approval panel A-11 seated under rule v2: 5 approvers, 2 providers',
    missionId: 'M-11',
  },
  {
    time: '14:02:00',
    who: 'Chen W.',
    action: 'Mission started: “Can we spot a volatile week before it starts?”',
    missionId: 'M-10',
  },
  {
    time: '14:04:44',
    who: 'Platform',
    action: 'Library check on M-10 found 2 related entries',
    missionId: 'M-10',
  },
  {
    time: '14:12:00',
    who: 'Platform',
    action: 'Data health check: no gaps in the last 24 hours of quotes',
  },
];
