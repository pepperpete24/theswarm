import { AGREEMENT_BAR } from '../data/constants';

export type Verdict = 'agreed' | 'challenged' | 'running';

/** Agreed when the re-check is at least AGREEMENT_BAR % alike the first answer. */
export function verdict(agreement: number | undefined, bar = AGREEMENT_BAR): Verdict {
  if (agreement === undefined) return 'running';
  return agreement >= bar ? 'agreed' : 'challenged';
}

export function isAgreed(agreement: number | undefined, bar = AGREEMENT_BAR): boolean {
  return verdict(agreement, bar) === 'agreed';
}
