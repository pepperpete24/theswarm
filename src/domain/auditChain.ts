import { sha256Hex } from './hash';
import type { AuditDraft, AuditEntry } from './types';

export const GENESIS = '0'.repeat(64);

/** hash = SHA-256(prevHash + time + who + action + jobId) */
export function hashInput(prevHash: string, e: AuditDraft): string {
  return prevHash + e.time + e.who + e.action + (e.jobId ?? '');
}

export async function computeHash(prevHash: string, e: AuditDraft): Promise<string> {
  return sha256Hex(hashInput(prevHash, e));
}

/** Make the next entry for a chain. Does not change the chain. */
export async function appendEntry(chain: AuditEntry[], d: AuditDraft): Promise<AuditEntry> {
  const prev = chain[chain.length - 1];
  const prevHash = prev ? prev.hash : GENESIS;
  return {
    index: prev ? prev.index + 1 : 1,
    ...d,
    prevHash,
    hash: await computeHash(prevHash, d),
  };
}

/** Build a full chain from drafts, numbered from 1. */
export async function buildChain(drafts: AuditDraft[]): Promise<AuditEntry[]> {
  const out: AuditEntry[] = [];
  for (const d of drafts) out.push(await appendEntry(out, d));
  return out;
}

export type ChainCheck =
  | { ok: true; count: number }
  | { ok: false; count: number; brokenAt: number };

/**
 * Walk the chain from the start, recomputing every fingerprint.
 * An entry is good only if it points at the recomputed fingerprint of the entry before it
 * and its own stored fingerprint matches. Once one breaks, every later entry breaks too.
 */
export async function verifyChain(chain: AuditEntry[]): Promise<ChainCheck> {
  let expectedPrev = GENESIS;
  for (const e of chain) {
    const recomputed = await computeHash(e.prevHash, e);
    if (e.prevHash !== expectedPrev || recomputed !== e.hash) {
      return { ok: false, count: chain.length, brokenAt: e.index };
    }
    expectedPrev = recomputed;
  }
  return { ok: true, count: chain.length };
}

export interface Tamper {
  index: number;
  original: string;
  changed: string;
}

/** Change an old entry's words WITHOUT recomputing its fingerprint, the way a quiet edit would. */
export function tamperEntry(
  chain: AuditEntry[],
  index: number,
  from: string,
  to: string,
): { chain: AuditEntry[]; tamper: Tamper } | null {
  const target = chain.find((e) => e.index === index);
  if (!target || !target.action.includes(from)) return null;
  const changed = target.action.replace(from, to);
  return {
    chain: chain.map((e) => (e.index === index ? { ...e, action: changed } : e)),
    tamper: { index, original: target.action, changed },
  };
}

/** Put the original words back. */
export function repairEntry(chain: AuditEntry[], tamper: Tamper): AuditEntry[] {
  return chain.map((e) => (e.index === tamper.index ? { ...e, action: tamper.original } : e));
}
