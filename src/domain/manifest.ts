import { CODE_VERSION, DATASET, RUNNER_VERSION } from '../data/constants';
import { shortHash } from './hash';
import type { Member } from './types';

/** Run receipt fields, always shown in this order. */
export const MANIFEST_FIELDS = [
  'Job',
  'AI provider and model',
  'Role version',
  'Tools allowed',
  'Tool calls made',
  'Data used',
  'Data fingerprint',
  'Code version',
  'Tokens used',
  'Estimated cost',
  'Started',
  'Finished',
  'Runner version',
  'Device',
  'Signed with device key',
] as const;

const TOOLS_BY_ROLE: Record<string, string> = {
  'Stop-loss researcher': 'market-data (read), features, experiments, sandbox',
  'Market regime analyst': 'market-data (read), features, research-library',
  'Short-term analyst': 'market-data (read), features, research-library',
  'Data quality monitor': 'market-data (read), sandbox',
  'Experiment worker': 'experiments, sandbox, market-data (read)',
};

export function providerFor(model: string): string {
  return model.startsWith('Claude') ? `Anthropic · ${model}` : `OpenAI · ${model}`;
}

export interface ManifestInput {
  jobId: string;
  role: string;
  member?: Member;
  tokens?: number;
  cost?: number;
  started?: string;
  finished?: string;
  toolCalls?: number;
}

const WAITING = 'Waiting';

/** Build the run receipt for a job. Every field is always present. */
export function buildManifest(i: ManifestInput): Record<string, string> {
  const m = i.member;
  const roleSlug = i.role.toLowerCase().replace(/[^a-z]+/g, '-');
  return {
    Job: i.jobId,
    'AI provider and model': m ? providerFor(m.model) : 'Not assigned yet',
    'Role version': `${roleSlug} v1.3 · ${shortHash(i.role + 'v1.3', 7)}`,
    'Tools allowed': TOOLS_BY_ROLE[i.role] ?? 'market-data (read), research-library',
    'Tool calls made': i.toolCalls !== undefined ? String(i.toolCalls) : WAITING,
    'Data used': DATASET,
    'Data fingerprint': `sha256:${shortHash(DATASET + i.jobId, 16)}`,
    'Code version': CODE_VERSION,
    'Tokens used': i.tokens ? i.tokens.toLocaleString('en-GB') : WAITING,
    'Estimated cost': i.cost !== undefined ? `$${i.cost.toFixed(2)}` : WAITING,
    Started: i.started ?? WAITING,
    Finished: i.finished ?? WAITING,
    'Runner version': RUNNER_VERSION,
    Device: m ? m.device : WAITING,
    'Signed with device key': m
      ? `ed25519:${shortHash(m.device + i.jobId + (i.finished ?? ''), 24)}`
      : 'Not signed yet',
  };
}
