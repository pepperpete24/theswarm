import type { Idea, LibraryEntry } from './types';

/**
 * Merge near-duplicate ideas (same key). The first proposer keeps the idea;
 * later ones are merged into it and credited. Returns duplicate id -> kept id.
 */
export function mergeDuplicates(ideas: Idea[]): Map<string, string> {
  const firstByKey = new Map<string, string>();
  const merged = new Map<string, string>();
  for (const i of ideas) {
    if (i.state === 'merged' || i.state === 'known-dead-end') continue;
    const kept = firstByKey.get(i.key);
    if (kept) merged.set(i.id, kept);
    else firstByKey.set(i.key, i.id);
  }
  return merged;
}

/** Ideas that match a library dead end. Returns idea id -> library entry. */
export function matchDeadEnds(ideas: Idea[], library: LibraryEntry[]): Map<string, LibraryEntry> {
  const out = new Map<string, LibraryEntry>();
  for (const i of ideas) {
    const e = library.find((l) => l.kind === 'dead-end' && l.matchKeys?.includes(i.key));
    if (e) out.set(i.id, e);
  }
  return out;
}
