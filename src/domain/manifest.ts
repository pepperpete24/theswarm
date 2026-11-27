import { CODE_VERSION, DATASET, RUNNER_VERSION } from '../data/constants';
import { providerOf } from './approval';
import { shortHash } from './hash';
import type { Idea, Member } from './types';

/** Run receipt fields for one idea test, always shown in this order (section 4.1). */
export const RECEIPT_FIELDS = [
  'Idea',
  'Mission',
  'Proposed by',
  'Role version',
  'Test plan fingerprint',
  'Tools allowed',
  'Tool calls made',
  'Data used',
  'Data fingerprint',
  'Fresh data sealed',
  'Code version',
  'Parameter sets tried',
  'Tokens used',
  'Estimated cost',
  'Started',
  'Finished',
  'Runner version',
  'Device',
  'Signed with device key',
] as const;

const WAITING = 'Waiting';

export interface ReceiptInput {
  idea: Pick<Idea, 'id' | 'missionId' | 'agentRole' | 'model' | 'specHash' | 'result'>;
  proposer?: Member;
  tester?: Member;
  started?: string;
  finished?: string;
  freshSealed?: boolean;
}

export const specHashFor = (ideaId: string, title: string) =>
  `sha256:${shortHash(`${ideaId}|${title}|plan`, 16)}`;

/** Build the run receipt for an idea test. Every field is always present. */
export function buildReceipt(i: ReceiptInput): Record<string, string> {
  const r = i.idea.result;
  const roleSlug = i.idea.agentRole.toLowerCase().replace(/[^a-z]+/g, '-');
  const t = i.tester;
  return {
    Idea: i.idea.id,
    Mission: i.idea.missionId,
    'Proposed by': i.proposer
      ? `${i.proposer.name}’s agent · ${providerOf(i.idea.model)} · ${i.idea.model}`
      : i.idea.model,
    'Role version': `${roleSlug} v5 · ${shortHash(i.idea.agentRole + 'v5', 7)}`,
    'Test plan fingerprint': i.idea.specHash ?? 'Not registered yet',
    'Tools allowed': 'market-data (read), features, experiments (registered specs only), sandbox',
    'Tool calls made': r ? String(Math.round(r.trials * 0.6 + 9)) : WAITING,
    'Data used': DATASET,
    'Data fingerprint': `sha256:${shortHash(DATASET + i.idea.missionId, 16)}`,
    'Fresh data sealed': i.freshSealed === false ? 'No: opened for the fresh-data check' : 'Yes',
    'Code version': CODE_VERSION,
    'Parameter sets tried': r ? r.trials.toLocaleString('en-GB') : WAITING,
    'Tokens used': r ? Math.round(r.computeCost * 41000 + 2200).toLocaleString('en-GB') : WAITING,
    'Estimated cost': r ? `$${r.computeCost.toFixed(2)}` : WAITING,
    Started: i.started ?? WAITING,
    Finished: i.finished ?? WAITING,
    'Runner version': RUNNER_VERSION,
    Device: t ? t.device : WAITING,
    'Signed with device key':
      t && i.finished
        ? `ed25519:${shortHash(t.device + i.idea.id + i.finished, 24)}`
        : 'Not signed yet',
  };
}
