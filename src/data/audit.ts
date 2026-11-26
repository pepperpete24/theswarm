import type { AuditDraft } from '../domain/types';

/**
 * Seed audit trail for today. It tells the same story as the job histories.
 * Entry 8 is the one the tamper demo changes ("agree (96%)" to "agree (99%)").
 */
export const seedAudit: AuditDraft[] = [
  {
    time: '08:00:04',
    who: 'Platform',
    action: 'Daily budget opened: $25.00 for the swarm, $5.00 per member',
  },
  {
    time: '09:02:11',
    who: 'Platform',
    action: '$1.20 set aside, 60 s lease to WS-HT-11',
    jobId: 'J-1038',
  },
  {
    time: '09:06:30',
    who: 'Platform',
    action: 'Lease expired on WS-HT-11 (job J-1038), late result refused',
    jobId: 'J-1038',
  },
  { time: '09:07:02', who: 'You', action: 'Paused member Hana T.' },
  {
    time: '10:41:18',
    who: 'Platform',
    action: '$1.80 set aside, 60 s lease to DESK-7F2A',
    jobId: 'J-1043',
  },
  {
    time: '11:20:45',
    who: 'Aroha K.’s AI',
    action: 'Handed in finding with signed run receipt',
    jobId: 'J-1043',
  },
  { time: '11:20:46', who: 'Platform', action: 'Receipt valid, lease current', jobId: 'J-1043' },
  {
    time: '11:52:09',
    who: 'Dana M.’s AI',
    action: 'Re-check result: agree (96%)',
    jobId: 'J-1043',
  },
  {
    time: '11:53:30',
    who: 'Editor AI',
    action: 'Draft written, waiting for a person',
    jobId: 'J-1043',
  },
  {
    time: '12:05:12',
    who: 'Dana M.’s AI',
    action: 'Re-check result: agree (92%)',
    jobId: 'J-1042',
  },
  {
    time: '12:06:40',
    who: 'Editor AI',
    action: 'Draft written, waiting for a person',
    jobId: 'J-1042',
  },
  {
    time: '12:30:01',
    who: 'Platform',
    action: '$0.40 set aside, 60 s lease to PC-EO-03',
    jobId: 'J-1044',
  },
  { time: '12:58:21', who: 'You', action: 'Paused member Freya L.' },
  {
    time: '13:10:03',
    who: 'Gustavo R.’s AI',
    action: 'Handed in finding with signed run receipt',
    jobId: 'J-1045',
  },
  {
    time: '13:11:47',
    who: 'Platform',
    action: 'Re-check task given to Dana M.’s AI',
    jobId: 'J-1045',
  },
  {
    time: '13:34:55',
    who: 'Dana M.’s AI',
    action: 'Re-check result: challenge (71%), hinged on two days in March',
    jobId: 'J-1046',
  },
  {
    time: '13:35:02',
    who: 'Platform',
    action: 'Sent back for another try, 60 s lease to WS-90B1',
    jobId: 'J-1046',
  },
];

export const TAMPER_INDEX = 8;
export const TAMPER_FROM = 'agree (96%)';
export const TAMPER_TO = 'agree (99%)';
